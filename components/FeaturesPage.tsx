
import React from 'react';
import { 
  ArrowRight, FileSpreadsheet, Calculator, ShieldAlert, Trello, 
  BarChart3, Layout, Sliders, FileText, CheckCircle2, 
  BrainCircuit, Users, Gavel, FileDown, Database, 
  ArrowLeft
} from 'lucide-react';
import { Button } from './Button';

interface FeaturesPageProps {
  onBack: () => void;
}

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  definition: string;
  howItWorks: string;
  visualization: string;
  logic: string;
  role: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: FileSpreadsheet,
    title: "1. نظام الاستيراد الذكي (Smart Data Import)",
    definition: "وحدة مسؤولة عن قراءة ملفات Excel المتعددة (فصول دراسية أو سنوات سابقة) واستخراج بيانات التلاميذ بدقة.",
    howItWorks: "يقوم المستخدم بسحب وإفلات ملفات الحجز (Excel) المعتمدة من الرقمنة. يقوم النظام بقراءة الأعمدة تلقائياً بناءً على العناوين العربية.",
    visualization: "بطاقات رفع ملفات مع مؤشرات نجاح المعالجة وعداد التلاميذ.",
    logic: "يستخدم مكتبة SheetJS لقراءة البيانات الخام، ثم يطبق خوارزمية 'Levenshtein Distance' لمقارنة الأسماء وتواريخ الميلاد لاكتشاف التكرارات ودمج الملفات في سجل موحد لكل تلميذ.",
    role: "توحيد مصادر البيانات المتفرقة في قاعدة بيانات مركزية واحدة."
  },
  {
    icon: Calculator,
    title: "2. محرك حساب المعدلات الموزونة (Weighted Scoring Engine)",
    definition: "النواة الحسابية للنظام التي تقوم بتحويل العلامات الخام إلى مؤشرات توجيه دقيقة (علمي/أدبي).",
    howItWorks: "بمجرد استيراد النقاط، يقوم النظام آلياً بحساب 'معدل العلوم' و'معدل الآداب' لكل تلميذ بناءً على معاملات المواد المحددة في الإعدادات.",
    visualization: "أعمدة درجات ملونة (أخضر للعلوم، برتقالي للآداب) داخل جداول البيانات.",
    logic: "Score = (Σ(Mark * Weight)) / Σ(Weights). يتم تطبيق هذا المنطق بشكل تراكمي (فصل 1، ثم دمج فصلين، ثم المعدل السنوي).",
    role: "توفير معيار موضوعي ورقمي للمفاضلة بين الرغبات والقدرات."
  },
  {
    icon: ShieldAlert,
    title: "3. كاشف التعارضات وتنظيف البيانات (Conflict Resolution)",
    definition: "أداة لضمان سلامة البيانات من خلال اكتشاف الأسماء المتشابهة أو المكررة عبر الملفات المختلفة.",
    howItWorks: "عند رفع ملف جديد، يظهر النظام نافذة منبثقة إذا وجد اسماً مشابهاً بنسبة تفوق 85% لاسم موجود مسبقاً، ويطلب من المستخدم تأكيد الدمج أو الفصل.",
    visualization: "نافذة (Modal) تعرض المقارنة جنباً إلى جنب مع زر 'دمج' أو 'فصل'.",
    logic: "Fuzzy String Matching: يتم تنظيف النصوص (إزالة التشكيل، توحيد التاء المربوطة) ثم حساب نسبة التطابق النصي.",
    role: "منع ازدواجية البيانات وضمان أن علامات التلميذ في S1 تُنسب لنفس التلميذ في S2."
  },
  {
    icon: Trello,
    title: "4. نظام إدارة المقابلات (Interview Kanban Board)",
    definition: "لوحة تفاعلية لتنظيم وجدولة المقابلات الفردية مع التلاميذ وأوليائهم.",
    howItWorks: "يتم عرض التلاميذ كبطاقات يمكن سحبها وإفلاتها بين أعمدة: 'قائمة الانتظار'، 'مواعيد مبرمجة'، و'تمت المقابلة'.",
    visualization: "واجهة Kanban Board مع أعمدة وألوان تميز حالة كل موعد.",
    logic: "State Management: تحديث حقل 'status' في كائن التلميذ عند انتهاء حدث السحب والإفلات (OnDrop).",
    role: "تنظيم الجانب الإداري والزمني لعملية التوجيه وتوثيق مخرجات المقابلات."
  },
  {
    icon: BrainCircuit,
    title: "5. التوجيه الافتراضي ونظام الكوتا (Virtual Guidance / Quota)",
    definition: "أداة محاكاة لتوزيع التلاميذ على الجذوع المشتركة بناءً على المقاعد البيداغوجية المتاحة.",
    howItWorks: "يحدد المستخدم نسبة الامتياز (مثلاً 5%) ونسبة المقاعد العلمية (مثلاً 30%). يقوم النظام آلياً بفرز التلاميذ وتوزيعهم.",
    visualization: "ثلاثة قوائم متجاورة (نخبة، علوم، آداب) مع إمكانية سحب وإفلات التلاميذ يدوياً لتعديل القرار.",
    logic: "Sorting Algorithm: ترتيب تنازلي حسب المعدل العام للنخبة، ثم ترتيب البقية حسب المعدل العلمي لملء كوتا العلوم، والباقي للآداب.",
    role: "المساعدة في اتخاذ قرارات الخريطة المدرسية والتنبؤ بتوزيع الأفواج للسنة المقبلة."
  },
  {
    icon: Sliders,
    title: "6. محاكي السيناريوهات (Global What-If Simulator)",
    definition: "لوحة قيادة تسمح بتغيير معايير النجاح والمعاملات لرؤية الأثر الفوري على النتائج العامة.",
    howItWorks: "يقوم المستخدم بتغيير 'عتبة النجاح' (مثلاً من 10 إلى 9.5) أو تغيير معامل الرياضيات. يقوم النظام بإعادة حساب النتائج وعرض الفارق.",
    visualization: "مؤشرات أداء (KPIs) تظهر الفارق (+/-) ورسوم بيانية مقارنة.",
    logic: "Deep Cloning: إنشاء نسخة مؤقتة من البيانات في الذاكرة، إعادة تطبيق دالة الحساب عليها، ومقارنتها بالبيانات الأصلية.",
    role: "تحليل الحساسية واتخاذ قرارات بيداغوجية استراتيجية على مستوى المؤسسة."
  },
  {
    icon: Gavel,
    title: "7. وضع مجلس القسم (Class Council Mode)",
    definition: "واجهة عرض مخصصة للاجتماعات الرسمية (مجالس الأقسام) لعرض حالة كل تلميذ واحداً تلو الآخر.",
    howItWorks: "يتم عرض بيانات تلميذ واحد في ملء الشاشة، مع أزرار كبيرة لاتخاذ القرار (توجيه، إعادة). يتم التنقل بواسطة لوحة المفاتيح.",
    visualization: "شاشة عرض (Presentation Mode) بتصميم داكن وعناصر كبيرة واضحة.",
    logic: "Sequential Navigation: استخدام مؤشر (Index) للتنقل في مصفوفة التلاميذ وتحديث حالة 'القرار' فورياً.",
    role: "تسهيل مداولات مجالس الأقسام ورقمنة عملية اتخاذ القرار الجماعي."
  },
  {
    icon: CheckCircle2,
    title: "8. مؤشرات التوافق والاستقرار (Smart Analysis Tags)",
    definition: "خوارزمية تحليلية تضع علامات (Tags) أوتوماتيكية على التلاميذ لوصف وضعيتهم.",
    howItWorks: "يقوم النظام بمقارنة 'رغبة التلميذ' مع 'التوجيه المحسوب'. إذا اختلفا، يظهر تنبيه 'عدم توافق'.",
    visualization: "أيقونات صغيرة ملونة (خطر، عدم توافق، موهبة) بجانب اسم التلميذ.",
    logic: "Conditional Logic: IF (Choice == Science AND CalcScore < Threshold) THEN Flag = 'Mismatch'.",
    role: "لفت انتباه المستشار للحالات التي تتطلب تدخلاً أو مقابلة خاصة."
  },
  {
    icon: FileText,
    title: "9. المعالجة البيداغوجية (Remedial Plans)",
    definition: "مولد تقارير آلي يشخص نقاط الضعف والقوة لكل تلميذ ويقترح حلولاً.",
    howItWorks: "يختار المستخدم تلميذاً، فيقوم النظام بتحليل علاماته التفصيلية وتوليد نص تشخيصي.",
    visualization: "تقرير جاهز للطباعة يحتوي على تحليل المواد ورسم بياني للملامح (Profile).",
    logic: "Rule-Based Text Generation: توليد جمل بناءً على شروط (مثلاً: إذا كانت الرياضيات < 8 والفيزياء < 8 -> 'ضعف في المواد الدقيقة').",
    role: "توفير أدوات بيداغوجية لمساعدة التلاميذ المتعثرين بشكل شخصي."
  },
  {
    icon: FileDown,
    title: "10. التصدير والتقارير (Word Export Engine)",
    definition: "نظام لتحويل البيانات الرقمية إلى وثائق رسمية قابلة للطباعة بتنسيق Word.",
    howItWorks: "يضغط المستخدم على زر التصدير، فيقوم النظام بإنشاء ملف .doc يحتوي على الجداول الرسمية والإشعارات.",
    visualization: "أزرار تحميل (Download) في مختلف الواجهات.",
    logic: "HTML-to-Doc Conversion: تجميع البيانات في قوالب HTML مع تنسيقات CSS محددة (للطباعة الأفقية/العمودية) وتحويلها إلى Blob.",
    role: "إنتاج الوثائق الرسمية والإدارية المطلوبة من طرف الوصاية."
  },
  {
    icon: Database,
    title: "11. التخزين المحلي الآمن (Local Persistence)",
    definition: "تقنية حفظ البيانات داخل متصفح المستخدم دون الحاجة لخادم خارجي.",
    howItWorks: "يتم حفظ كل تغيير فوراً. عند إعادة فتح الصفحة، يتم استرجاع البيانات.",
    visualization: "شفاف للمستخدم (يحدث في الخلفية).",
    logic: "IndexedDB (Dexie.js): استخدام قاعدة بيانات المتصفح لتخزين كميات كبيرة من البيانات الهيكلية بشكل دائم وآمن.",
    role: "ضمان خصوصية البيانات (لا تخرج من الجهاز) والعمل دون اتصال بالإنترنت (Offline First)."
  }
];

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-right" dir="rtl">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 text-white p-2 rounded-lg">
                <Layout size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-800">تفاصيل خصائص النظام</h1>
                <p className="text-xs text-slate-500">التوثيق التقني والوظيفي الشامل</p>
            </div>
          </div>
          <Button onClick={onBack} variant="outline" className="gap-2">
            العودة للرئيسية <ArrowLeft size={16}/>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feat, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary-600 shadow-sm group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors">
                            <feat.icon size={20} />
                        </div>
                        <h2 className="font-bold text-slate-800 text-lg">{feat.title}</h2>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">التعريف (Definition)</span>
                            <p className="text-slate-700 font-medium leading-relaxed">{feat.definition}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                    <Sliders size={12}/> آلية العمل
                                </span>
                                <p className="text-xs text-slate-600 leading-relaxed">{feat.howItWorks}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                    <Layout size={12}/> المظهر (UI)
                                </span>
                                <p className="text-xs text-slate-600 leading-relaxed">{feat.visualization}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">المنطق البرمجي (Logic)</span>
                            <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-xs shadow-inner" dir="ltr">
                                {feat.logic}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full border border-emerald-200">الدور والهدف</span>
                            <span className="text-xs text-slate-500 font-medium">{feat.role}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-slate-500 text-sm">© 2026 Tawjih Pro. جميع الخوارزميات والوظائف المذكورة أعلاه مطورة ومحفوظة.</p>
          </div>
      </footer>
    </div>
  );
};
