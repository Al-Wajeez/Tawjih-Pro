
import React from 'react';
import { Info, Code, Calendar, Mail, Phone, MapPin, ShieldCheck, Globe, BookOpen, Layers, Lock, FileText, Contact2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Info className="text-primary-600"/>
                حول البرنامج
            </h2>
            <p className="text-slate-500">
                معلومات عن النظام، الإصدار، وفريق التطوير.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Program Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden md:col-span-2">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Layers size={20} className="text-blue-600"/>
                    <h3 className="font-bold text-slate-800">بطاقة البرنامج التقنية</h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                            <ShieldCheck size={40} className="text-blue-600"/>
                        </div>
                        <div className="space-y-4 flex-1">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">برنامج الوجيز - سجل المتابعة <span className="text-sm font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mx-2">نظام التوجيه المدرسي</span></h1>
                                <p className="text-slate-600 mt-2 ml-4 leading-relaxed text-justify">
                                    نظام متكامل لتسيير عملية التوجيه المدرسي لتلاميذ السنة الرابعة متوسط. يقوم البرنامج بدمج البيانات من ملفات الحجز، حساب معدلات التوجيه وفق المناشير الوزارية، ترتيب التلاميذ، ومحاكاة عمليات التوجيه بدقة عالية لمساعدة مستشاري التوجيه والأطقم الإدارية.
                                </p>
                                <p className="text-slate-600 mt-2 ml-4 leading-relaxed text-justify">
                                    برنامج الوجيز هو منظومة تحليلية تربوية رقمية، مخصّصة لتحليل ومتابعة نتائج التلاميذ في مرحلتي التعليم المتوسط والتعليم الثانوي، اعتمادًا على مقاربة كمية وكيفية حديثة. يعتمد البرنامج على تحليل المعطيات الإحصائية التربوية بشكل ديناميكي وتفاعلي، بما يسمح باستخلاص مؤشرات دقيقة وهادفة تدعم أصحاب القرار، وتوجّه التربويين نحو فهم أعمق لواقع التحصيل.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Code size={18}/></div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase">رقم الإصدار</div>
                                        <div className="font-mono font-bold text-slate-800">v1.0.0 (Beta)</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Calendar size={18}/></div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase">تاريخ الإصدار</div>
                                        <div className="font-mono font-bold text-slate-800">جانفي 2026</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Owner / Developer Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden md:col-span-2">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Code size={20} className="text-emerald-600"/>
                    <h3 className="font-bold text-slate-800">عن مطور البرنامج</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed text-justify">
                        تم تصميم وتطوير هذا البرنامج بجهود خاصة من طرف المختص النفسي الإجتماعي <span className='text-slate-800 font-bold rounded-md'>حدادي عبد الرؤوف</span> لتلبية احتياجات قطاع التربية والتعليم، بهدف رقمنة وتسهيل مهام مستشاري التوجيه وتقليل الأخطاء في حساب المعدلات وتوزيع التلاميذ.
                    </p>
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Phone size={20} className="text-purple-600"/>
                    <h3 className="font-bold text-slate-800">معلومات الاتصال</h3>
                    <span className='rounded-md p-1.5 bg-purple-600 text-purple-50 text-xs font-bold'>المطور | المؤسسة المالكة</span> 
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <Contact2 size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">الإسم واللقب</div>
                            <div className="text-slate-700 font-medium" dir="ltr">حدادي عبد الرؤوف</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <Phone size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">الهاتف</div>
                            <div className="text-slate-700 font-medium font-mono" dir="ltr">+213 561 52 04 92</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <Mail size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">البريد الإلكتروني</div>
                            <div className="text-slate-700 font-medium font-mono">haddadi.abdraouf@gmail.com</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <MapPin size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">العنوان</div>
                            <div className="text-slate-700 font-medium">البليدة، الجزائر</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Info 2 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Phone size={20} className="text-purple-600"/>
                    <h3 className="font-bold text-slate-800">معلومات الاتصال</h3>
                    <span className='rounded-md p-1.5 bg-purple-600 text-purple-50 text-xs font-bold'>المشرف</span> 
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <Contact2 size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">الإسم واللقب</div>
                            <div className="text-slate-700 font-medium" dir="ltr">بن سعيد ناجيم</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <Phone size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">المنصب</div>
                            <div className="text-slate-700 font-medium" dir="ltr">مستشار التوجيه والإرشاد المدرسي والمهني</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <Mail size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">المركز</div>
                            <div className="text-slate-700 font-medium">مركز التوجيه والإرشاد المذرسي والمهني بجاية</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                            <MapPin size={16}/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold">العنوان</div>
                            <div className="text-slate-700 font-medium">بجاية، الجزائر</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* References */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden md:col-span-2">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <BookOpen size={20} className="text-amber-600"/>
                    <h3 className="font-bold text-slate-800">المراجع والمصادر القانونية</h3>
                </div>
                <div className="p-6">
                    <ul className="space-y-2 list-disc list-inside text-slate-700 text-sm">
                        <li>المنشور الوزاري المتعلق بإجراءات القبول والتوجيه إلى السنة الأولى ثانوي.</li>
                        <li>دليل مستشار التوجيه (وزارة التربية الوطنية).</li>
                        <li>المعاملات الرسمية للمواد الدراسية (الجيل الثاني).</li>
                        <li>منشورات الديوان الوطني للامتحانات والمسابقات (BEM).</li>
                    </ul>
                </div>
            </div>

            {/* Privacy Policy & License */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden md:col-span-2">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Lock size={20} className="text-slate-600"/>
                    <h3 className="font-bold text-slate-800">سياسة الخصوصية وترخيص الاستخدام</h3>
                </div>
                <div className="p-8 text-sm text-slate-700 leading-loose space-y-8">
                    
                    <div className="text-center border-b border-slate-100 pb-6">
                        <h4 className="font-bold text-lg text-slate-900 mb-2">ترخيص استخدام برنامج "الوجيز"</h4>
                        <p className="font-medium text-slate-600">© 2025 حدادي عبد الرؤوف</p>
                        <p className="text-slate-500">جميع الحقوق محفوظة.</p>
                    </div>

                    <div className="space-y-6">
                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> التعريف</h5>
                            <p>يُقصد بـ "البرنامج" تطبيق "الوجيز" (Al-Wajeez) وجميع مكوناته الرقمية (الواجهة، قاعدة البيانات، الأكواد المصدرية، النماذج التحليلية، الوثائق، الشروحات، وأي ملفات مرافقة).</p>
                            <p>يُقصد بـ "المستخدم" أي شخص طبيعي أو معنوي يستعمل البرنامج لغرض تربوي أو إداري أو بحثي بإذن من المالك الشرعي.</p>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> الحقوق والملكية الفكرية</h5>
                            <p>البرنامج محمي بموجب أحكام الأمر رقم 03-05 المؤرخ في 19 يوليو 2003 والمتعلق بحق المؤلف والحقوق المجاورة، والقوانين الجزائرية المكملة له.</p>
                            <p>جميع حقوق النسخ، التعديل، النشر، التوزيع، والترخيص محفوظة لصاحب البرنامج.</p>
                            <p>لا يُسمح باستخدام أو إعادة إنتاج أي جزء من البرنامج أو محتوياته إلا بإذن كتابي صريح من المالك.</p>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> شروط الاستخدام</h5>
                            <p className="mb-2">يُسمح باستخدام البرنامج في إطار:</p>
                            <ul className="list-disc list-inside pr-4 space-y-1 mb-2">
                                <li>المؤسسات التربوية الجزائرية،</li>
                                <li>مراكز التوجيه والإرشاد المدرسي والمهني،</li>
                                <li>الأغراض التكوينية أو البحثية غير التجارية،</li>
                            </ul>
                            <p className="mb-4 font-medium">وذلك فقط بعد الحصول على إذن رسمي من صاحب الحق.</p>
                            
                            <p className="mb-2">يُمنع ما يلي منعًا باتًا دون ترخيص مسبق:</p>
                            <ul className="list-disc list-inside pr-4 space-y-1 text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
                                <li>نسخ أو استنساخ البرنامج كليًا أو جزئيًا.</li>
                                <li>تعديل أو ترجمة أو إعادة هندسة الكود المصدري.</li>
                                <li>دمج البرنامج ضمن منتجات أو خدمات أخرى.</li>
                                <li>توزيعه أو بيعه أو تأجيره أو تقديمه كخدمة مدفوعة أو مجانية لطرف ثالث.</li>
                                <li>إزالة أو تعديل الإشارات إلى حقوق المؤلف أو اسم البرنامج.</li>
                            </ul>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> خصوصية البيانات ومعالجة المعلومات الشخصية</h5>
                            <p className="mb-2">نظرًا لأن البرنامج يعالج بيانات تلاميذ (استبيانات، نتائج، معلومات شخصية)، يلتزم المستخدم بما يلي:</p>
                            <ul className="list-disc list-inside pr-4 space-y-1">
                                <li>احترام أحكام القانون رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في معالجة المعطيات ذات الطابع الشخصي.</li>
                                <li>عدم جمع أو حفظ أو تصدير بيانات التلاميذ دون مبرر تربوي مشروع.</li>
                                <li>تخزين البيانات في بيئة آمنة وعدم مشاركتها مع أطراف ثالثة.</li>
                                <li>الحصول على موافقة مسبقة من الجهات الوصية أو الأولياء عند الاقتضاء.</li>
                                <li>إبلاغ المالك أو السلطات المختصة فورًا في حالة أي خرق أمني أو تسريب بيانات.</li>
                            </ul>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span> حدود المسؤولية</h5>
                            <p>البرنامج مقدم "كما هو" دون أي ضمانات صريحة أو ضمنية.</p>
                            <p>لا يتحمل المالك أو المطور مسؤولية الأضرار المباشرة أو غير المباشرة الناتجة عن استخدام البرنامج أو سوء استعماله.</p>
                            <p>يقع على عاتق المستخدم ضمان سلامة تطبيق الإجراءات الأمنية والقانونية أثناء معالجة البيانات.</p>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">6</span> التحديثات والدعم الفني</h5>
                            <p>يحتفظ صاحب البرنامج بحق تعديل أو تحسين أو إيقاف أي جزء من البرنامج في أي وقت دون إشعار مسبق.</p>
                            <p>لا يلتزم المالك بتوفير دعم فني مجاني، إلا في حال اتفاق خاص مكتوب.</p>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">7</span> القوانين المطبقة والاختصاص القضائي</h5>
                            <p className="mb-2">يخضع هذا الترخيص لأحكام القوانين الجزائرية السارية، ولا سيما:</p>
                            <ul className="list-disc list-inside pr-4 space-y-1 mb-2">
                                <li>الأمر رقم 03-05 المتعلق بحق المؤلف والحقوق المجاورة،</li>
                                <li>القانون رقم 18-07 المتعلق بحماية المعطيات ذات الطابع الشخصي.</li>
                            </ul>
                            <p>في حال نشوب نزاع، تكون المحاكم الجزائرية المختصة هي صاحبة الولاية القضائية للفصل فيه.</p>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">8</span> معلومات الاتصال</h5>
                            <p className="mb-2">للتصريح باستخدام البرنامج أو طلب ترخيص خاص أو اتفاقية شراكة تربوية، يُرجى التواصل عبر:</p>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-900 font-medium">
                                <p>• البريد الإلكتروني: <a href="mailto:haddadi.abdraouf@gmail.com" className="underline hover:text-blue-700">haddadi.abdraouf@gmail.com</a></p>
                                <p>• المالك/المؤلف: حدادي عبد الرؤوف</p>
                                <p>• سنة الإصدار: 2026</p>
                                <p>• اسم البرنامج: الوجيز – سجل المتابعة</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

        </div>

        <div className="text-center text-slate-400 text-xs mt-10">
            <p>الوجيز &copy; 2026 . جميع الحقوق محفوظة.</p>
        </div>

      </div>
    </div>
  );
};
