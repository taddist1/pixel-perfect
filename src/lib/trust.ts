// مؤشر الثقة: إكمال الملف 20% + الخدمات المكتملة 30% + التقييم 30% + سرعة الرد 20%
export type TrustInput = {
  profile: { full_name?: string | null; city?: string | null; phone?: string | null; avatar_url?: string | null; profession?: string | null; experience_years?: number | null; skills?: string[] | null };
  ratingAvg?: number | null;
  stats?: { total: number; answered: number; accepted: number } | null;
};

export function trustScore({ profile: p, ratingAvg, stats }: TrustInput) {
  const checks = [p.full_name, p.city, p.phone, p.avatar_url, p.profession, p.experience_years != null, (p.skills ?? []).length > 0];
  const completion = checks.filter(Boolean).length / checks.length;
  const services = Math.min(stats?.accepted ?? 0, 5) / 5;
  const rating = ratingAvg ? ratingAvg / 5 : 0;
  const response = stats && stats.total > 0 ? stats.answered / stats.total : 0;
  const score = Math.round(completion * 20 + services * 30 + rating * 30 + response * 20);
  return { score, ...trustBadge(score) };
}

export function trustBadge(score: number) {
  if (score >= 80) return { icon: "🏆", label: "موثوق" };
  if (score >= 60) return { icon: "🥈", label: "جيد" };
  if (score >= 35) return { icon: "🥉", label: "ناشئ" };
  return { icon: "🌱", label: "جديد" };
}

export const criteria = [
  ["quality", "جودة العمل"],
  ["commitment", "الالتزام"],
  ["communication", "التواصل"],
  ["professionalism", "الاحترافية"],
] as const;
export type CriterionKey = (typeof criteria)[number][0];
