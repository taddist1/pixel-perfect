import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { AI_VIDEO_SCENE_SECONDS, sceneCount, splitNarration } from "./ai-video-rules";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const VIDEO_MODEL = "google/gemini-omni-1.1-flash";

export type Scene = {
  prompt: string;
  narration: string;
  job_id: string | null;
  path: string | null;
  status: "pending" | "running" | "done" | "failed";
};

function key() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مُعدّ.");
  return apiKey;
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
- Scenes follow a logical teaching order; no invented prices or statistics.`;

export async function writeScript(topic: string, category: string, duration: number) {
  const apiKey = key();
  const provider = createOpenAI({ baseURL: GATEWAY, apiKey, headers: { "Lovable-API-Key": apiKey } });
  const n = sceneCount(duration);
  let text: string;
  try {
    ({ text } = await generateText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      prompt: `Category: ${category}\nTopic: ${topic}\nWrite exactly ${n} scenes.`,
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
    }));
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

async function gateway(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res;
}

export async function startClip(prompt: string): Promise<string> {
  const res = await gateway("/videos", {
    method: "POST",
    body: JSON.stringify({
      model: VIDEO_MODEL,
      input: prompt,
      response_format: { type: "video", resolution: "720p", duration: `${AI_VIDEO_SCENE_SECONDS}s`, aspect_ratio: "16:9" },
    }),
  });
  const body = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!res.ok || !body?.id) throw friendly(res.status, body?.message);
  return body.id;
}

export async function pollClip(id: string) {
  const res = await gateway(`/videos/${encodeURIComponent(id)}`);
  const body = (await res.json().catch(() => null)) as { status?: string; error?: { message?: string }; message?: string } | null;
  if (!res.ok) {
    if (res.status === 429 || res.status >= 500) return { status: "in_progress" as const };
    throw friendly(res.status, body?.message);
  }
  return { status: (body?.status ?? "in_progress") as string, error: body?.error?.message };
}

export async function downloadClip(id: string): Promise<ArrayBuffer> {
  const res = await fetch(`${GATEWAY}/videos/${encodeURIComponent(id)}/content`, { headers: { Authorization: `Bearer ${key()}` } });
  if (!res.ok) throw new Error("ما قدرناش نحمّلو المقطع.");
  return res.arrayBuffer();
}
