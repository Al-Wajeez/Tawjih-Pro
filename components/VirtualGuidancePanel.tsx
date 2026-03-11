
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, Save, RotateCcw, ArrowRight, ArrowLeft, 
  Trophy, Beaker, BookOpen, GripVertical, FileDown, 
  Users, AlertCircle, CheckCircle2, RefreshCw,
  MoveRight
} from 'lucide-react';
import { ConsolidatedStudent, FileMetadata } from '../types';
import { Button } from './Button';
import { exportVirtualGuidanceToWord } from '../services/exportService';
import { ConfirmDialog } from './ConfirmDialog';

interface VirtualGuidancePanelProps {
  students: ConsolidatedStudent[];
  onUpdate: (students: ConsolidatedStudent[]) => void; // Batch update
  meta: Partial<FileMetadata>;
}

type ListType = 'top' | 'science' | 'arts';

interface StudentItem extends ConsolidatedStudent {
  virtualDecision: string; // The decision assigned in this simulation
}

export const VirtualGuidancePanel: React.FC<VirtualGuidancePanelProps> = ({ students, onUpdate, meta }) => {
  // Config State
  const [topPercent, setTopPercent] = useState(5);
  const [sciencePercent, setSciencePercent] = useState(33);
  
  // Lists State
  const [topList, setTopList] = useState<StudentItem[]>([]);
  const [scienceList, setScienceList] = useState<StudentItem[]>([]);
  const [artsList, setArtsList] = useState<StudentItem[]>([]);
  
  const [isCalculated, setIsCalculated] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Helper to calculate averages (fallback to S3 avg, then annual)
  const getAvg = (s: ConsolidatedStudent) => {
      if (s.bemGrade && s.bemGrade >= 10) return s.bemGrade; // If admission based on BEM
      // Annual Average
      const s1 = s.s1?.avg || 0;
      const s2 = s.s2?.avg || 0;
      const s3 = s.s3?.avg || 0;
      if (s3) return (s1 + s2 + s3) / 3;
      if (s2) return (s1 + s2) / 2;
      return s1;
  };

  const normalizeChoice = (choice: string) => {
      const c = (choice || '').trim();
      if (c.includes('علوم') || c.includes('تكنولوجيا')) return 'جذع مشترك علوم وتكنولوجيا';
      if (c.includes('آداب')) return 'جذع مشترك آداب';
      return c; // Vocational or other
  };

  const handleCalculate = () => {
      if (students.length === 0) return;

      // 1. Filter students with Average >= 10
      const passingStudents = students.filter(s => getAvg(s) >= 10);
      
      if (passingStudents.length === 0) {
          setTopList([]);
          setScienceList([]);
          setArtsList([]);
          setIsCalculated(true);
          return;
      }

      // 1. Sort all by Merit (General Average)
      const sortedByMerit = [...students].sort((a, b) => getAvg(b) - getAvg(a));
      const totalCount = sortedByMerit.length;

      // 2. Extract Top N%
      const topCount = Math.ceil(totalCount * (topPercent / 100));
      const tops = sortedByMerit.slice(0, topCount).map(s => ({
          ...s,
          virtualDecision: normalizeChoice(s.orientationS3.choice1 || s.orientationS2.choice1 || '')
      }));

      // 3. Process Remainder
      const remainder = sortedByMerit.slice(topCount);
      
      // Sort remainder by Science Score for Science Quota
      // We assume science score is in guidanceS3 or guidanceS2
      const sortedByScience = [...remainder].sort((a, b) => {
          const scoreA = a.guidanceS3?.scienceScore || a.guidanceS2?.scienceScore || 0;
          const scoreB = b.guidanceS3?.scienceScore || b.guidanceS2?.scienceScore || 0;
          return scoreB - scoreA;
      });

      // 4. Extract Science Quota
      // Science percent is of TOTAL students usually, or remainder? 
      // Standard is % of Total Capacity. 
      const scienceCount = Math.floor(totalCount * (sciencePercent / 100));
      
      // We take the best science students from the remainder up to the quota
      const sciences = sortedByScience.slice(0, scienceCount).map(s => ({
          ...s,
          virtualDecision: 'جذع مشترك علوم وتكنولوجيا'
      }));

      // 5. The Rest go to Humanities (Arts)
      const arts = sortedByScience.slice(scienceCount).map(s => ({
          ...s,
          virtualDecision: 'جذع مشترك آداب'
      }));

      setTopList(tops);
      setScienceList(sciences);
      setArtsList(arts);
      setIsCalculated(true);
      setUnsavedChanges(true);
  };

  // Initial Calculation on Mount
  useEffect(() => {
      if (!isCalculated && students.length > 0) {
          handleCalculate();
      }
  }, [students.length]);

  const moveStudent = (studentId: string, source: ListType, target: ListType) => {
      let student: StudentItem | undefined;
      
      // Remove from Source
      if (source === 'top') {
          student = topList.find(s => s.id === studentId);
          setTopList(prev => prev.filter(s => s.id !== studentId));
      } else if (source === 'science') {
          student = scienceList.find(s => s.id === studentId);
          setScienceList(prev => prev.filter(s => s.id !== studentId));
      } else {
          student = artsList.find(s => s.id === studentId);
          setArtsList(prev => prev.filter(s => s.id !== studentId));
      }

      if (!student) return;

      // Update Decision based on Target
      let newDecision = student.virtualDecision;
      if (target === 'top') {
          newDecision = normalizeChoice(student.orientationS3.choice1 || ''); // Revert to choice
      } else if (target === 'science') {
          newDecision = 'جذع مشترك علوم وتكنولوجيا';
      } else if (target === 'arts') {
          newDecision = 'جذع مشترك آداب';
      }

      const movedStudent = { ...student, virtualDecision: newDecision };

      // Add to Target (Add to top of list for visibility)
      if (target === 'top') setTopList(prev => [movedStudent, ...prev]);
      else if (target === 'science') setScienceList(prev => [movedStudent, ...prev]);
      else setArtsList(prev => [movedStudent, ...prev]);

      setUnsavedChanges(true);
  };

  const handleSaveClick = () => {
      setShowConfirmSave(true);
  };

  const handleSave = () => {
       const allUpdated = [...topList, ...scienceList, ...artsList].map(s => {
          // Create a clean ConsolidatedStudent object with updated decision
          // We update `admissionsDecision` (Final Decision)
          return {
              ...s,
              orientationS3: {
                  ...s.orientationS3,
                  admissionsDecision: s.virtualDecision
              }
          };
      });

      // Remove the extra 'virtualDecision' property before saving back to main state type
      const cleanList: ConsolidatedStudent[] = allUpdated.map(({ virtualDecision, ...rest }) => rest);
      
      onUpdate(cleanList);
      setUnsavedChanges(false);
      setShowConfirmSave(false);
  };

  const handleExport = () => {
      exportVirtualGuidanceToWord({ top: topList, science: scienceList, arts: artsList }, meta);
  };

  // Render Stats
  const total = students.length;
  const topCount = topList.length;
  const sciCount = scienceList.length;
  const artsCount = artsList.length;

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-300">

        <ConfirmDialog 
            isOpen={showConfirmSave}
            title="تثبيت قرارات التوجيه الافتراضي"
            message="هل أنت متأكد من حفظ هذه التوزيعات كقرارات قبول نهائية؟ سيتم تحديث حقل 'قرار مجلس القبول' لجميع التلاميذ."
            onConfirm={handleSave}
            onCancel={() => setShowConfirmSave(false)}
            confirmLabel="حفظ وتطبيق"
        />
        
        {/* Controls Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Trophy size={24} className="text-amber-500"/>
                    التوجيه الافتراضي (نظام الكوتا)
                </h2>
                <p className="text-xs text-slate-500">توزيع التلاميذ بناءً على نسب مئوية محددة وترتيب الاستحقاق.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 px-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">الامتياز (رغبة 1):</label>
                    <div className="relative">
                        <input 
                            type="number" min="0" max="100" 
                            value={topPercent} onChange={e => setTopPercent(Number(e.target.value))}
                            className="w-16 p-1.5 text-center font-bold border rounded focus:ring-amber-500"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                </div>
                <div className="w-px h-6 bg-slate-300"></div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">طاقة استيعاب العلوم:</label>
                    <div className="relative">
                        <input 
                            type="number" min="0" max="100" 
                            value={sciencePercent} onChange={e => setSciencePercent(Number(e.target.value))}
                            className="w-16 p-1.5 text-center font-bold border rounded focus:ring-blue-500"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                </div>
                <Button size="md" onClick={handleCalculate} className="gap-1">
                    <RefreshCw size={14}/> إعادة الحساب
                </Button>
            </div>

            <div className="flex gap-2">
                <Button variant="primary" onClick={handleExport} className="gap-2">
                    <FileDown size={16}/> تصدير
                </Button>
                <Button onClick={handleSaveClick} disabled={!unsavedChanges} className={unsavedChanges ? 'bg-green-700 animate-pulse' : ''}>
                    <Save size={16} className="ml-2"/> حفظ النتائج
                </Button>
            </div>
        </div>

        {/* Columns Container */}
        <div className="flex-1 grid grid-cols-1 p-6 md:grid-cols-3 gap-4 overflow-hidden min-h-0">
            
            {/* Column 1: Top Students (Elite) */}
            <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Trophy size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">النخبة</h3>
                                <p className="text-sm text-slate-600">طلبة الامتياز</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 mb-1">الحصة</div>
                            <div className="text-lg font-bold text-amber-700">{topCount}</div>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-amber-200 rounded-full h-2 mt-4">
                        <div 
                            className="bg-amber-500 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${(topCount/total)*100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>{((topCount/total)*100).toFixed(2)}%</span>
                        <span>100%</span>
                    </div>
                </div>
                
                {/* Student List */}
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-white to-amber-50/20">
                    {topList.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">لا يوجد طلبة في هذه الفئة</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {topList.map((s, index) => (
                                <StudentCard 
                                    key={s.id} 
                                    student={s} 
                                    avg={getAvg(s)}
                                    type="top"
                                    onMove={(target) => moveStudent(s.id, 'top', target)}
                                />
                            ))}
                        </div>
                    )}
                    
                </div>
                
                {/* Footer Actions */}
                <div className="p-3 bg-amber-50 border-t border-amber-100">
                    {topList.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-center p-2 bg-amber-100 rounded">
                                <div className="font-bold text-amber-700">
                                    {((topList.reduce((sum, s) => sum + getAvg(s), 0) / topList.length) || 0).toFixed(2)}
                                </div>
                                <div className="text-slate-600">المعدل المتوسط</div>
                            </div>
                            <div className="text-center p-2 bg-amber-100 rounded">
                                <div className="font-bold text-amber-700">
                                    {(Math.max(...topList.map(s => getAvg(s))) || 0).toFixed(2)}
                                </div>
                                <div className="text-slate-600">أعلى معدل</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Science Quota */}
            <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Beaker size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">العلوم</h3>
                                <p className="text-sm text-slate-600">تخصص علمي</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 mb-1">الحصة</div>
                            <div className="text-lg font-bold text-blue-700">{sciCount}</div>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-4">
                        <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${(sciCount/total)*100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>{((sciCount/total)*100).toFixed(2)}%</span>
                        <span>100%</span>
                    </div>
                </div>
                
                {/* Student List */}
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-white to-blue-50/20">
                    {scienceList.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Beaker size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">لا يوجد طلبة في هذه الفئة</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {scienceList.map((s, index) => (
                                <StudentCard 
                                    key={s.id} 
                                    student={s} 
                                    avg={getAvg(s)}
                                    type="science"
                                    onMove={(target) => moveStudent(s.id, 'science', target)}
                                />
                            ))}
                        </div>
                    )}
                    
                    
                </div>
                
                {/* Footer Actions */}
                <div className="p-3 bg-blue-50 border-t border-blue-100">
                    {scienceList.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-center p-2 bg-blue-100 rounded">
                                <div className="font-bold text-blue-700">
                                    {((scienceList.reduce((sum, s) => sum + getAvg(s), 0) / scienceList.length) || 0).toFixed(2)}
                                </div>
                                <div className="text-slate-600">المعدل المتوسط</div>
                            </div>
                            <div className="text-center p-2 bg-blue-100 rounded">
                                <div className="font-bold text-blue-700">
                                    {(Math.max(...scienceList.map(s => getAvg(s))) || 0).toFixed(2)}
                                </div>
                                <div className="text-slate-600">أعلى معدل</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Arts/Remainder */}
            <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-rose-50 to-rose-100 border-b border-rose-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <BookOpen size={20} className="text-rose-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">الآداب</h3>
                                <p className="text-sm text-slate-600">تخصص أدبي</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 mb-1">الحصة</div>
                            <div className="text-lg font-bold text-rose-700">{artsCount}</div>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-rose-200 rounded-full h-2 mt-4">
                        <div 
                            className="bg-rose-500 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${(artsCount/total)*100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>{((artsCount/total)*100).toFixed(2)}%</span>
                        <span>100%</span>
                    </div>
                </div>
                
                {/* Student List */}
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-white to-rose-50/20">
                    {artsList.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">لا يوجد طلبة في هذه الفئة</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {artsList.map((s, index) => (
                                <StudentCard 
                                    key={s.id} 
                                    student={s} 
                                    avg={getAvg(s)}
                                    type="arts"
                                    onMove={(target) => moveStudent(s.id, 'arts', target)}
                                />
                            ))}
                        </div>
                    )}
                    
                </div>
                
                {/* Footer Actions */}
                <div className="p-3 bg-rose-50 border-t border-rose-100">
                    {artsList.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-center p-2 bg-rose-100 rounded">
                                <div className="font-bold text-rose-700">
                                    {((artsList.reduce((sum, s) => sum + getAvg(s), 0) / artsList.length) || 0).toFixed(2)}
                                </div>
                                <div className="text-slate-600">المعدل المتوسط</div>
                            </div>
                            <div className="text-center p-2 bg-rose-100 rounded">
                                <div className="font-bold text-rose-700">
                                    {(Math.max(...artsList.map(s => getAvg(s))) || 0).toFixed(2)}
                                </div>
                                <div className="text-slate-600">أعلى معدل</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

const StudentCard: React.FC<{ 
    student: StudentItem, 
    avg: number, 
    type: ListType, 
    onMove: (target: ListType) => void 
}> = ({ student, avg, type, onMove }) => {
    
    // Determine Color Theme based on type
    const theme = type === 'top' ? 'amber' : type === 'science' ? 'blue' : 'rose';
    const borderClass = type === 'top' ? 'border-amber-200 hover:border-amber-400' 
                      : type === 'science' ? 'border-blue-200 hover:border-blue-400' 
                      : 'border-rose-200 hover:border-rose-400';

    return (
        <div className={`bg-white p-3 rounded-lg border ${borderClass} shadow-sm group transition-all`}>
            <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-800 text-sm truncate max-w-[70%]">{student.fullName}</span>
                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-${theme}-100 text-${theme}-800`}>
                    {avg.toFixed(2)}
                </span>
            </div>
            
            <div className="flex justify-between items-end mt-2">
                <div className="text-[10px] text-slate-500 flex flex-col">
                    <span>الرغبة الأولى: <span className="font-bold text-slate-700">{student.orientationS3.choice1}</span></span>
                    <span className="mt-0.5">نقاط علوم: <span className={`font-bold ${student.guidanceS3?.scienceScore && student.guidanceS3.scienceScore >= 10 ? 'text-emerald-600' : 'text-slate-500'}`}>{student.guidanceS3?.scienceScore?.toFixed(2) || '-'}</span></span>
                </div>

                {/* Move Controls */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {type !== 'top' && (
                        <button onClick={() => onMove('top')} className="p-1 bg-amber-100 text-amber-600 rounded hover:bg-amber-200" title="نقل للنخبة">
                            <Trophy size={14}/>
                        </button>
                    )}
                    {type !== 'science' && (
                        <button onClick={() => onMove('science')} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="نقل للعلوم">
                            <Beaker size={14}/>
                        </button>
                    )}
                    {type !== 'arts' && (
                        <button onClick={() => onMove('arts')} className="p-1 bg-rose-100 text-rose-600 rounded hover:bg-rose-200" title="نقل للآداب">
                            <BookOpen size={14}/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
