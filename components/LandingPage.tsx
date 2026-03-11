
import React from 'react';
import { GraduationCap, BarChart3, Calendar, ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import { Button } from './Button';
import favicon from '/favicon.ico'

interface LandingPageProps {
  onGetStarted: () => void;
  onShowFeatures: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onShowFeatures }) => {
  return (
    <div className="h-screen w-full bg-slate-50 relative overflow-hidden flex flex-col font-sans" dir="rtl">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none z-0"></div>
      
      {/* --- Background Floating Widgets (Visual Candy) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Top Right: Tasks/Notes */}
        <div className="absolute top-[15%] right-[5%] md:right-[10%] w-64 bg-yellow-50 p-4 rounded-2xl shadow-xl border border-yellow-100 rotate-3 hidden lg:block animate-in fade-in zoom-in duration-1000 delay-100 blur-[1px] opacity-80">
           <div className="flex items-center gap-2 mb-3 text-yellow-700">
              <FileText size={18} className="fill-yellow-200"/>
              <span className="font-bold text-sm">ملاحظات التوجيه</span>
           </div>
           <p className="text-sm text-slate-700 font-handwriting leading-relaxed">
             مراجعة قائمة التلاميذ ذوي المعدلات أقل من 9 وإعداد خطط المعالجة البيداغوجية قبل المجلس.
           </p>
           <div className="mt-3 flex justify-end">
             <div className="w-8 h-8 rounded-full bg-white border border-yellow-200 flex items-center justify-center shadow-sm">
                <CheckCircle2 size={16} className="text-emerald-500"/>
             </div>
           </div>
        </div>

        {/* Top Left: Calendar/Event */}
        <div className="absolute top-[18%] left-[5%] md:left-[10%] w-56 bg-white p-4 rounded-3xl shadow-xl border border-slate-100 -rotate-3 hidden lg:block animate-in fade-in zoom-in duration-1000 delay-200 blur-[1px] opacity-80">
            <div className="flex justify-between items-center mb-4">
               <span className="font-bold text-slate-800 text-sm">المواعيد القادمة</span>
               <Calendar size={18} className="text-primary-500"/>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3 mb-2">
               <div className="bg-white px-2 py-1 rounded-lg text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Jun</span>
                  <span className="block text-lg font-bold text-slate-800">12</span>
               </div>
               <div>
                  <div className="text-sm font-bold text-slate-700">مجلس القبول</div>
                  <div className="text-xs text-slate-400">09:00 - 12:00</div>
               </div>
            </div>
            <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="w-2/3 h-full bg-primary-500 rounded-full"></div>
            </div>
        </div>

        {/* Bottom Left: Analytics Card */}
        <div className="absolute bottom-[10%] left-[8%] w-72 bg-white p-5 rounded-3xl shadow-xl border border-slate-100 rotate-2 hidden lg:block animate-in fade-in zoom-in duration-1000 delay-300 blur-[1px] opacity-70 scale-90">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                 <BarChart3 size={20} />
              </div>
              <div>
                 <div className="font-bold text-slate-800 text-sm">توزيع الرغبات</div>
                 <div className="text-xs text-slate-400">إحصائيات الفصل الأول</div>
              </div>
           </div>
           <div className="flex items-end justify-between h-24 gap-2 px-2">
              <div className="w-1/3 bg-slate-100 rounded-t-lg h-[40%] relative group">
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400">مهني</div>
              </div>
              <div className="w-1/3 bg-primary-100 rounded-t-lg h-[80%] relative group">
                 <div className="bg-primary-500 w-full h-full rounded-t-lg opacity-80"></div>
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-primary-600">علوم</div>
              </div>
              <div className="w-1/3 bg-amber-100 rounded-t-lg h-[60%] relative group">
                 <div className="bg-amber-500 w-full h-full rounded-t-lg opacity-80"></div>
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-600">آداب</div>
              </div>
           </div>
        </div>

        {/* Bottom Right: Student Card */}
        <div className="absolute bottom-[12%] right-[8%] w-64 bg-white p-0 rounded-3xl shadow-xl border border-slate-100 -rotate-2 hidden lg:block animate-in fade-in zoom-in duration-1000 delay-500 blur-[1px] opacity-70 scale-90">
           <div className="p-4 flex items-center gap-3 border-b border-slate-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                 AM
              </div>
              <div>
                 <div className="font-bold text-slate-800 text-sm">أحمد محمدي</div>
                 <div className="text-xs text-slate-400">4 متوسط 2</div>
              </div>
           </div>
           <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-slate-500">المعدل السنوي</span>
                 <span className="text-lg font-bold text-emerald-600 bg-emerald-50 px-2 rounded-md">14.50</span>
              </div>
              <div className="flex gap-2 mt-3">
                 <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">جذع مشترك علوم</span>
                 <span className="px-2 py-1 rounded-md bg-primary-50 text-primary-600 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={10}/>
                    منسجم
                 </span>
              </div>
           </div>
        </div>

        {/* Center Floating Icons (Blurry background glow) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-200/20 rounded-full blur-3xl -z-10 animate-pulse pointer-events-none"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center text-white">
            <img
                src={favicon} // Use the imported image
                alt="Al Wajeez Logo"
                className="w-10 h-10 transition-transform duration-500" style={{zIndex:11}}
              />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">الوجيز - سجل المتابعة</span><span className="bg-gradient-to-r from-primary-600 to-blue-500 p-1 rounded-md text-white">المتوسط</span>
        </div>
    
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        
        <div className="text-center max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-1.5 text-xs font-bold text-slate-600 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            الإصدار الجديد 1.0 متاح الآن
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-10 drop-shadow-sm">
            المنصة الرقمية الشاملة <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-500">للتوجيه المدرسي</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
            نظام متكامل لرقمنة عمليات التوجيه، حساب المعدلات بدقة، محاكاة مجالس الأقسام، وإصدار التقارير البيداغوجية بضغطة زر.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={onGetStarted} size="md" className="h-14 px-8 rounded-md text-md shadow-md shadow-primary-600/20 hover:scale-105 transition-transform w-full sm:w-auto z-20 relative">
              الدخول إلى النظام <ArrowLeft className="mr-2" size={20}/>
            </Button>
            <Button onClick={onShowFeatures} variant="outline" size="md" className="h-14 px-8 rounded-md text-md bg-white/80 hover:bg-white backdrop-blur-sm border-slate-200 w-full sm:w-auto z-20 relative">
              التوثيق التقني والوظيفي الشامل
            </Button>
          </div>
        </div>

      </main>

      {/* Footer minimal */}
      <footer className="relative z-10 w-full py-6 text-center text-slate-400 text-sm">
        <p>الوجيز &copy; 2026 . جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};
