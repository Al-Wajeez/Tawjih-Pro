
import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User, Award, AlertCircle, CheckCircle2, GraduationCap, Gavel, Scale, School, Edit, BookOpen, Compass, Calculator, Sun, Moon } from 'lucide-react';
import { ConsolidatedStudent, GuidanceSettings, SubjectKey } from '../types';

interface ClassCouncilModeProps {
  students: ConsolidatedStudent[];
  settings: GuidanceSettings;
  semester: 'S1' | 'S2' | 'S3';
  onClose: () => void;
  onUpdate: (student: ConsolidatedStudent) => void;
}

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  arabic: 'اللغة العربية',
  french: 'اللغة الفرنسية',
  english: 'اللغة الإنجليزية',
  historyGeo: 'التاريخ والجغرافيا',
  math: 'الرياضيات',
  nature: 'العلوم الطبيعية',
  physics: 'الفيزياء',
  avg: 'المعدل الفصلي'
};

const SUBJECT_ORDER: SubjectKey[] = ['math', 'physics', 'nature', 'arabic', 'french', 'english', 'historyGeo'];

export const ClassCouncilMode: React.FC<ClassCouncilModeProps> = ({
  students,
  settings,
  semester,
  onClose,
  onUpdate
}) => {
  const [activeId, setActiveId] = useState<string>(students[0]?.id || '');
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<'guidance' | 'grades'>('guidance');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // State for S3 to toggle between editing Council vs Admissions decision
  const [s3EditTarget, setS3EditTarget] = useState<'council' | 'admissions'>('admissions');

  const currentIndex = students.findIndex(s => s.id === activeId);
  const student = students[currentIndex === -1 ? 0 : currentIndex];

  // Reset tab when student changes
  useEffect(() => {
      setActiveTab('guidance');
  }, [activeId]);

  // Keyboard Navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      handlePrev();
    } else if (e.key === 'ArrowLeft') {
      handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [currentIndex, students.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveId(students[currentIndex + 1].id);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveId(students[currentIndex - 1].id);
        setIsAnimating(false);
      }, 200);
    }
  };

  if (!student) return null;

  const activeSemester = semester; // Strict use of prop
  const semKey = activeSemester.toLowerCase() as 's1' | 's2' | 's3';

  const handleDecision = (decision: string) => {
    let updatedStudent = { ...student };

    if (activeSemester === 'S3') {
        if (s3EditTarget === 'admissions') {
            updatedStudent.orientationS3 = { ...student.orientationS3, admissionsDecision: decision };
        } else {
            updatedStudent.orientationS3 = { ...student.orientationS3, councilDecision: decision };
        }
    } else if (activeSemester === 'S2') {
        updatedStudent.orientationS2 = { ...student.orientationS2, councilDecision: decision };
    } else {
        updatedStudent.orientationS1 = { ...student.orientationS1, councilDecision: decision };
    }
    
    onUpdate(updatedStudent);
    // Removed handleNext() to stay on the same student as requested
  };

  // Helpers for display
  const avg = activeSemester === 'S3' ? (student.s1?.avg && student.s2?.avg && student.s3?.avg ? (student.s1.avg + student.s2.avg + student.s3.avg)/3 : student.s3?.avg)
            : activeSemester === 'S2' ? (student.s1?.avg && student.s2?.avg ? (student.s1.avg + student.s2.avg)/2 : student.s2?.avg) 
            : student.s1?.avg;
            
  const avgLabel = activeSemester === 'S3' ? 'المعدل السنوي' : activeSemester === 'S2' ? 'معدل الفصلين' : 'معدل الفصل 1';

  // S3 Transition Average Calculation
  let transitionAvg: number | null = null;
  if (activeSemester === 'S3') {
      const bem = student.bemGrade || 0;
      if (bem >= 10) {
          transitionAvg = bem;
      } else {
          transitionAvg = ((avg || 0) + bem) / 2;
      }
  }

  const choice = activeSemester === 'S3' ? student.orientationS3.choice1 
               : activeSemester === 'S2' ? student.orientationS2.choice1 
               : student.orientationS1.choice1 || 'غير محدد';

  const calcGuidance = activeSemester === 'S3' ? student.guidanceS3?.preliminaryGuidance 
                     : activeSemester === 'S2' ? student.guidanceS2?.preliminaryGuidance 
                     : student.guidance.preliminaryGuidance;

  const isMatch = activeSemester === 'S3' ? student.orientationS3.compatibility === 'comply' 
                : activeSemester === 'S2' ? student.orientationS2.compatibility === 'comply' 
                : student.orientationS1.compatibility === 'comply';
  
  // Decisions Display
  const currentCounselorDecision = activeSemester === 'S3' ? student.orientationS3.counselorDecision 
                                 : activeSemester === 'S2' ? student.orientationS2.counselorDecision 
                                 : student.orientationS1.counselorDecision;

  const currentCouncilDecision = activeSemester === 'S3' ? student.orientationS3.councilDecision 
                               : activeSemester === 'S2' ? student.orientationS2.councilDecision 
                               : student.orientationS1.councilDecision;

  const admissionsDecision = student.orientationS3.admissionsDecision;

  // Scores
  const scienceScore = activeSemester === 'S3' ? student.guidanceS3?.scienceScore 
                     : activeSemester === 'S2' ? student.guidanceS2?.scienceScore 
                     : student.guidance.scienceScore;
  const scienceRank = activeSemester === 'S3' ? student.guidanceS3?.scienceRank 
                    : activeSemester === 'S2' ? student.guidanceS2?.scienceRank 
                    : student.guidance.scienceRank;

  const artsScore = activeSemester === 'S3' ? student.guidanceS3?.artsScore 
                  : activeSemester === 'S2' ? student.guidanceS2?.artsScore 
                  : student.guidance.artsScore;
  const artsRank = activeSemester === 'S3' ? student.guidanceS3?.artsRank 
                 : activeSemester === 'S2' ? student.guidanceS2?.artsRank 
                 : student.guidance.artsRank;

  // Determine Highlighting Colors
  const scoreColor = (avg || 0) >= 10 ? 'text-emerald-400' : 'text-rose-400';
  const guidanceColor = calcGuidance === 'science' ? 'text-emerald-400' : 'text-rose-400';

  const renderGrades = () => {
      const grades = student[semKey];
      if (!grades) {
          return (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <AlertCircle size={48} className="mb-2 opacity-50"/>
                  <p>لا توجد علامات متوفرة لهذا الفصل</p>
              </div>
          );
      }

      return (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 h-full overflow-y-auto">
              {SUBJECT_ORDER.map(key => {
                  const val = grades[key];
                  const isGood = (val || 0) >= 10;
                  return (
                      <div key={key} className={`${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-100 border-slate-200'} p-4 rounded-xl border flex justify-between items-center`}>
                          <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-bold text-lg`}>{SUBJECT_LABELS[key]}</span>
                          <span className={`text-2xl font-mono font-bold ${isGood ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-rose-400'}`}>
                              {val !== undefined ? val.toFixed(2) : '-'}
                          </span>
                      </div>
                  );
              })}
              {/* Semester Average Box */}
              <div className={`${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-200 border-slate-300'} col-span-2 p-4 rounded-xl border mt-2 flex justify-between items-center`}>
                  <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-bold text-lg`}>معدل الفصل {activeSemester.replace('S', '')}</span>
                  <span className={`text-3xl font-mono font-bold ${grades.avg >= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {grades.avg?.toFixed(2) || '-'}
                  </span>
              </div>
          </div>
      );
  };

  return (
    <div className={`fixed inset-0 z-[100] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} flex flex-col overflow-hidden transition-colors duration-300`}>
      
      {/* Top Bar */}
      <div className={`h-16 border-b ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'} flex justify-between items-center px-6 backdrop-blur-md`}>
        <div className="flex items-center gap-4">
           <div className="bg-primary-600 p-2 rounded-lg"><Gavel size={24} className="text-white"/></div>
           <div>
             <h1 className="font-bold text-xl tracking-wide">مجلس القسم / التوجيه ({activeSemester})</h1>
             <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{settings.profileName} • {student.classCode || 'قسم غير محدد'}</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-amber-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={isDarkMode ? 'الوضع المضيء' : 'الوضع الليلي'}
           >
              {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
           </button>
           <span className={`font-mono text-xl font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
             {currentIndex + 1} <span className={`text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>/ {students.length}</span>
           </span>
           <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
             <X size={24} />
           </button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
         
         {/* Navigation Buttons (Floating) */}
         <button 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className={`absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all z-10 ${isDarkMode ? 'bg-slate-800/50 hover:bg-primary-600 text-slate-400 hover:text-white' : 'bg-white shadow-lg hover:bg-primary-600 text-slate-400 hover:text-white'} disabled:opacity-0`}
         >
            <ChevronLeft size={48} />
         </button>
         <button 
            onClick={handleNext} 
            disabled={currentIndex === students.length - 1}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all z-10 ${isDarkMode ? 'bg-slate-800/50 hover:bg-primary-600 text-slate-400 hover:text-white' : 'bg-white shadow-lg hover:bg-primary-600 text-slate-400 hover:text-white'} disabled:opacity-0`}
         >
            <ChevronRight size={48} />
         </button>

         {/* Student Card */}
         <div className={`w-full max-w-6xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col md:flex-row transition-all duration-300 transform ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            
            {/* Left: Identity & Academic Profile */}
            <div className={`w-full md:w-1/3 p-8 flex flex-col border-l ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col items-center text-center mb-8">
                    <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-4 shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                        <User size={64} className={isDarkMode ? 'text-slate-500' : 'text-slate-300'} />
                    </div>
                    <h2 className={`text-3xl font-bold mb-2 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.fullName}</h2>
                    <div className={`flex items-center gap-2 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>{student.birthDate}</span>
                        <span>•</span>
                        <span>{student.gender}</span>
                    </div>
                    {student.isRepeater && (
                        <span className="mt-3 px-4 py-1 bg-amber-900/30 text-amber-500 border border-amber-800/50 rounded-full text-sm font-bold">
                            معيد (مكرر)
                        </span>
                    )}
                </div>

                <div className="space-y-6 mt-auto">
                    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'} p-4 rounded-xl border`}>
                        <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm mb-1 flex items-center gap-2`}><Award size={16}/> {avgLabel}</div>
                        <div className={`text-5xl font-bold font-mono ${scoreColor}`}>{avg?.toFixed(2) || '-'}</div>
                    </div>
                    
                    {/* BEM Grade - Strict S3 check */}
                    {activeSemester === 'S3' && (
                        <>
                            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'} p-4 rounded-xl border`}>
                                <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm mb-1 flex items-center gap-2`}><GraduationCap size={16}/> معدل الشهادة (BEM)</div>
                                <div className={`text-4xl font-bold font-mono ${student.bemGrade && student.bemGrade >= 10 ? 'text-emerald-400' : (isDarkMode ? 'text-slate-600' : 'text-slate-300')}`}>
                                    {student.bemGrade ? student.bemGrade.toFixed(2) : '---'}
                                </div>
                            </div>

                            {/* Transition Average */}
                            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'} p-4 rounded-xl border relative overflow-hidden`}>
                                <div className={`absolute top-0 right-0 w-1.5 h-full ${transitionAvg && transitionAvg >= 10 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm mb-1 flex items-center gap-2`}><Calculator size={16}/> معدل الإنتقال (القبول)</div>
                                <div className="flex items-baseline justify-between">
                                    <div className={`text-4xl font-bold font-mono ${transitionAvg && transitionAvg >= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {transitionAvg !== null ? transitionAvg.toFixed(2) : '-'}
                                    </div>
                                    {transitionAvg !== null && transitionAvg >= 10 && (
                                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-bold border border-emerald-500/30">
                                            مقبول
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Guidance Data & Decisions */}
            <div className="flex-1 p-8 flex flex-col h-full overflow-hidden">
                
                {/* View Toggles */}
                <div className={`flex gap-2 mb-6 p-1 rounded-xl w-fit self-start ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                    <button 
                        onClick={() => setActiveTab('guidance')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'guidance' ? 'bg-primary-600 text-white shadow' : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                    >
                        <Compass size={16}/> التوجيه والقرار
                    </button>
                    <button 
                        onClick={() => setActiveTab('grades')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'grades' ? 'bg-primary-600 text-white shadow' : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                    >
                        <BookOpen size={16}/> كشف النقاط
                    </button>
                </div>

                {activeTab === 'grades' ? (
                    renderGrades()
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            {/* Science Score */}
                            <div className={`p-5 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-emerald-400 font-bold text-lg">علوم وتكنولوجيا</span>
                                    <span className={`text-3xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{scienceScore?.toFixed(2) || '-'}</span>
                                </div>
                                <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                    <div className="bg-emerald-500 h-full" style={{width: `${((scienceScore || 0)/20)*100}%`}}></div>
                                </div>
                                <div className={`mt-2 text-right text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>الترتيب: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>#{scienceRank || '-'}</span></div>
                            </div>

                            {/* Arts Score */}
                            <div className={`p-5 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-rose-400 font-bold text-lg">آداب</span>
                                    <span className={`text-3xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{artsScore?.toFixed(2) || '-'}</span>
                                </div>
                                <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                    <div className="bg-rose-500 h-full" style={{width: `${((artsScore || 0)/20)*100}%`}}></div>
                                </div>
                                <div className={`mt-2 text-right text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>الترتيب: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>#{artsRank || '-'}</span></div>
                            </div>
                        </div>

                        {/* Guidance Context Grid - Dynamic based on Semester */}
                        {activeSemester === 'S3' ? (
                            // S3 Layout: Includes Class Council AND Final Admissions
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {/* Row 1 */}
                                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-bold mb-1`}>رغبة التلميذ</div>
                                    <div className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={choice}>{choice}</div>
                                </div>
                                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-bold mb-1`}>التوجيه المحسوب</div>
                                    <div className={`text-lg font-bold ${guidanceColor}`}>
                                        {calcGuidance === 'science' ? 'علوم وتكنولوجيا' : calcGuidance === 'arts' ? 'آداب' : 'غير محدد'}
                                    </div>
                                </div>

                                {/* Row 2: Counselor */}
                                <div className={`p-3 rounded-xl border col-span-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-bold mb-1`}>اقتراح المستشار</div>
                                    <div className="text-lg font-bold text-blue-400 truncate" title={currentCounselorDecision}>{currentCounselorDecision || '-'}</div>
                                </div>
                                
                                {/* Row 3: Decision Targets (Clickable to switch mode) */}
                                <div 
                                    onClick={() => setS3EditTarget('council')}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${s3EditTarget === 'council' ? 'bg-amber-900/30 border-amber-500 ring-2 ring-amber-500/50' : (isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-400 shadow-sm')}`}
                                >
                                    <div className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} text-xs font-bold mb-1 flex items-center gap-1`}>
                                        <Gavel size={12}/> قرار مجلس القسم
                                        {s3EditTarget === 'council' && <span className="bg-amber-500 text-black text-[9px] px-1 rounded ml-auto">نشط للتعديل</span>}
                                    </div>
                                    <div className="text-lg font-bold text-yellow-500 truncate">{currentCouncilDecision || 'لم يتخذ بعد'}</div>
                                </div>

                                <div 
                                    onClick={() => setS3EditTarget('admissions')}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${s3EditTarget === 'admissions' ? 'bg-purple-900/30 border-purple-500 ring-2 ring-purple-500/50' : (isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-400 shadow-sm')}`}
                                >
                                    <div className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} text-xs font-bold mb-1 flex items-center gap-1`}>
                                        <School size={12}/> قرار مجلس القبول (النهائي)
                                        {s3EditTarget === 'admissions' && <span className="bg-purple-500 text-white text-[9px] px-1 rounded ml-auto">نشط للتعديل</span>}
                                    </div>
                                    <div className="text-lg font-bold text-purple-600 truncate">{admissionsDecision || '---'}</div>
                                </div>
                            </div>
                        ) : (
                            // S1/S2 Layout (Original)
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-bold mb-1`}>رغبة التلميذ</div>
                                    <div className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={choice}>{choice}</div>
                                </div>
                                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-bold mb-1`}>التوجيه المحسوب</div>
                                    <div className={`text-lg font-bold ${guidanceColor}`}>
                                        {calcGuidance === 'science' ? 'علوم وتكنولوجيا' : calcGuidance === 'arts' ? 'آداب' : 'غير محدد'}
                                    </div>
                                </div>
                                <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-bold mb-1`}>اقتراح المستشار</div>
                                    <div className="text-lg font-bold text-blue-400 truncate" title={currentCounselorDecision}>{currentCounselorDecision || '-'}</div>
                                </div>
                                <div className={`p-3 rounded-xl border shadow-inner ${isDarkMode ? 'bg-slate-700 border-slate-500' : 'bg-slate-100 border-slate-300'}`}>
                                    <div className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} text-xs font-bold mb-1 flex items-center gap-1`}><Gavel size={12}/> قرار مجلس القسم</div>
                                    <div className="text-lg font-bold text-yellow-500 truncate">{currentCouncilDecision || 'لم يتخذ بعد'}</div>
                                </div>
                            </div>
                        )}

                        {/* Compatibility Banner */}
                        <div className={`mb-6 rounded-xl p-3 flex items-center justify-center gap-3 border ${isMatch ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                            {isMatch ? <CheckCircle2 className="text-emerald-500" size={24} /> : <AlertCircle className="text-rose-500" size={24} />}
                            <span className={`font-bold text-sm ${isMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isMatch ? 'منسجم: الرغبة تتوافق مع النتائج' : 'غير منسجم: الرغبة لا تتوافق مع النتائج'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto">
                            <div className="flex justify-between items-end mb-3">
                                <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {activeSemester === 'S3' 
                                        ? (s3EditTarget === 'admissions' ? 'اتخاذ قرار مجلس القبول (النهائي):' : 'اتخاذ قرار مجلس القسم:')
                                        : 'اتخاذ قرار مجلس القسم:'
                                    }
                                </div>
                                
                                {/* Toggle Helper for S3 */}
                                {activeSemester === 'S3' && (
                                    <div className={`flex rounded-lg p-1 text-[10px] ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                        <button 
                                            onClick={() => setS3EditTarget('council')}
                                            className={`px-2 py-1 rounded transition-colors ${s3EditTarget === 'council' ? 'bg-amber-600 text-white' : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700')}`}
                                        >
                                            مجلس القسم
                                        </button>
                                        <button 
                                            onClick={() => setS3EditTarget('admissions')}
                                            className={`px-2 py-1 rounded transition-colors ${s3EditTarget === 'admissions' ? 'bg-purple-600 text-white' : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700')}`}
                                        >
                                            مجلس القبول
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-5 gap-3 h-14">
                                <button 
                                    onClick={() => handleDecision('جذع مشترك علوم وتكنولوجيا')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all text-[11px] px-1"
                                >
                                    علوم وتكنولوجيا
                                </button>
                                <button 
                                    onClick={() => handleDecision('جذع مشترك آداب')}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg hover:shadow-rose-500/20 hover:-translate-y-1 transition-all text-[11px] px-1"
                                >
                                    آداب
                                </button>
                                <button 
                                    onClick={() => handleDecision('تعليم مهني')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-all text-[11px] px-1"
                                >
                                    تعليم مهني
                                </button>
                                <button 
                                    onClick={() => handleDecision('تكوين مهني')}
                                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-all text-[11px] px-1"
                                >
                                    تكوين مهني
                                </button>
                                <button 
                                    onClick={() => handleDecision('إعادة السنة')}
                                    className="bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-all text-[11px] px-1"
                                >
                                    إعادة السنة
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
         </div>
      </div>
    </div>
  );
};
