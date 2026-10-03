import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export type ArticleDraft = { title: string; seo_title: string; seo_description: string; content: string };

const SYSTEM = `أنت كاتب محتوى لمنصة "قهوتي" المغربية لتوظيف وخدمات المقاهي والمطاعم.
اكتب مقالاً أصلياً ومفيداً بالدارجة المغربية مكتوبة بالحروف العربية، بأسلوب بسيط وعملي.
- المقال بين 500 و800 كلمة، بعناوين فرعية تبدأ بـ "## " وفقرات قصيرة.
- في الأخير جملة تدعو القارئ لاستعمال صفحة الوظائف أو الكفاءات في قهوتي.
- لا تخترع أرقاماً أو أثمنة دقيقة غير مؤكدة.
- seo_title: أقل من 60 حرفاً. seo_description: بين 120 و155 حرفاً.
أرجع JSON فقط بدون أي نص آخر وبهذا الشكل:
{"title":"...","seo_title":"...","seo_description":"...","content":"..."}`;

export async function generateArticleDraft(topic: string, signal?: AbortSignal): Promise<ArticleDraft> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير مُعدّ.");
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    system: SYSTEM,
    prompt: `موضوع المقال: ${topic}`,
    ...(signal ? { abortSignal: signal } : {}),
    onError: ({ error }) => { streamError = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (streamError) throw toFriendly(streamError);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("النموذج ما رجّعش مسودة صالحة، عاود المحاولة.");
  const d = JSON.parse(match[0]) as Partial<ArticleDraft>;
  if (!d.title || !d.content) throw new Error("المسودة ناقصة، عاود المحاولة.");
  return {
    title: d.title,
    seo_title: (d.seo_title ?? d.title).slice(0, 70),
    seo_description: (d.seo_description ?? "").slice(0, 160),
    content: d.content,
  };
}

function toFriendly(error: unknown): Error {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 429) return new Error("كاين ضغط كبير دابا، عاود من بعد شوية.");
  if (status === 402) return new Error("رصيد الذكاء الاصطناعي سالا. زيد الرصيد من Settings → Plans & credits.");
  if (status === 403) return new Error("الوصول للذكاء الاصطناعي مرفوض حالياً لهاد الحساب.");
  return new Error("وقع خطأ فتوليد المقال.");
}
