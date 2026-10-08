// فلتر الإساءة بالعربية والدارجة: توحيد الهمزات، حذف التشكيل، ضغط الحروف المكررة
const banned = ["زامل", "قحب", "حمار", "كلب", "خرا", "نصاب", "شفار", "مسخوط", "حيوان", "تفو", "زبي", "nik", "fuck", "pute", "salope", "connard"];

export function normalizeArabic(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/(.)\1+/g, "$1")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function isAbusive(text: string) {
  const n = normalizeArabic(text).replace(/\s+/g, "");
  return banned.some((w) => n.includes(normalizeArabic(w)));
}
