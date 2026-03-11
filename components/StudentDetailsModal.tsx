
import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Clock, Calendar, Compass, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, MessageSquare, Send, User, Calculator, School, UserCircle, Target, FileText, ChevronDown } from 'lucide-react';
import { ConsolidatedStudent, SubjectKey, GuidanceSettings, Note } from '../types';
import { Button } from './Button';
import { calculateStudentPlacement, rankStudents } from '../services/guidanceService';

interface StudentDetailsModalProps {
  student: ConsolidatedStudent;
  settings?: GuidanceSettings; // Optional to handle loading state/defaults
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
  onSave?: (student: ConsolidatedStudent) => void;
  studentsContext?: ConsolidatedStudent[]; // All students for rank simulation
}

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  arabic: 'اللغة العربية',
  french: 'اللغة الفرنسية',
  english: 'اللغة الإنجليزية',
  historyGeo: 'التاريخ والجغرافيا',
  math: 'الرياضيات',
  nature: 'العلوم الطبيعية',
  physics: 'العلوم الفيزيائية',
  avg: 'المعدل الفصلي'
};

const SUBJECT_ORDER: SubjectKey[] = [
  'math', 'physics', 'nature', 'arabic', 'french', 'english', 'historyGeo', 'avg'
];

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ 
  student, 
  settings,
  onClose,
  onNext,
  onPrev,
  currentIndex,
  totalCount,
  onSave,
  studentsContext
}) => {
  const [activeTab, setActiveTab] = useState<'RECOMMENDATION' | 'ACADEMIC' | 'S1' | 'S2' | 'S3' | 'PAST' | 'ORIENT' | 'TRAJECTORY' | 'NOTES' | 'SIMULATOR'>('S1');
  const [academicSubTab, setAcademicSubTab] = useState<'S1' | 'S2' | 'S3' | 'PAST'>('S1');
  // Note State
  const [newNote, setNewNote] = useState('');

  // Simulator State
  const [simulatedGrades, setSimulatedGrades] = useState<Record<SubjectKey, number>>({
      math: 0, physics: 0, nature: 0, arabic: 0, french: 0, english: 0, historyGeo: 0, avg: 0
  });
  const [targetSemester, setTargetSemester] = useState<'s1' | 's2' | 's3'>('s2');

  // Orientation Tab Sub-State
  const [orientTab, setOrientTab] = useState<'S1' | 'S2' | 'S3'>('S1');

  // Initialize simulator state based on student data
  useEffect(() => {
      // Determine logical next semester to simulate
      if (student.s2 && Object.keys(student.s2).length > 0) {
          setTargetSemester('s3');
          // Pre-fill with S2 grades as a starting point if available, else 0
          setSimulatedGrades(student.s2 as any);
      } else {
          setTargetSemester('s2');
          // Pre-fill with S1 grades as starting point
          setSimulatedGrades(student.s1 as any || {});
      }
  }, [student.id]);

  // Helper to get appreciation based on dynamic settings
  const getAppreciation = (score: number) => {
      if (!settings) return null;
      // Assume appreciations are sorted descending
      const match = settings.appreciations.find(rule => score >= rule.min);
      return match ? { label: match.label, color: match.color } : null;
  };

  // Prevent background scrolling
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleAddNote = () => {
    if (!newNote.trim() || !onSave) return;
    
    const note: Note = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: newNote.trim(),
    };
    
    const updatedStudent = {
      ...student,
      notes: [note, ...(student.notes || [])]
    };
    
    onSave(updatedStudent);
    setNewNote('');
  };

  // --- Simulator Logic ---
  
  // Memoize the baseline peers to avoid re-calculating everyone on every keystroke
  const baselinePeers = useMemo(() => {
      if (!studentsContext) return [];
      
      return studentsContext.map(s => {
          if (s.id === student.id) return null; // Skip self (handled dynamically)

          // Check if peer already has data for target semester
          const hasData = s[targetSemester] && Object.keys(s[targetSemester]!).length > 0;
          
          if (hasData) {
              return s;
          } else {
              // If peer is missing data for target semester, project their performance 
              // by assuming they repeat their previous semester's grades.
              // This provides a realistic "Rank" estimation instead of comparing against 0.
              const prevSem = targetSemester === 's3' ? 's2' : 's1';
              const prevGrades = s[prevSem];
              
              if (prevGrades && Object.keys(prevGrades).length > 0) {
                  const mockPeer = { ...s, [targetSemester]: prevGrades };
                  // We must calculate placement for this mock peer so they have a Score
                  return calculateStudentPlacement(mockPeer, settings);
              }
              return s; // Fallback (score 0)
          }
      });
  }, [studentsContext, targetSemester, settings, student.id]);

  const calculateProjection = () => {
      // 1. Create a mock of ME with the simulated grades
      const mockMe: ConsolidatedStudent = {
          ...student,
          [targetSemester]: simulatedGrades
      };

      // 2. Calculate MY placement scores
      const calculatedMe = calculateStudentPlacement(mockMe, settings);
      
      // 3. Merge with baseline peers
      let projectedRankSci = 0;
      let projectedRankArts = 0;

      if (baselinePeers.length > 0) {
          // Reconstruct full list: peers + calculatedMe
          // (baselinePeers has null at my index, so map works perfectly)
          const tempContext = baselinePeers.map(p => p === null ? calculatedMe : p) as ConsolidatedStudent[];
          
          // 4. Rank the projected universe
          const rankedContext = rankStudents(tempContext);
          
          // 5. Find my new rank
          const found = rankedContext.find(s => s.id === student.id);
          if (found) {
              if (targetSemester === 's2' && found.guidanceS2) {
                  projectedRankSci = found.guidanceS2.scienceRank;
                  projectedRankArts = found.guidanceS2.artsRank;
              } else if (targetSemester === 's3' && found.guidanceS3) {
                  projectedRankSci = found.guidanceS3.scienceRank;
                  projectedRankArts = found.guidanceS3.artsRank;
              } else {
                  // Fallback for S1 or edge cases
                  projectedRankSci = found.guidance.scienceRank;
                  projectedRankArts = found.guidance.artsRank;
              }
          }
      }

      return { calculated: calculatedMe, projectedRankSci, projectedRankArts };
  };

  const renderSimulator = () => {
      const { calculated, projectedRankSci, projectedRankArts } = calculateProjection();
      
      const currentGuidance = targetSemester === 's3' ? student.guidanceS2 : student.guidance; // Previous semester guidance as baseline
      const projectedGuidance = targetSemester === 's3' ? calculated.guidanceS3 : calculated.guidanceS2;

      // Fallback if projection is undefined (e.g. settings missing)
      const projSciScore = projectedGuidance?.scienceScore || 0;
      const projArtsScore = projectedGuidance?.artsScore || 0;

      const getDiff = (current: number | undefined, projected: number) => {
          if (current === undefined) return 0;
          return projected - current;
      };

      const sciDiff = getDiff(currentGuidance?.scienceScore, projSciScore);
      const artsDiff = getDiff(currentGuidance?.artsScore, projArtsScore);

      return (
          <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-6 rounded-xl border border-violet-100 mb-6 flex justify-between items-center">
                  <div>
                      <h3 className="font-bold text-violet-900 flex items-center gap-2">
                          <Calculator size={20}/>
                          محاكي النتائج 
                      </h3>
                      <p className="text-sm text-violet-700 mt-1">
                          قم بتغيير العلامات المتوقعة للفصل {targetSemester.replace('s', '')} لرؤية التأثير على معدلات التوجيه والترتيب.
                      </p>
                  </div>
                  <div className="flex gap-2 bg-white rounded-lg p-1 border border-violet-200">
                      <button onClick={() => setTargetSemester('s2')} className={`px-3 py-1 text-sm font-bold rounded ${targetSemester === 's2' ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`}>S2</button>
                      <button onClick={() => setTargetSemester('s3')} className={`px-3 py-1 text-sm font-bold rounded ${targetSemester === 's3' ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`}>S3</button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                  {/* Inputs */}
                  <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 overflow-y-auto">
                      <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">علامات الفصل المتوقعة</h4>
                      <div className="space-y-3">
                          {SUBJECT_ORDER.filter(k => k !== 'avg').map(key => (
                              <div key={key} className="flex justify-between items-center">
                                  <label className="text-sm font-medium text-slate-600">{SUBJECT_LABELS[key]}</label>
                                  <input 
                                      type="number" 
                                      min="0" max="20" step="0.01"
                                      value={simulatedGrades[key] || 0}
                                      onChange={(e) => setSimulatedGrades(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                      className="w-20 px-2 py-1 text-center font-bold border border-slate-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                                  />
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Results */}
                  <div className="lg:col-span-2 space-y-6 overflow-y-auto">
                      
                      {/* Science Projection */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h4 className="font-bold text-lg text-slate-800">جذع مشترك علوم وتكنولوجيا</h4>
                                  <span className="text-xs text-slate-500">المعدل المتوقع بناءً على النقاط المدخلة</span>
                              </div>
                              <div className="text-right">
                                  <div className="text-3xl font-bold text-emerald-600">{projSciScore.toFixed(2)}</div>
                                  <div className={`text-sm font-bold flex items-center justify-end gap-1 ${sciDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {sciDiff > 0 ? '+' : ''}{sciDiff.toFixed(2)}
                                      {sciDiff !== 0 && <TrendingUp size={14} className={sciDiff < 0 ? 'rotate-180' : ''}/>}
                                  </div>
                              </div>
                          </div>
                          
                          {/* Visual Bar */}
                          <div className="space-y-3">
                              <div>
                                  <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-500">المعدل الحالي</span>
                                      <span className="font-bold">{currentGuidance?.scienceScore.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div className="bg-slate-400 h-full" style={{width: `${((currentGuidance?.scienceScore || 0) / 20) * 100}%`}}></div>
                                  </div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-xs mb-1">
                                      <span className="text-emerald-700 font-bold">المعدل المتوقع</span>
                                      <span className="font-bold text-emerald-700">{projSciScore.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full bg-emerald-100 rounded-full h-3 overflow-hidden">
                                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{width: `${(projSciScore / 20) * 100}%`}}></div>
                                  </div>
                              </div>
                          </div>

                          {/* Rank Projection */}
                          {studentsContext && (
                              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                  <span className="text-sm font-medium text-slate-600">الترتيب المتوقع في القسم:</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 line-through">#{currentGuidance?.scienceRank || '-'}</span>
                                      <ArrowRightIcon className="text-slate-300 w-4"/>
                                      <span className="text-lg font-bold text-emerald-700">#{projectedRankSci || '-'}</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Arts Projection */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h4 className="font-bold text-lg text-slate-800">جذع مشترك آداب</h4>
                                  <span className="text-xs text-slate-500">المعدل المتوقع بناءً على النقاط المدخلة</span>
                              </div>
                              <div className="text-right">
                                  <div className="text-3xl font-bold text-rose-600">{projArtsScore.toFixed(2)}</div>
                                  <div className={`text-sm font-bold flex items-center justify-end gap-1 ${artsDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {artsDiff > 0 ? '+' : ''}{artsDiff.toFixed(2)}
                                      {artsDiff !== 0 && <TrendingUp size={14} className={artsDiff < 0 ? 'rotate-180' : ''}/>}
                                  </div>
                              </div>
                          </div>
                          
                          {/* Visual Bar */}
                          <div className="space-y-3">
                              <div>
                                  <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-500">المعدل الحالي</span>
                                      <span className="font-bold">{currentGuidance?.artsScore.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div className="bg-slate-400 h-full" style={{width: `${((currentGuidance?.artsScore || 0) / 20) * 100}%`}}></div>
                                  </div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-xs mb-1">
                                      <span className="text-rose-700 font-bold">المعدل المتوقع</span>
                                      <span className="font-bold text-rose-700">{projArtsScore.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full bg-rose-100 rounded-full h-3 overflow-hidden">
                                      <div className="bg-rose-500 h-full transition-all duration-500" style={{width: `${(projArtsScore / 20) * 100}%`}}></div>
                                  </div>
                              </div>
                          </div>

                          {/* Rank Projection */}
                          {studentsContext && (
                              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                  <span className="text-sm font-medium text-slate-600">الترتيب المتوقع في القسم:</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 line-through">#{currentGuidance?.artsRank || '-'}</span>
                                      <ArrowRightIcon className="text-slate-300 w-4"/>
                                      <span className="text-lg font-bold text-rose-700">#{projectedRankArts || '-'}</span>
                                  </div>
                              </div>
                          )}
                      </div>

                  </div>
              </div>
          </div>
      );
  };

  const renderGradesTable = (data: Record<SubjectKey, number> | undefined, isPast = false) => {
    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Calendar size={32} className="mb-2 opacity-50" />
          <p>لا توجد بيانات لهذا الفصل</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBJECT_ORDER.map(key => {
          if (isPast && key === 'avg') return null;
          const val = data[key];
          const isScienceCore = ['math', 'physics', 'nature'].includes(key);
          const isArtsCore = ['arabic', 'french', 'english', 'historyGeo'].includes(key);
          const appreciation = val !== undefined ? getAppreciation(val) : null;
          
          // Use dynamic passing threshold or default 10
          const threshold = settings?.passingThreshold ?? 10;

          // Special styling for Average
          if (key === 'avg') {
             const isPass = (val || 0) >= threshold;
             return (
               <div key={key} className="col-span-1 md:col-span-2 bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between shadow-lg mt-2">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-white/10 rounded-lg">
                       <Clock size={20} className="text-white"/>
                     </div>
                     <span className="font-bold text-lg">{SUBJECT_LABELS[key]}</span>
                  </div>
                  <div className="flex items-center gap-4">
                      {appreciation && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white`}>
                           {appreciation.label}
                        </span>
                      )}
                      <span className={`text-2xl font-bold font-mono ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {val !== undefined ? val.toFixed(2) : '-'} <span className="text-sm opacity-50 text-white">/20</span>
                      </span>
                  </div>
               </div>
             );
          }

          return (
            <div key={key} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
               <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${isScienceCore ? 'bg-emerald-400' : isArtsCore ? 'bg-rose-400' : 'bg-slate-300'}`}></span>
                  <span className="font-medium text-slate-700 text-sm">{SUBJECT_LABELS[key]}</span>
               </div>
               <div className="flex flex-col items-end">
                   <div className="font-mono font-bold text-slate-800 text-lg">
                      {val !== undefined ? val.toFixed(2) : '-'}<span className="text-xs text-slate-400 ml-0.5">/20</span>
                   </div>
                   {appreciation && (
                       <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${appreciation.color}`}>
                           {appreciation.label}
                       </span>
                   )}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOrientationDetails = () => {
    const orient = orientTab === 'S1' ? student.orientationS1 
                 : orientTab === 'S2' ? student.orientationS2 
                 : student.orientationS3;
                 
    const guidance = orientTab === 'S1' ? student.guidance 
                   : orientTab === 'S2' ? student.guidanceS2 
                   : student.guidanceS3;

    // Helper to get stability if available (S2/S3)
    const stability = (guidance as any)?.stability; 
    const compatibility = orient.compatibility;
    const { choice1, choice2, choice3, choice4, counselorDecision, councilDecision, preliminaryGuidance, admissionsDecision } = orient;
    
    // Calculated text
    const calcText = preliminaryGuidance === 'science' ? 'علوم وتكنولوجيا' : preliminaryGuidance === 'arts' ? 'آداب' : 'غير محدد';

    return (
      <div className="space-y-6">
        {/* Sub-tabs for Semester */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
            {(['S1', 'S2', 'S3'] as const).map(sem => (
                <button
                    key={sem}
                    onClick={() => setOrientTab(sem)}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${orientTab === sem ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {sem === 'S1' ? 'الفصل 1' : sem === 'S2' ? 'الفصل 2' : 'الفصل 3'}
                </button>
            ))}
        </div>

        {/* Compatibility & Stability Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${compatibility === 'comply' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : compatibility === 'not-comply' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                {compatibility === 'comply' ? <CheckCircle2 size={24} className="shrink-0 text-emerald-500" /> : <AlertCircle size={24} className="shrink-0 text-amber-500" />}
                <div>
                    <h4 className="font-bold text-sm">حالة التوافق</h4>
                    <p className="text-xs mt-1 opacity-90">
                    {compatibility === 'comply' 
                        ? 'الرغبة الأولى تتوافق مع التوجيه المحسوب.' 
                        : `الرغبة الأولى (${choice1 || '..'}) لا تطابق التوجيه المحسوب (${calcText}).`
                    }
                    </p>
                </div>
            </div>

            {/* Stability (Only S2/S3) */}
            {orientTab !== 'S1' && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${stability === 'stable' ? 'bg-blue-50 border-blue-100 text-blue-800' : stability === 'unstable' ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <Compass size={24} className={`shrink-0 ${stability === 'stable' ? 'text-blue-500' : stability === 'unstable' ? 'text-orange-500' : 'text-slate-400'}`} />
                    <div>
                        <h4 className="font-bold text-sm">استقرار الرغبة</h4>
                        <p className="text-xs mt-1 opacity-90">
                        {stability === 'stable' 
                            ? 'الرغبة الأولى ثابتة مقارنة بالفصل السابق.' 
                            : stability === 'unstable' ? 'تغيرت الرغبة الأولى مقارنة بالفصل السابق.' : 'لا توجد بيانات كافية للمقارنة.'
                        }
                        </p>
                    </div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
               <span>رغبات التلميذ ({orientTab})</span>
               <span className="text-xs bg-slate-200 px-2 py-1 rounded">توجيه أولي: {calcText}</span>
             </div>
             <div className="p-4 space-y-3">
               {[choice1, choice2, choice3, choice4].map((choice, idx) => (
                 <div key={idx} className="flex items-center gap-3">
                   <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                     {idx + 1}
                   </span>
                   <span className="text-slate-800 text-sm font-medium">{choice || '-'}</span>
                 </div>
               ))}
             </div>
           </div>

           <div className="space-y-4">
             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
               <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 font-bold text-blue-800">
                 اقتراح المستشار
               </div>
               <div className="p-4 font-medium text-slate-800">
                 {counselorDecision || 'لم يتم التسجيل'}
               </div>
             </div>

             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
               <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 font-bold text-purple-800">
                 قرار المجلس
               </div>
               <div className="p-4 font-medium text-slate-800">
                 {councilDecision || 'لم يتم التسجيل'}
               </div>
             </div>

             {orientTab === 'S3' && (
                 <div className="bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                    <div className="bg-emerald-100/50 px-4 py-3 border-b border-emerald-200 font-bold text-emerald-900 flex items-center gap-2">
                        <School size={18}/>
                        قرار مجلس القبول (النهائي)
                    </div>
                    <div className="p-4 font-bold text-lg text-emerald-800">
                        {admissionsDecision || 'لم يتم اتخاذ القرار النهائي بعد'}
                    </div>
                 </div>
             )}
           </div>
        </div>
      </div>
    );
  };

  const renderTrajectoryChart = () => {
    // Collect available points
    const points = [
      { name: 'S1', label: 'الفصل 1', science: student.guidance?.scienceScore, arts: student.guidance?.artsScore },
      { name: 'S2', label: 'الفصل 2', science: student.guidanceS2?.scienceScore, arts: student.guidanceS2?.artsScore },
      { name: 'S3', label: 'الفصل 3', science: student.guidanceS3?.scienceScore, arts: student.guidanceS3?.artsScore },
    ];

    const availablePoints = points.filter(p => p.science !== undefined || p.arts !== undefined);

    if (availablePoints.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <TrendingUp size={32} className="mb-2 opacity-50" />
          <p>لا توجد بيانات كافية لعرض المسار الدراسي</p>
        </div>
      );
    }

    // SVG Config
    const width = 600;
    const height = 300;
    const paddingX = 60;
    const paddingY = 40;
    
    const maxY = 20;
    const minY = 0;

    const getX = (index: number) => paddingX + (index * (width - 2 * paddingX) / 2);
    const getY = (val: number) => height - paddingY - ((val - minY) / (maxY - minY)) * (height - 2 * paddingY);

    const getPath = (field: 'science' | 'arts') => {
       return points.map((p, i) => {
         const val = p[field];
         if (val === undefined) return null;
         return `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`;
       }).filter(Boolean).join(' ');
    };

    // Calculate Trend
    const lastPoint = availablePoints[availablePoints.length - 1];
    const firstPoint = availablePoints[0];
    
    const getTrend = (field: 'science' | 'arts') => {
        if (!lastPoint || !firstPoint || lastPoint === firstPoint) return null;
        const diff = (lastPoint[field] || 0) - (firstPoint[field] || 0);
        return diff;
    };

    const sciTrend = getTrend('science');
    const artsTrend = getTrend('arts');

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                       <TrendingUp className="text-primary-600" size={20}/>
                       تطور معدلات التوجيه
                   </h3>
                   <div className="flex gap-4 text-sm font-bold">
                       <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">
                           <span className="w-2 h-2 rounded-md bg-emerald-500"></span> علوم
                       </div>
                       <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                           <span className="w-2 h-2 rounded-md bg-blue-500"></span> آداب
                       </div>
                   </div>
                </div>

                <div className="relative w-full aspect-[3/1] min-h-[300px]">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        {/* Grid Lines */}
                        {[0, 5, 10, 15, 20].map(val => (
                            <g key={val}>
                                <line x1={paddingX} y1={getY(val)} x2={width - paddingX} y2={getY(val)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={paddingX - 10} y={getY(val) + 4} textAnchor="end" fontSize="12" fill="#94a3b8" fontWeight="500">{val}</text>
                            </g>
                        ))}

                        {/* X Axis Labels */}
                        {points.map((p, i) => (
                            <g key={i}>
                                <text x={getX(i)} y={height - 10} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{p.label}</text>
                                <line x1={getX(i)} y1={height - paddingY} x2={getX(i)} y2={height - paddingY + 5} stroke="#cbd5e1" strokeWidth="1" />
                            </g>
                        ))}

                        {/* Science Line */}
                        <path d={getPath('science')} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Arts Line */}
                        <path d={getPath('arts')} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Dots & Labels */}
                        {points.map((p, i) => (
                            <g key={i}>
                                {p.science !== undefined && (
                                    <g>
                                        <circle cx={getX(i)} cy={getY(p.science)} r="5" fill="white" stroke="#10b981" strokeWidth="2" />
                                        <rect x={getX(i) - 18} y={getY(p.science) - 30} width="36" height="20" rx="4" fill="#10b981" />
                                        <text x={getX(i)} y={getY(p.science) - 16} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{p.science.toFixed(2)}</text>
                                    </g>
                                )}
                                {p.arts !== undefined && (
                                    <g>
                                        <circle cx={getX(i)} cy={getY(p.arts)} r="5" fill="white" stroke="#f43f5e" strokeWidth="2" />
                                        <rect x={getX(i) - 18} y={getY(p.arts) - 30} width="36" height="20" rx="4" fill="#f43f5e" />
                                        <text x={getX(i)} y={getY(p.arts) - 16} textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{p.arts.toFixed(2)}</text>
                                    </g>
                                )}
                            </g>
                        ))}
                    </svg>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${sciTrend && sciTrend > 0 ? 'bg-emerald-50 border-emerald-100' : sciTrend && sciTrend < 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className="font-bold text-slate-700 mb-2">تحليل مسار العلوم</h4>
                    {sciTrend !== null ? (
                        <p className="text-xs">
                            {sciTrend > 0 
                                ? `هناك تحسن في مستوى العلوم بمقدار +${sciTrend.toFixed(2)} نقطة.` 
                                : sciTrend < 0 
                                    ? `تراجع في مستوى العلوم بمقدار ${sciTrend.toFixed(2)} نقطة.` 
                                    : 'مستوى العلوم مستقر تماماً.'
                            }
                        </p>
                    ) : <p className="text-sm text-slate-400">لا توجد بيانات كافية للمقارنة.</p>}
                </div>

                <div className={`p-4 rounded-xl border ${artsTrend && artsTrend > 0 ? 'bg-emerald-50 border-emerald-100' : artsTrend && artsTrend < 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className="font-bold text-slate-700 mb-2">تحليل مسار الآداب</h4>
                    {artsTrend !== null ? (
                        <p className="text-xs">
                            {artsTrend > 0 
                                ? `هناك تحسن في مستوى الآداب بمقدار +${artsTrend.toFixed(2)} نقطة.` 
                                : artsTrend < 0 
                                    ? `تراجع في مستوى الآداب بمقدار ${artsTrend.toFixed(2)} نقطة.` 
                                    : 'مستوى الآداب مستقر تماماً.'
                            }
                        </p>
                    ) : <p className="text-sm text-slate-400">لا توجد بيانات كافية للمقارنة.</p>}
                </div>
            </div>
        </div>
    );
  };

  const renderNotes = () => {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Add Note Section */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-2">إضافة ملاحظة جديدة أو تقرير مقابلة</label>
          <div className="flex flex-col gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="اكتب تفاصيل المقابلة أو الملاحظة هنا..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none min-h-[100px] resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                <Send size={16} className="ml-2"/> حفظ الملاحظة
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Timeline */}
        <div className="flex-1 overflow-y-auto">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-slate-500"/>
              سجل الملاحظات ({student.notes?.length || 0})
           </h3>
           
           {!student.notes || student.notes.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <MessageSquare size={24} className="mb-2 opacity-30" />
                <p className="text-sm">لا توجد ملاحظات مسجلة بعد.</p>
             </div>
           ) : (
             <div className="space-y-4 relative before:absolute before:top-0 before:bottom-0 before:right-[15px] before:w-[2px] before:bg-slate-200">
                {student.notes.map((note) => (
                  <div key={note.id} className="relative pr-8 animate-in slide-in-from-right-2">
                     <div className="absolute right-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-primary-200 flex items-center justify-center z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500"></div>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-primary-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {new Date(note.date).toLocaleString('ar-DZ')}
                           </span>
                           {/* Potentially add author or delete button here */}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                          {note.content}
                        </p>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header - Order swapped for correct RTL visual flow (Right: Info, Left: Buttons) */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          
          {/* Info Section (First in HTML = Right in RTL) */}
          <div className="text-right">
            <div className='flex gap-2'>
              <UserCircle size={24} className='text-blue-400'/>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">{student.fullName}</h2>
            </div>
            <div className="flex items-center justify-start gap-2 text-xs text-slate-500 mt-2 mr-8">
              {student.isRepeater && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">معيد</span>}
              <span>{student.gender}</span>
              <span>•</span>
              <span className="font-mono">{student.birthDate}</span>
            </div>
          </div>

          {/* Buttons Section (Second in HTML = Left in RTL) */}
          <div className="flex items-center gap-4">
              {/* Navigation */}
              {currentIndex !== undefined && totalCount !== undefined && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                   <button 
                     onClick={onPrev} 
                     disabled={currentIndex <= 1}
                     className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                     title="السابق"
                   >
                     <ChevronRight size={18} />
                   </button>
                   <span className="text-xs font-bold text-slate-600 min-w-[60px] text-center font-mono">
                      {currentIndex} / {totalCount}
                   </span>
                   <button 
                     onClick={onNext} 
                     disabled={currentIndex >= totalCount}
                     className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                     title="التالي"
                   >
                     <ChevronLeft size={18} />
                   </button>
                </div>
              )}

              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
          </div>
          
        </div>

        {/* Enhanced Tabs Navigation - Redesigned with grouped academic tabs */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 shadow-sm">
          <div className="flex">
            <div className="grid grid-cols-5 flex space-x-2 space-x-reverse">
              {/* RECOMMENDATION Tab - First Tab */}
              
              <button
                onClick={() => setActiveTab('RECOMMENDATION')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'RECOMMENDATION' 
                    ? 'text-emerald-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'RECOMMENDATION' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-emerald-600 rounded-full"></div>
                )}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                التوصية
                {activeTab === 'RECOMMENDATION' && (
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                )}
              </button>
              
              {/* ACADEMIC Tab - Grouping S1, S2, S3, PAST */}
              <div className="relative group">
                <button
                  onClick={() => setActiveTab('ACADEMIC')}
                  className={`
                    relative px-4 py-3 text-sm font-medium transition-all duration-200
                    flex items-center gap-2 whitespace-nowrap justify-center
                    ${activeTab === 'ACADEMIC' || ['S1', 'S2', 'S3', 'PAST'].includes(activeTab)
                      ? 'text-blue-600' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }
                  `}
                >
                  {(['S1', 'S2', 'S3', 'PAST'].includes(activeTab) || activeTab === 'ACADEMIC') && (
                    <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></div>
                  )}
                  <BookOpen size={16} className={(['S1', 'S2', 'S3', 'PAST'].includes(activeTab) || activeTab === 'ACADEMIC') ? 'text-blue-600' : 'text-slate-400'} />
                  <div className="flex items-center gap-1">
                    المواد الدراسية
                    <ChevronDown size={14} className={`transition-transform ${['S1', 'S2', 'S3', 'PAST'].includes(activeTab) || activeTab === 'ACADEMIC' ? 'rotate-180' : ''}`} />
                  </div>
                  {(['S1', 'S2', 'S3', 'PAST'].includes(activeTab) || activeTab === 'ACADEMIC') && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  )}
                </button>
                
                {/* Academic Dropdown */}
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                  {(['S1', 'S2', 'S3', 'PAST'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        w-full px-4 py-3 text-sm text-right transition-colors
                        flex items-center justify-between
                        hover:bg-slate-50 border-b border-slate-100 last:border-b-0
                        ${activeTab === tab ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {tab === 'PAST' ? (
                          <Clock size={14} />
                        ) : (
                          <FileText size={14} />
                        )}
                        {tab === 'PAST' ? 'الماضي الدراسي' : `الفصل ${tab.replace('S', '')}`}
                      </div>
                      {activeTab === tab && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* TRAJECTORY Tab */}
              <button
                onClick={() => setActiveTab('TRAJECTORY')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'TRAJECTORY' 
                    ? 'text-purple-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'TRAJECTORY' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-purple-600 rounded-full"></div>
                )}
                <TrendingUp size={16} className={activeTab === 'TRAJECTORY' ? 'text-purple-600' : 'text-slate-400'} />
                المسار الدراسي
                {activeTab === 'TRAJECTORY' && (
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                )}
              </button>
              
              {/* SIMULATOR Tab */}
              <button
                onClick={() => setActiveTab('SIMULATOR')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'SIMULATOR' 
                    ? 'text-amber-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'SIMULATOR' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-amber-600 rounded-full"></div>
                )}
                <Calculator size={16} className={activeTab === 'SIMULATOR' ? 'text-amber-600' : 'text-slate-400'} />
                محاكي النتائج
                {activeTab === 'SIMULATOR' && (
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                )}
              </button>
              
              {/* NOTES Tab */}
              <button
                onClick={() => setActiveTab('NOTES')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'NOTES' 
                    ? 'text-rose-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'NOTES' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-rose-600 rounded-full"></div>
                )}
                <MessageSquare size={16} className={activeTab === 'NOTES' ? 'text-rose-600' : 'text-slate-400'} />
                <div className="flex items-center gap-1">
                  ملاحظات
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'NOTES' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {student.notes?.length || 0}
                  </span>
                </div>
                {activeTab === 'NOTES' && (
                  <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></div>
                )}
              </button>
            </div>
          </div>
          
          {/* Active tab indicator */}
          <div className="bg-slate-100 relative">
            <div className={`h-full absolute  top-0 transition-all duration-300 ease-out ${
              activeTab === 'RECOMMENDATION' ? 'w-40 right-0 bg-emerald-600' :
              activeTab === 'ACADEMIC' || ['S1', 'S2', 'S3', 'PAST'].includes(activeTab) ? 'w-40 right-28 bg-blue-600' :
              activeTab === 'TRAJECTORY' ? 'w-32 right-68 bg-purple-600' :
              activeTab === 'SIMULATOR' ? 'w-36 right-[100] bg-amber-600' :
              activeTab === 'NOTES' ? 'w-32 right-[136] bg-rose-600' : ''
            }`}></div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="">
          {/* RECOMMENDATION Tab Content */}
          {activeTab === 'RECOMMENDATION' && (
            <div className="bg-slate-50 rounded-xl border border-slate-200">
              {/* Guidance Summary */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Science Stream Card */}
                  <div className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden">
                    {/* Status Indicator */}
                    <div className={`absolute top-0 right-0 w-1 h-full ${student.guidance.scienceScore >= student.guidance.artsScore ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    
                    {/* Header with icon */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">جذع مشترك علوم</h3>
                          <p className="text-xs text-slate-500">تخصصات علمية وتكنولوجية</p>
                        </div>
                      </div>
                      
                      {/* Recommendation Badge - Show if science score is higher */}
                      {student.guidance.scienceScore >= student.guidance.artsScore && (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-semibold">مُوصى به</span>
                        </div>
                      )}
                    </div>

                    {/* Scores Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">المعدل المحسوب</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-slate-500">20/</span>
                          <span className="text-2xl font-bold text-slate-900">{student.guidance.scienceScore.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">الترتيب العام</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-green-600">#{student.guidance.scienceRank}</span>
                          <span className="text-sm text-slate-500">من {student.guidance.scienceRank + (student.guidance.artsRank > student.guidance.scienceRank ? student.guidance.artsRank - student.guidance.scienceRank : 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>ضعيف</span>
                        <span>جيد</span>
                        <span>ممتاز</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (student.guidance.scienceScore / 20) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Arts Stream Card */}
                  <div className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden">
                    {/* Status Indicator */}
                    <div className={`absolute top-0 right-0 w-1 h-full ${student.guidance.artsScore > student.guidance.scienceScore ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                    
                    {/* Header with icon */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">جذع مشترك آداب</h3>
                          <p className="text-xs text-slate-500">تخصصات أدبية واجتماعية</p>
                        </div>
                      </div>
                      
                      {/* Recommendation Badge - Show if arts score is higher */}
                      {student.guidance.artsScore > student.guidance.scienceScore && (
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-semibold">مُوصى به</span>
                        </div>
                      )}
                    </div>

                    {/* Scores Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">المعدل المحسوب</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-slate-500">20/</span>
                          <span className="text-2xl font-bold text-slate-900">{student.guidance.artsScore.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">الترتيب العام</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-blue-600">#{student.guidance.artsRank}</span>
                          <span className="text-sm text-slate-500">من {student.guidance.artsRank + (student.guidance.scienceRank > student.guidance.artsRank ? student.guidance.scienceRank - student.guidance.artsRank : 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>ضعيف</span>
                        <span>جيد</span>
                        <span>ممتاز</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (student.guidance.artsScore / 20) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendation Summary - Show only when there's a clear recommendation */}
                {student.guidance.scienceScore !== student.guidance.artsScore && (
                  <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">التوصية النهائية</h4>
                          <p className="text-sm text-slate-500">بناءً على نتائج التحليل</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-bold text-lg ${student.guidance.scienceScore >= student.guidance.artsScore ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {student.guidance.scienceScore >= student.guidance.artsScore ? 'جذع مشترك علوم' : 'جذع مشترك آداب'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACADEMIC Tab Content - This would show when ACADEMIC is selected or individual semester tabs */}
          {(['S1', 'S2', 'S3', 'PAST'].includes(activeTab) || activeTab === 'ACADEMIC') && (
            <div className="bg-white px-8 py-6">
              
              {/* Semester Navigation */}
              <div className="flex gap-2 grid grid-cols-4">
                {(['S1', 'S2', 'S3', 'PAST'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'PAST' ? 'الماضي الدراسي' : `الفصل ${tab.replace('S', '')}`}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {activeTab === 'S1' && renderGradesTable(student.s1)}
          {activeTab === 'S2' && renderGradesTable(student.s2)}
          {activeTab === 'S3' && renderGradesTable(student.s3)}
          {activeTab === 'PAST' && renderGradesTable(student.past, true)}
          {activeTab === 'ORIENT' && renderOrientationDetails()}
          {activeTab === 'TRAJECTORY' && renderTrajectoryChart()}
          {activeTab === 'SIMULATOR' && renderSimulator()}
          {activeTab === 'NOTES' && renderNotes()}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <Button onClick={onClose} size="md">
            إغلاق
          </Button>
        </div>

      </div>
    </div>
  );
};

// Helper Icon
const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
