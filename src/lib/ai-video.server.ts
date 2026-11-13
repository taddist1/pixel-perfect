import { downloadVideo, generateResponse, generateVideo, getVideo, GatewayError } from "@lovable.dev/ai-gateway";
import { AI_VIDEO_SCENE_SECONDS, sceneCount, splitNarration } from "./ai-video-rules";
import { CONTINUITY, continuousClipRequest, type ReferenceImage } from "./ai-video-continuity";

export type Scene = {
  prompt: string;
  narration: string;
  job_id: string | null;
  path: string | null;
  status: "pending" | "running" | "done" | "failed";
  reference_image?: ReferenceImage;
};

async function scriptText(system: string, input: string) {
  const response = await generateResponse({
    model: "openai/gpt-6-astra", instructions: system, input,
    reasoning: { effort: "low" },
  });
  return response.output.flatMap((item) => item.type === "message"
    ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : []) : []).join("");
}

function friendly(status: number, message?: string): Error {
  if (status === 429) return new Error("كاين ضغط كبير دابا، عاود من بعد شوية.");
  if (status === 402) return new Error("رصيد الذكاء الاصطناعي سالا. زيد الرصيد من Settings → Plans & credits.");
  if (status === 403) return new Error(message || "الوصول للذكاء الاصطناعي مرفوض حالياً.");
  return new Error(message || "وقع خطأ فتوليد الفيديو.");
}

const SYSTEM = `You write short educational video scripts for "Qahwati", a Moroccan platform for cafe and restaurant workers.
Allowed topics ONLY: coffee, espresso machine maintenance, barista skills, waiter/table service. If the topic is outside these, return {"off_topic":true}.
Return JSON only: {"title":"Arabic title","description":"short Arabic description","scenes":[{"prompt":"...","narration":"..."}]}
Rules for each scene (each scene is one ${AI_VIDEO_SCENE_SECONDS}-second realistic clip):
- "narration": one short sentence in Moroccan Darija written in Arabic letters (max ~20 words), teaching one concrete step.
- "prompt": English, realistic cinematic description of a Moroccan cafe setting showing exactly that step: subject, action, camera move, lighting. Keep the same presenter (a Moroccan barista/technician/waiter in a dark green apron) across scenes. Include the spoken line verbatim like: The presenter says in Moroccan Darija: "<narration>". Audio: his voice close, soft cafe ambience. No music. No captions, no on-screen text. Single continuous shot, no scene cuts.
- Scenes follow a logical teaching order; no invented prices or statistics.
- Every scene starts with the pose and object positions at the end of the preceding scene. No new establishing shots or presenter introductions. Keep one steady camera and continuous actions.
${CONTINUITY}`;

export async function writeScript(topic: string, category: string, duration: number) {
  const n = sceneCount(duration);
  let text: string;
  try {
    text = await scriptText(SYSTEM, `Category: ${category}\nTopic: ${topic}\nWrite exactly ${n} scenes.`);
  } catch (e) {
    throw friendly((e as { statusCode?: number })?.statusCode ?? 500);
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("ما قدرناش نكتبو السيناريو، عاود المحاولة.");
  const d = JSON.parse(match[0]) as { off_topic?: boolean; title?: string; description?: string; scenes?: { prompt: string; narration: string }[] };
  if (d.off_topic) throw new Error("هاد الموضوع خارج مواضيع المنصة (القهوة، الصيانة، الباريستا، النادل).");
  const scenes = (d.scenes ?? []).filter((s) => s?.prompt).slice(0, n);
  if (!d.title || scenes.length === 0) throw new Error("السيناريو ناقص، عاود المحاولة.");
  return {
    title: d.title.slice(0, 140),
    description: (d.description ?? "").slice(0, 500),
    scenes: scenes.map<Scene>((s) => ({ prompt: s.prompt, narration: s.narration ?? "", job_id: null, path: null, status: "pending" })),
  };
}

const MANUAL_SYSTEM = `You turn a manually written Moroccan Darija narration into visual prompts for short realistic video clips for "Qahwati", a Moroccan platform for cafe and restaurant workers.
Return JSON only: {"title":"Arabic title","description":"short Arabic description","prompts":["..."]} with exactly one prompt per given narration part, in the same order.
Rules for each prompt (each part is one ${AI_VIDEO_SCENE_SECONDS}-second realistic clip):
- English, realistic cinematic description of a Moroccan cafe setting showing the action the narration teaches: subject, action, camera move, lighting. Keep the same presenter (a Moroccan barista/technician/waiter in a dark green apron) across prompts.
- If the part has text, include it verbatim like: The presenter says in Moroccan Darija: "<part>". Audio: his voice close, soft cafe ambience. If the part is empty, continue the previous action without speech.
- No music. No captions, no on-screen text. Single continuous shot, no scene cuts.
- Link every action to the ending pose of the previous part. Do not change camera position or reintroduce the presenter.
${CONTINUITY}`;

/** Builds scenes from a narration the admin wrote by hand, distributed across the clips. */
export async function scriptFromManual(topic: string, category: string, duration: number, narration: string) {
  const n = sceneCount(duration);
  const parts = splitNarration(narration, n);
  const fallbackPrompt = (part: string) =>
    `Realistic cinematic shot in a Moroccan cafe about: ${topic}. A Moroccan presenter in a dark green apron demonstrates the step.` +
    (part ? ` The presenter says in Moroccan Darija: "${part}". Audio: his voice close, soft cafe ambience.` : "") +
    " No music. No captions, no on-screen text. Single continuous shot.";
  let title = topic.slice(0, 140);
  let description = "";
  let prompts: string[] = [];
  try {
    const text = await scriptText(MANUAL_SYSTEM, `Category: ${category}\nTopic: ${topic}\nNarration parts (JSON): ${JSON.stringify(parts)}`);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const d = JSON.parse(match[0]) as { title?: string; description?: string; prompts?: string[] };
      if (d.title) title = d.title.slice(0, 140);
      description = (d.description ?? "").slice(0, 500);
      prompts = (d.prompts ?? []).filter((p) => typeof p === "string" && p.trim());
    }
  } catch {
    // Keep the manual narration usable even if prompt writing fails.
  }
  return {
    title,
    description,
    scenes: parts.map<Scene>((part, i) => ({
      prompt: prompts[i]?.trim() || fallbackPrompt(part),
      narration: part,
      job_id: null,
      path: null,
      status: "pending",
    })),
  };
}

export async function startClip(prompt: string, previousVideo?: string, referenceImage?: ReferenceImage): Promise<string> {
  try {
    const body = await generateVideo(continuousClipRequest(prompt, previousVideo, referenceImage));
    if (!body.id) throw new Error("المولّد لم يرجع رقم المقطع؛ لا تعاود التوليد قبل التحقق من الطلب.");
    return body.id;
  } catch (error) {
    if (error instanceof GatewayError) {
      if (error.outcome === "unknown") throw new Error("قد يكون التوليد بدأ؛ تحقق من الطلب قبل إعادة المحاولة لتفادي تكلفة مكررة.");
      throw friendly(error.httpStatus ?? 500);
    }
    throw error;
  }
}

export async function pollClip(id: string) {
  const body = await getVideo(id);
  if (!body || typeof body !== "object" || !("status" in body) || typeof body.status !== "string") throw new Error("ما قدرناش نتحققو من حالة المقطع.");
  const error = "error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string" ? body.error.message : undefined;
  return { status: body.status, error };
}

export async function downloadClip(id: string): Promise<ArrayBuffer> {
  return (await (await downloadVideo(id)).blob()).arrayBuffer();
}
