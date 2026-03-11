
import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, Search, AlertTriangle, CheckCircle2, 
  BrainCircuit, Stethoscope, FileDown, FileText, ArrowRight,
  TrendingUp, TrendingDown, BookOpen, User, Calendar
} from 'lucide-react';
import { ConsolidatedStudent, FileMetadata, SubjectKey } from '../types';
import { Button } from './Button';
import { exportRemedialPlanToWord } from '../services/exportService';

interface RemedialPlanManagerProps {
  students: ConsolidatedStudent[];
  meta: Partial<FileMetadata>;
}

type SemesterContext = 's1' | 's2' | 's3';

// Logic to generate advice
const analyzeStudent = (student: ConsolidatedStudent, semester: SemesterContext) => {
    const s = student[semester]; // Get specific semester data
    if (!s || Object.keys(s).length === 0) return null;

    const weaknesses: string[] = [];
    const strengths: string[] = [];
    const observations: string[] = [];
    let priorityLevel: 'high' | 'medium' | 'low' = 'low';

    // 1. Get Weighted Profile Scores (Official Guidance Scores)
    let sciScore = 0;
    let litScore = 0;

    if (semester === 's1') {
        sciScore = student.guidance.scienceScore;
        litScore = student.guidance.artsScore;
    } else if (semester === 's2') {
        sciScore = student.guidanceS2?.scienceScore || 0;
        litScore = student.guidanceS2?.artsScore || 0;
    } else {
        // S3
        sciScore = student.guidanceS3?.scienceScore || 0;
        litScore = student.guidanceS3?.artsScore || 0;
    }

    const gap = Math.abs(sciScore - litScore);

    // 2. Analyze Subjects (Raw Grades)
    const checkSubject = (key: SubjectKey, label: string) => {
        const val = s[key];
        if (val !== undefined) {
            if (val < 9) weaknesses.push(label);
            if (val >= 14) strengths.push(label);
        }
    };

    checkSubject('math', 'الرياضيات');
    checkSubject('physics', 'الفيزياء');
    checkSubject('nature', 'العلوم الطبيعية');
    checkSubject('arabic', 'اللغة العربية');
    checkSubject('french', 'اللغة الفرنسية');
    checkSubject('english', 'اللغة الإنجليزية');

    // 3. Pedagogical Diagnosis & Interpretation
    
    // General Performance
    if (s.avg < 9) {
        priorityLevel = 'high';
        observations.push('تراجع حاد في التحصيل الدراسي العام. التلميذ في وضعية خطر ويحتاج إلى تدخل عاجل.');
    } else if (s.avg < 10) {
        priorityLevel = 'medium';
        observations.push('النتائج دون المعدل، تتطلب استدراكاً فورياً لتفادي الرسوب.');
    }

    // Profile Analysis based on Weighted Scores
    if (gap > 2) { // 2 points difference in weighted score is significant
        if (sciScore > litScore) {
            observations.push(`ملامح علمية واضحة (معدل التوجيه العلمي: ${sciScore.toFixed(2)} مقابل الأدبي: ${litScore.toFixed(2)}).`);
        } else {
            observations.push(`ملامح أدبية واضحة (معدل التوجيه الأدبي: ${litScore.toFixed(2)} مقابل العلمي: ${sciScore.toFixed(2)}).`);
        }
    } else {
        observations.push('مستوى متقارب بين الجذعين (Profile Balanced). يمكن للتلميذ النجاح في كلا المسارين.');
    }

    // Specific Learning Issues
    if (s.math < 8 && s.physics < 8) {
        observations.push('ضعف قاعدي في المواد العلمية الدقيقة (الرياضيات والفيزياء). قد يعاني التلميذ من نقص في المكتسبات القبلية.');
    }
    if (s.arabic < 9 || s.french < 9) {
        observations.push('عائق لغوي محتمل يؤثر على استيعاب باقي المواد.');
    }

    // Orientation Mismatch (Contextual)
    // Get orientation choice relevant to the semester
    let choice = '';
    if (semester === 's1') choice = student.orientationS1.choice1;
    else if (semester === 's2') choice = student.orientationS2.choice1;
    else choice = student.orientationS3.choice1;

    if (choice) {
        if (choice.includes('علوم') && sciScore < 9) {
            observations.push('اختلال التوجيه: الرغبة في "العلوم" لا تتوافق مع النتائج الحالية (معدل التوجيه العلمي ضعيف).');
        }
        if (choice.includes('آداب') && litScore < 9) {
            observations.push('اختلال التوجيه: الرغبة في "الآداب" لا تتوافق مع النتائج الحالية (معدل التوجيه الأدبي ضعيف).');
        }
    }

    return { 
        weaknesses, 
        strengths, 
        observations, 
        priorityLevel,
        stats: { sciAvg: sciScore, litAvg: litScore } 
    };
};

export const RemedialPlanManager: React.FC<RemedialPlanManagerProps> = ({ students, meta }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showRiskOnly, setShowRiskOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetSemester, setTargetSemester] = useState<SemesterContext>('s1');

  // Filter students
  const queue = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = searchTerm === '' || s.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Determine if Risk based on SELECTED semester
      const grades = s[targetSemester];
      const avg = grades?.avg ?? 0;
      const isRisk = avg < 10 || s.smartFlags.includes('mismatch');
      
      if (showRiskOnly && !isRisk) return false;
      
      return matchesSearch;
    });
  }, [students, searchTerm, showRiskOnly, targetSemester]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const analysis = selectedStudent ? analyzeStudent(selectedStudent, targetSemester) : null;

  const handleExport = () => {
      if (selectedStudent && analysis) {
          exportRemedialPlanToWord(selectedStudent, analysis, meta, targetSemester);
      }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden animate-in fade-in duration-300">
        
        {/* LEFT SIDEBAR */}
        <div className="w-80 md:w-96 flex flex-col bg-white border-l border-slate-200 shadow-sm z-10">
            <div className="p-6 border-b border-slate-100 bg-rose-50/50">
                <h2 className="font-bold text-lg text-rose-900 flex items-center gap-2">
                    <HeartHandshake size={20} className="text-rose-600"/>
                    المعالجة البيداغوجية
                </h2>
                <p className="text-xs text-rose-700 mt-1 opacity-80">خطط علاجية للتلاميذ المتعثرين</p>
                
                {/* Semester Selector */}
                <div className="flex gap-1 mt-3 bg-white p-1 rounded-lg border border-rose-100 shadow-sm">
                    {(['s1', 's2', 's3'] as const).map(sem => (
                        <button
                            key={sem}
                            onClick={() => setTargetSemester(sem)}
                            className={`flex-1 text-xs font-bold py-1.5 rounded transition-colors ${targetSemester === sem ? 'bg-rose-500 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            الفصل {sem.replace('s', '')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3 border-b border-slate-100 flex flex-col gap-3">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="بحث عن تلميذ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>

                <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <AlertTriangle size={14} className={showRiskOnly ? 'text-rose-500' : 'text-slate-400'}/>
                        عرض حالات الخطر - {targetSemester === 's1' ? 'الفصل الأول' : targetSemester === 's2' ? 'الفصل الثاني' : 'الفصل الثالث'}
                    </span>
                    <input 
                        type="checkbox" 
                        checked={showRiskOnly}
                        onChange={e => setShowRiskOnly(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                </label>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center p-4">
                        <CheckCircle2 size={32} className="mb-2 opacity-20"/>
                        <p className="text-sm">لا توجد حالات تتطلب المعالجة في الفصل {targetSemester.replace('s', '')}</p>
                    </div>
                ) : (
                    queue.map(student => {
                        const grades = student[targetSemester];
                        const avg = grades?.avg ?? 0;
                        const hasData = grades && Object.keys(grades).length > 0;

                        return (
                            <div 
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedStudentId === student.id ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{student.fullName}</span>
                                    {hasData ? (
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${avg < 10 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {avg.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">بدون بيانات</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{student.classCode}</span>
                                    {student.smartFlags.includes('mismatch') && (
                                        <span className="flex items-center gap-1 text-orange-600 font-bold">
                                            <BrainCircuit size={10}/> توجيه
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* RIGHT SIDE: PLAN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/50">
            {selectedStudent ? (
                analysis ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        
                        {/* Header Card */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border-2 border-white shadow-sm">
                                    <User size={32}/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-2xl font-bold text-slate-800">{selectedStudent.fullName}</h1>
                                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold uppercase">{targetSemester === 's1' ? 'الفصل الأول' : targetSemester === 's2' ? 'الفصل الثاني' : 'الفصل الثالث'}</span>
                                    </div>
                                    <div className="flex gap-3 text-sm text-slate-500">
                                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedStudent.birthDate}</span>
                                        <span className="font-bold text-slate-700">قسم السنة الرابعة م {selectedStudent.classCode}</span>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleExport} className="gap-2">
                                <FileDown size={18}/> تصدير التقرير
                            </Button>
                        </div>

                        {/* Profile Analysis */}
                        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden p-4">
                            <h4 className="text-كس font-bold text-indigo-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BrainCircuit size={18}/> تحليل الملامح (بناءً على معدلات التوجيه الرسمية)
                            </h4>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">معدل التوجيه (علوم)</span>
                                        <span className="font-bold text-slate-800">{analysis.stats.sciAvg.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                                        <div className="bg-blue-500 h-full rounded-full" style={{width: `${(analysis.stats.sciAvg / 20) * 100}%`}}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">معدل التوجيه (آداب)</span>
                                        <span className="font-bold text-slate-800">{analysis.stats.litAvg.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                                        <div className="bg-amber-500 h-full rounded-full" style={{width: `${(analysis.stats.litAvg / 20) * 100}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Diagnostic Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Weaknesses */}
                            <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
                                <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center gap-2 text-rose-800 font-bold">
                                    <TrendingDown size={18}/> نقاط الضعف (مواد {'<'} 9)
                                </div>
                                <div className="p-4">
                                    {analysis.weaknesses.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.weaknesses.map(sub => (
                                                <span key={sub} className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-sm font-bold border border-rose-100">
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm text-center py-2">لا توجد نقاط ضعف ملحوظة</p>
                                    )}
                                </div>
                            </div>

                            {/* Strengths */}
                            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                                <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2 text-emerald-800 font-bold">
                                    <TrendingUp size={18}/> نقاط القوة (مواد {'>'} 14)
                                </div>
                                <div className="p-4">
                                    {analysis.strengths.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.strengths.map(sub => (
                                                <span key={sub} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-100">
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm text-center py-2">لا توجد نقاط قوة بارزة</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pedagogical Observations */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2 text-indigo-900 font-bold">
                                <Stethoscope size={20}/> التشخيص البيداغوجي وتفسير النتائج
                            </div>
                            <div className="p-6 space-y-4">
                                {analysis.observations.map((adv, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="mt-1 min-w-[20px] h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <p className="text-slate-700 font-medium leading-relaxed">
                                            {adv}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Plan Checklist */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <FileText size={18}/> إجراءات المتابعة المقترحة
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {['استدعاء الولي للمقابلة', 'إمضاء عقد التزام', 'حصص دعم في المواد الأساسية', 'متابعة نفسية (خلية الإصغاء)', 'تكليف بمراجعة إضافية', 'تغيير مكان الجلوس'].map((action, i) => (
                                    <label key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300">
                                        <input type="checkbox" className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-gray-300"/>
                                        <span className="text-sm font-medium text-slate-700">{action}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <AlertTriangle size={48} className="mb-4 opacity-20"/>
                        <h3 className="text-lg font-bold text-slate-600">بيانات ناقصة</h3>
                        <p>لا تتوفر بيانات كافية للفصل {targetSemester} لهذا التلميذ.</p>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <BookOpen size={48} className="mb-4 opacity-20"/>
                    <h3 className="text-lg font-bold text-slate-600">لم يتم تحديد تلميذ</h3>
                    <p>اختر تلميذاً من القائمة لعرض بطاقة المعالجة البيداغوجية.</p>
                </div>
            )}
        </div>
    </div>
  );
};
