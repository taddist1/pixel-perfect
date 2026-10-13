import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee } from "lucide-react";

const T = "سياسة الخصوصية — قهوتي";
const D = "كيف نجمع ونستخدم ونحمي بياناتك الشخصية في منصة قهوتي، وفقاً للقانون المغربي 09-08 لحماية المعطيات ذات الطابع الشخصي.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: T },
      { name: "description", content: D },
      { property: "og:title", content: T },
      { property: "og:description", content: D },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const h2 = "mt-8 text-xl font-black text-primary";
const p = "mt-3 leading-8 text-foreground/90";
const li = "mt-2 list-disc leading-7";

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-18 max-w-4xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="قهوتي — الرئيسية">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-xl font-black text-primary-foreground">ق</span>
            <span translate="no" className="notranslate text-2xl font-black text-foreground">قهوتي<span className="text-accent">.</span></span>
          </Link>
          <Link to="/" className="text-sm font-bold hover:text-primary">رجوع للرئيسية</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
        <h1 className="text-3xl font-black text-primary">سياسة الخصوصية — منصة <span translate="no" className="notranslate">قهوتي</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">
          نطاق المنصة: <span dir="ltr" translate="no" className="notranslate">kahwaty.online</span> — آخر تحديث: أكتوبر 2026
        </p>

        <p className={p}>
          مرحباً بكم في منصة <span translate="no" className="notranslate">"قهوتي"</span>. نحن نلتزم بحماية خصوصيتكم وبياناتكم الشخصية. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتكم عند استخدامكم لموقعنا الإلكتروني <span dir="ltr" translate="no" className="notranslate">www.kahwaty.online</span>.
        </p>

        <h2 className={h2}>1. المعلومات التي نجمعها</h2>
        <p className={p}>عند التسجيل أو التفاعل مع المنصة، قد نطلب منك تقديم معلومات معينة مثل:</p>
        <ul className="mt-3 pr-5 text-foreground/90">
          <li className={li}>الاسم الكامل.</li>
          <li className={li}>رقم الهاتف (لأغراض التواصل المباشر عبر واتساب).</li>
          <li className={li}>المدينة أو المنطقة الجغرافية.</li>
          <li className={li}>المهنة أو المهارات (مثل: بارستا، تقني آلات قهوة، نادل، موزع قهوة).</li>
          <li className={li}>السيرة الذاتية أو نبذة عن الخبرة المهنية.</li>
        </ul>

        <h2 className={h2}>2. كيف نستخدم معلوماتك</h2>
        <p className={p}>نستخدم البيانات التي نجمعها للأغراض التالية فقط:</p>
        <ul className="mt-3 pr-5 text-foreground/90">
          <li className={li}>تمكين أصحاب المقاهي والمطاعم من التواصل مع الكفاءات المهنية.</li>
          <li className={li}>تسهيل البحث عن فرص عمل أو مرشحين مناسبين حسب المدينة والتخصص.</li>
          <li className={li}>تحسين تجربة المستخدم وتطوير خدمات المنصة.</li>
          <li className={li}>إرسال إشعارات متعلقة بالخدمات (في حال موافقتك على ذلك).</li>
        </ul>

        <h2 className={h2}>3. مشاركة المعلومات</h2>
        <p className={p}>
          نحن لا نبيع أو نؤجر بياناتك الشخصية لأطراف ثالثة. تتم مشاركة معلومات الاتصال (مثل رقم الهاتف) فقط مع أصحاب العمل أو الكفاءات الذين تتفاعل معهم مباشرة عبر المنصة بغرض التوظيف.
        </p>

        <h2 className={h2}>4. حقوقك كمستخدم</h2>
        <p className={p}>
          بموجب القانون المغربي رقم 09-08 المتعلق بحماية المعطيات ذات الطابع الشخصي، يحق لك:
        </p>
        <ul className="mt-3 pr-5 text-foreground/90">
          <li className={li}>الوصول إلى البيانات الشخصية التي نحتفظ بها عنك.</li>
          <li className={li}>طلب تصحيح أو تحديث بياناتك.</li>
          <li className={li}>طلب حذف حسابك وبياناتك نهائياً من المنصة في أي وقت.</li>
        </ul>

        <h2 className={h2}>5. ملفات تعريف الارتباط (Cookies)</h2>
        <p className={p}>
          يستخدم موقعنا ملفات تعريف الارتباط (بما في ذلك أدوات مثل Google Analytics) لتحليل حركة المرور على الموقع وتحسين أدائه. يمكنك تعطيل ملفات تعريف الارتباط من خلال إعدادات متصفحك، لكن هذا قد يؤثر على بعض وظائف الموقع.
        </p>

        <h2 className={h2}>6. التواصل معنا</h2>
        <p className={p}>
          إذا كان لديك أي استفسار حول سياسة الخصوصية هذه، أو إذا كنت ترغب في ممارسة حقوقك المذكورة أعلاه، يرجى التواصل معنا عبر:
        </p>
        <p className={p}>
          البريد الإلكتروني:{" "}
          <a href="mailto:dar.elkahwat@gmail.com?subject=%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%AD%D9%88%D9%84%20%D8%A7%D9%84%D8%AE%D8%B5%D9%88%D8%B5%D9%8A%D8%A9" className="font-bold text-primary underline">
            <span dir="ltr" translate="no" className="notranslate">dar.elkahwat@gmail.com</span>
          </a>
        </p>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
          <Coffee className="mx-auto size-8 text-accent" aria-hidden="true" />
          <p className="mt-3 font-bold">
            <span translate="no" className="notranslate">قهوتي</span> — منصة أهل المقاهي والمطاعم في المغرب.
          </p>
          <Link to="/" className="mt-3 inline-block font-black text-primary underline">العودة إلى الرئيسية</Link>
        </div>
      </main>
    </div>
  );
}
