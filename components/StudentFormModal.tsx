
import React, { useState, useEffect } from 'react';
import { X, Save, User, BookOpen, Compass, ChevronUp, ChevronDown, GripVertical, MessageSquare, Plus, Trash2, AlertCircle, Clock, History, Award, Users, UserCheck, FileText, Calendar, Book, School, MapPin, Building, Contact } from 'lucide-react';
import { ConsolidatedStudent, SubjectKey, OrientationData, Note, FileMetadata } from '../types';
import { Button } from './Button';

interface StudentFormModalProps {
  initialData?: ConsolidatedStudent;
  meta?: Partial<FileMetadata>;
  onSave: (student: ConsolidatedStudent) => void;
  onClose: () => void;
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

const SUBJECT_KEYS: SubjectKey[] = ['math', 'physics', 'nature', 'arabic', 'french', 'english', 'historyGeo', 'avg'];

// The strict list of options requested
const STUDENT_CHOICE_OPTIONS = [
  'جذع مشترك علوم وتكنولوجيا',
  'جذع مشترك آداب',
  'تعليم مهني',
  'تكوين مهني'
];

// Extended list for decisions (Council/Counselor) which might include repeating
const DECISION_OPTIONS = [
  ...STUDENT_CHOICE_OPTIONS,
  'إعادة السنة'
];

const EMPTY_ORIENT: OrientationData = {
    choice1: '', choice2: '', choice3: '', choice4: '',
    counselorDecision: '', councilDecision: '', admissionsDecision: '',
    preliminaryGuidance: null, compatibility: null
};

export const StudentFormModal: React.FC<StudentFormModalProps> = ({ initialData, meta, onSave, onClose }) => {
  const [formData, setFormData] = useState<ConsolidatedStudent>(
    initialData ? {
        ...initialData,
        // Fallback to meta if fields are empty on existing student
        directorate: initialData.directorate || meta?.directorate || '',
        school: initialData.school || meta?.school || ''
    } : {
      id: '', 
      fullName: '',
      birthDate: '',
      gender: 'ذكر',
      isRepeater: false,
      directorate: meta?.directorate || '',
      school: meta?.school || '',
      s1: {},
      s2: {},
      s3: {},
      past: {},
      guidance: { artsRank: 0, artsScore: 0, scienceRank: 0, scienceScore: 0 },
      orientationS1: {...EMPTY_ORIENT},
      orientationS2: {...EMPTY_ORIENT},
      orientationS3: {...EMPTY_ORIENT},
      notes: [],
      smartFlags: []
    } as ConsolidatedStudent
  );

  const [activeTab, setActiveTab] = useState<'info' | 'grades' | 'orientation' | 'notes'>('info');
  const [activeGradeTab, setActiveGradeTab] = useState<'s1' | 's2' | 's3' | 'past'>('s1');
  const [activeOrientTab, setActiveOrientTab] = useState<'s1' | 's2' | 's3'>('s1');
  const [age, setAge] = useState<number | null>(null);
  
  // Local state for new note input
  const [newNoteContent, setNewNoteContent] = useState('');

  // Calculate age whenever birthDate changes
  useEffect(() => {
    if (formData.birthDate) {
       const birthYear = new Date(formData.birthDate).getFullYear();
       if (!isNaN(birthYear)) {
          const currentYear = new Date().getFullYear();
          setAge(currentYear - birthYear);
       } else {
           const yearPart = parseInt(formData.birthDate.split('-')[0]);
           if (!isNaN(yearPart)) setAge(new Date().getFullYear() - yearPart);
       }
    }
  }, [formData.birthDate]);

  const handleChange = (field: keyof ConsolidatedStudent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOrientationChange = (semester: 's1' | 's2' | 's3', field: string, value: string) => {
    const key = semester === 's1' ? 'orientationS1' : semester === 's2' ? 'orientationS2' : 'orientationS3';
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      } as any
    }));
  };

  const handleSwapChoice = (index: number, direction: 'up' | 'down') => {
    const key = activeOrientTab === 's1' ? 'orientationS1' : activeOrientTab === 's2' ? 'orientationS2' : 'orientationS3';
    const orient = { ...formData[key] };
    type ChoiceKey = 'choice1' | 'choice2' | 'choice3' | 'choice4';
    const currentKey = `choice${index + 1}` as ChoiceKey;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const targetKey = `choice${targetIndex + 1}` as ChoiceKey;

    const temp = orient[currentKey];
    orient[currentKey] = orient[targetKey];
    orient[targetKey] = temp;

    setFormData(prev => ({ ...prev, [key]: orient }));
  };

  const handleGradeChange = (semester: 's1' | 's2' | 's3' | 'past', subject: SubjectKey, value: string) => {
    const numValue = parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [semester]: {
        ...prev[semester],
        [subject]: isNaN(numValue) ? 0 : numValue
      } as any
    }));
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    const note: Note = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content: newNoteContent.trim()
    };
    setFormData(prev => ({
        ...prev,
        notes: [note, ...(prev.notes || [])]
    }));
    setNewNoteContent('');
  };

  const handleDeleteNote = (noteId: string) => {
      setFormData(prev => ({
          ...prev,
          notes: (prev.notes || []).filter(n => n.id !== noteId)
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Maintain ID if editing, otherwise generate
    const id = formData.id || `${formData.fullName.trim().toLowerCase()}_${formData.birthDate.trim()}`;
    onSave({ ...formData, id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'تعديل تلميذ' : 'إضافة تلميذ جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
         <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-slate-50" dir="rtl">
         
         {/* Modern Tab Navigation */}
         <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 shadow-sm">
            <div className="grid grid-cols-4 flex justify-center items-center gap-1">

               <button
                  type="button"
                onClick={() => setActiveTab('info')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'info' 
                    ? 'text-purple-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'info' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-purple-600 rounded-full"></div>
                )}
                <User size={16} className={activeTab === 'info' ? 'text-purple-600' : 'text-slate-400'} />
                المعلومات الشخصية
                {activeTab === 'info' && (
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                )}
              </button>

              <button
              type="button"
                onClick={() => setActiveTab('grades')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'grades' 
                    ? 'text-amber-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'grades' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-amber-600 rounded-full"></div>
                )}
                <BookOpen size={16} className={activeTab === 'grades' ? 'text-amber-600' : 'text-slate-400'} />
                النقاط والعلامات
                {activeTab === 'grades' && (
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                )}
              </button>

               <button
               type="button"
                onClick={() => setActiveTab('orientation')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'orientation' 
                    ? 'text-blue-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'orientation' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
                <BookOpen size={16} className={activeTab === 'orientation' ? 'text-blue-600' : 'text-slate-400'} />
                الرغبات والتوجيه
                {activeTab === 'orientation' && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                )}
              </button>

               <button
               type="button"
                onClick={() => setActiveTab('notes')}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap justify-center
                  ${activeTab === 'notes' 
                    ? 'text-rose-600' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                {activeTab === 'notes' && (
                  <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-rose-600 rounded-full"></div>
                )}
                <MessageSquare size={16} className={activeTab === 'notes' ? 'text-rose-600' : 'text-slate-400'} />
                <div className="flex items-center gap-1">
                  ملاحظات ومقابلات
                </div>
                {activeTab === 'notes' && (
                  <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></div>
                )}
              </button>
            </div>
         </div>

         {/* Content Area */}
         <div className="p-8 overflow-y-auto flex-1">
            {/* Personal Information Tab */}
            {activeTab === 'info' && (
               <div className="space-y-8 max-w-4xl mx-auto">
                  {/* Institution Section */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-100 rounded-lg">
                        <Building size={20} className="text-slate-600"/>
                        </div>
                        <div>
                        <h3 className="font-bold text-lg text-slate-900">معلومات المؤسسة</h3>
                        <p className="text-sm text-slate-500">البيانات الإدارية والتأسيسية</p>
                        </div>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                           <MapPin size={14} className="text-slate-400"/>
                           المديرية
                        </label>
                        <input 
                           type="text" 
                           value={formData.directorate || ''} 
                           onChange={e => handleChange('directorate', e.target.value)} 
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400"
                           placeholder="أدخل اسم المديرية..."
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 mt-4 gap-6">
                        <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                           <School size={14} className="text-slate-400"/>
                           المؤسسة
                        </label>
                        <input 
                           type="text" 
                           value={formData.school || ''} 
                           onChange={e => handleChange('school', e.target.value)} 
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400"
                           placeholder="اسم المتوسطة أو الثانوية..."
                        />
                        </div>
                        
                        <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                           <Users size={14} className="text-slate-400"/>
                           القسم / الفوج
                        </label>
                        <input 
                           type="text" 
                           value={formData.classCode || ''} 
                           onChange={e => handleChange('classCode', e.target.value)} 
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400"
                           placeholder="مثال: 4م1"
                        />
                        </div>
                     </div>
                  </div>

                  {/* Personal Details Section */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 rounded-lg">
                        <User size={20} className="text-blue-600"/>
                        </div>
                        <div>
                        <h3 className="font-bold text-lg text-slate-900">البيانات الشخصية</h3>
                        <p className="text-sm text-slate-500">معلومات الهوية والحالة</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                           الاسم الكامل <span className="text-red-500">*</span>
                        </label>
                        <input 
                           type="text" 
                           required 
                           value={formData.fullName} 
                           onChange={e => handleChange('fullName', e.target.value)} 
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400"
                           placeholder="اللقب و الاسم"
                        />
                        </div>
                        
                        <div className="space-y-2">
                           <label className="block text-sm font-semibold text-slate-700">
                              تاريخ الميلاد <span className="text-red-500">*</span>
                           </label>
                           <div className="flex items-center gap-3">
                              <input 
                                 type="date" 
                                 required 
                                 value={formData.birthDate} 
                                 onChange={e => handleChange('birthDate', e.target.value)} 
                                 className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400"
                              />
                              {age !== null && (
                                 <div className="flex flex-col items-center bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg min-w-[100px]">
                                 <span className="text-xl font-bold text-blue-700">{age} سنة</span>
                                 </div>
                              )}
                        </div>
                        </div>
                        
                        <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">الجنس</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                              type="button"
                              onClick={() => handleChange('gender', 'ذكر')}
                              className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all duration-200 ${formData.gender === 'ذكر' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                           >
                              <Contact size={18}/>
                              <span className="font-medium">ذكر</span>
                           </button>
                           <button
                              type="button"
                              onClick={() => handleChange('gender', 'أنثى')}
                              className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all duration-200 ${formData.gender === 'أنثى' 
                              ? 'border-pink-500 bg-pink-50 text-pink-700' 
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                           >
                              <Contact size={18}/>
                              <span className="font-medium">أنثى</span>
                           </button>
                        </div>
                        </div>
                        
                        <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">وضعية التمدرس (الإعادة)</label>
                        <select 
                           value={formData.isRepeater ? 'yes' : 'no'} 
                           onChange={e => handleChange('isRepeater', e.target.value === 'yes')} 
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400 appearance-none bg-white"
                        >
                           <option value="no">لا</option>
                           <option value="yes">نعم</option>
                        </select>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Grades Tab */}
            {activeTab === 'grades' && (
               <div className="max-w-6xl mx-auto" dir="rtl">
               {/* Semester Tabs */}
               <div className="mb-8">
                  <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
                     {(['s1', 's2', 's3', 'past'] as const).map(sem => (
                     <button 
                        key={sem}
                        type="button" 
                        onClick={() => setActiveGradeTab(sem)} 
                        className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${activeGradeTab === sem 
                           ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                           : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                     >
                        <div className="flex items-center gap-2">
                           {sem === 's1' && <Calendar size={16}/>}
                           {sem === 's2' && <Calendar size={16}/>}
                           {sem === 's3' && <Calendar size={16}/>}
                           {sem === 'past' && <History size={16}/>}
                           <span>
                           {sem === 'past' ? 'المسار الدراسي' : sem === 's1' ? 'الفصل الأولى' : sem === 's2' ? 'الفصل الثانية' : sem === 's3' ? 'الفصل الثالثة' : 'الماضي الدراسي'}
                           </span>
                        </div>
                     </button>
                     ))}
                  </div>
               </div>
               
               {/* Grades Grid */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                     {SUBJECT_KEYS.map(key => (
                     <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all duration-200">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                           <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <Book size={16} className="text-slate-600"/>
                           </div>
                           <span className="font-semibold text-slate-800">{SUBJECT_LABELS[key]}</span>
                           </div>
                           <div className='flex items-right'>
                              <input 
                                 type="number" 
                                 step="0.01" 
                                 min="0" 
                                 max="20" 
                                 value={formData[activeGradeTab]?.[key] || ''} 
                                 onChange={e => handleGradeChange(activeGradeTab, key, e.target.value)} 
                                 className="w-18 px-1 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center font-bold text-slate-900 text-md transition-all duration-200 hover:border-slate-400"
                                 placeholder="00.00"
                              />
                              <div className="flex items-center mr-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${formData[activeGradeTab]?.[key] >= 10 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                 {formData[activeGradeTab]?.[key] >= 10 ? '✓' : '✗'}
                              </div>
                           </div>
                           </div>
                           
                        </div>

                     </div>
                     ))}
                  </div>
                  
                  {/* BEM Grade Section */}
                  {activeGradeTab === 's3' && (
                     <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-emerald-100 rounded-lg">
                           <Award size={20} className="text-emerald-600"/>
                           </div>
                           <div>
                           <h4 className="font-bold text-lg text-emerald-900">معدل شهادة التعليم المتوسط (BEM)</h4>
                           <p className="text-sm text-emerald-600">النتيجة النهائية</p>
                           </div>
                        </div>
                        <div className="text-xs font-medium text-emerald-600 bg-white px-3 py-1 rounded-full border border-emerald-200">
                           التقدير النهائي
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                        <input 
                           type="number" 
                           step="0.01" 
                           min="0" 
                           max="20" 
                           value={formData.bemGrade || ''} 
                           onChange={e => handleChange('bemGrade', parseFloat(e.target.value))} 
                           className="flex-1 px-6 py-4 border-2 border-emerald-300 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center font-mono font-bold text-emerald-900 text-2xl transition-all duration-200"
                           placeholder="00.00"
                        />
                        <div className="flex flex-col items-center bg-white border border-emerald-200 px-6 py-3 rounded-xl min-w-[120px]">
                           <span className="text-sm text-emerald-600 mb-1">التقييم</span>
                           <span className="text-xl font-bold text-emerald-700">
                           {formData.bemGrade ? (formData.bemGrade >= 10 ? 'ناجح' : 'راسب') : 'غير محدد'}
                           </span>
                        </div>
                     </div>
                     </div>
                  )}
               </div>
               </div>
            )}

            {/* Orientation Tab */}
            {activeTab === 'orientation' && (
               <div className="max-w-6xl mx-auto space-y-8">
               {/* Semester Tabs */}
               <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
                  {(['s1', 's2', 's3'] as const).map(sem => (
                     <button 
                     key={sem}
                     type="button" 
                     onClick={() => setActiveOrientTab(sem)} 
                     className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${activeOrientTab === sem 
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                     >
                     <div className="flex items-center gap-2">
                        <Calendar size={16}/>
                        <span>الفصل {sem === 's1' ? 'الأول' : sem === 's2' ? 'الثاني' : 'الثالث'}</span>
                     </div>
                     </button>
                  ))}
               </div>

               {/* Interactive Choices Card */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                     <div className="p-2 bg-purple-100 rounded-lg">
                        <Compass size={20} className="text-purple-600"/>
                     </div>
                     <div>
                        <h3 className="font-bold text-lg text-slate-900">بطاقة الرغبات التفاعلية</h3>
                        <p className="text-sm text-slate-500">ترتيب الخيارات حسب الأفضلية</p>
                     </div>
                     </div>
                     <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                     4 خيارات
                     </div>
                  </div>

                  <div className="space-y-3">
                     {[0, 1, 2, 3].map(idx => {
                     const orientKey = activeOrientTab === 's1' ? 'orientationS1' : activeOrientTab === 's2' ? 'orientationS2' : 'orientationS3';
                     const choiceVal = (formData[orientKey] as any)[`choice${idx + 1}`];
                     
                     return (
                        <div 
                           key={idx} 
                           className="group bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-4"
                        >
                           {/* Order Controls */}
                           <div className="flex flex-col gap-1">
                           <button 
                              type="button"
                              onClick={() => handleSwapChoice(idx, 'up')}
                              disabled={idx === 0} 
                              className={`p-2 rounded-lg transition-all ${idx === 0 
                                 ? 'opacity-30 cursor-not-allowed text-slate-300' 
                                 : 'hover:bg-slate-100 text-slate-500 hover:text-purple-600'}`}
                           >
                              <ChevronUp size={16}/>
                           </button>
                           <div className="relative">
                              <div className="w-10 h-10 rounded-lg bg-purple-100 border-2 border-purple-200 flex items-center justify-center font-bold text-purple-700 text-base">
                                 {idx + 1}
                              </div>
                              {idx === 0 && (
                                 <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                                 مفضل
                                 </div>
                              )}
                           </div>
                           <button 
                              type="button"
                              onClick={() => handleSwapChoice(idx, 'down')}
                              disabled={idx === 3} 
                              className={`p-2 rounded-lg transition-all ${idx === 3 
                                 ? 'opacity-30 cursor-not-allowed text-slate-300' 
                                 : 'hover:bg-slate-100 text-slate-500 hover:text-purple-600'}`}
                           >
                              <ChevronDown size={16}/>
                           </button>
                           </div>
                           
                           {/* Choice Selector */}
                           <div className="flex-1">
                           <select
                              value={choiceVal}
                              onChange={e => handleOrientationChange(activeOrientTab, `choice${idx + 1}`, e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-800 font-semibold transition-all duration-200 hover:border-slate-400 appearance-none"
                           >
                              <option value="">اختر الرغبة {idx + 1}...</option>
                              {STUDENT_CHOICE_OPTIONS.map(opt => (
                                 <option key={opt} value={opt}>{opt}</option>
                              ))}
                           </select>
                           </div>
                           
                           {/* Drag Handle */}
                           <div className="p-2 text-slate-300 group-hover:text-slate-400 cursor-move">
                           <GripVertical size={20}/>
                           </div>
                        </div>
                     );
                     })}
                  </div>
               </div>

               {/* Decisions Card */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-2 bg-blue-100 rounded-lg">
                     <FileText size={20} className="text-blue-600"/>
                     </div>
                     <div>
                     <h3 className="font-bold text-lg text-slate-900">قرارات التوجيه الرسمية</h3>
                     <p className="text-sm text-slate-500">التوصيات والقرارات النهائية</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Counselor Decision */}
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-all duration-200">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                           <UserCheck size={18} className="text-blue-600"/>
                        </div>
                        <div>
                           <h4 className="font-semibold text-slate-800">اقتراح المستشار</h4>
                           <p className="text-xs text-slate-500">التوصية المبدئية</p>
                        </div>
                     </div>
                     <input 
                        list="decision-options" 
                        value={(formData as any)[`orientation${activeOrientTab.toUpperCase()}`].counselorDecision} 
                        onChange={e => handleOrientationChange(activeOrientTab, 'counselorDecision', e.target.value)} 
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-400"
                        placeholder="اختر القرار..."
                     />
                     </div>

                     {/* Council Decision */}
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-purple-300 transition-all duration-200">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                           <Users size={18} className="text-purple-600"/>
                        </div>
                        <div>
                           <h4 className="font-semibold text-slate-800">قرار المجلس</h4>
                           <p className="text-xs text-slate-500">قرار لجنة التوجيه</p>
                        </div>
                     </div>
                     <input 
                        list="decision-options" 
                        value={(formData as any)[`orientation${activeOrientTab.toUpperCase()}`].councilDecision} 
                        onChange={e => handleOrientationChange(activeOrientTab, 'councilDecision', e.target.value)} 
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 hover:border-slate-400"
                        placeholder="اختر القرار..."
                     />
                     </div>
                  </div>

                  {/* Final Decision - S3 Only */}
                  {activeOrientTab === 's3' && (
                     <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-emerald-100 rounded-lg">
                           <Award size={20} className="text-emerald-600"/>
                           </div>
                           <div>
                           <h4 className="font-bold text-lg text-emerald-900">قرار مجلس القبول (النهائي)</h4>
                           <p className="text-sm text-emerald-600">القرار النهائي المعتمد</p>
                           </div>
                        </div>
                        <div className="text-xs font-medium text-emerald-600 bg-white px-3 py-1 rounded-full border border-emerald-200">
                           النتيجة النهائية
                        </div>
                     </div>
                     
                     <input 
                        list="decision-options" 
                        value={formData.orientationS3.admissionsDecision} 
                        onChange={e => handleOrientationChange('s3', 'admissionsDecision', e.target.value)} 
                        className="w-full px-6 py-4 bg-white border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-lg font-bold text-emerald-900 transition-all duration-200"
                        placeholder="القرار النهائي للتوجيه..."
                     />
                     </div>
                  )}
               </div>

               <datalist id="decision-options">
                  {DECISION_OPTIONS.map(opt => <option key={opt} value={opt} />)}
               </datalist>
               </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
               <div className="max-w-4xl mx-auto space-y-8">
               {/* Add New Note */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-2 bg-amber-100 rounded-lg">
                     <MessageSquare size={20} className="text-amber-600"/>
                     </div>
                     <div>
                     <h3 className="font-bold text-lg text-slate-900">إضافة ملاحظة جديدة</h3>
                     <p className="text-sm text-slate-500">تقرير مقابلة أو متابعة</p>
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <textarea
                     value={newNoteContent}
                     onChange={(e) => setNewNoteContent(e.target.value)}
                     placeholder="اكتب ملاحظة جديدة أو تقرير مقابلة..."
                     className="w-full p-4 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none min-h-[120px] resize-none transition-all duration-200 hover:border-slate-400"
                     />
                     <div className="flex justify-between items-center">
                     <div className="text-sm text-slate-500">
                        {newNoteContent.length} حرف
                     </div>
                     <Button 
                        onClick={handleAddNote} 
                        disabled={!newNoteContent.trim()} 
                        variant={newNoteContent.trim() ? "primary" : "ghost"}
                        className="gap-2"
                     >
                        <Plus size={18}/>
                        إضافة الملاحظة
                     </Button>
                     </div>
                  </div>
               </div>

               {/* Notes History */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-100 rounded-lg">
                        <History size={20} className="text-slate-600"/>
                     </div>
                     <div>
                        <h3 className="font-bold text-lg text-slate-900">سجل الملاحظات</h3>
                        <p className="text-sm text-slate-500">المقابلات والتقارير السابقة</p>
                     </div>
                     </div>
                     <div className="text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                     {formData.notes?.length || 0} ملاحظة
                     </div>
                  </div>

                  {!formData.notes?.length ? (
                     <div className="text-center py-12">
                     <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare size={24} className="text-slate-400"/>
                     </div>
                     <h4 className="font-semibold text-slate-700 mb-2">لا توجد ملاحظات مسجلة</h4>
                     <p className="text-sm text-slate-500">ابدأ بإضافة ملاحظة جديدة أعلاه</p>
                     </div>
                  ) : (
                     <div className="space-y-4">
                     {formData.notes.map((note) => (
                        <div key={note.id} className="group bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-amber-300 transition-all duration-200 relative">
                           <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                              onClick={() => handleDeleteNote(note.id)} 
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           >
                              <Trash2 size={16} />
                           </button>
                           </div>
                           
                           <div className="flex items-start justify-between mb-3">
                           <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                                 <Clock size={14} className="text-slate-400"/>
                              </div>
                              <span className="text-sm font-semibold text-slate-600">
                                 {new Date(note.date).toLocaleString('ar-DZ', {
                                 year: 'numeric',
                                 month: 'long',
                                 day: 'numeric',
                                 hour: '2-digit',
                                 minute: '2-digit'
                                 })}
                              </span>
                           </div>
                           <div className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                              مقابلة
                           </div>
                           </div>
                           
                           <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed bg-white p-4 rounded-lg border border-slate-100">
                           {note.content}
                           </p>
                        </div>
                     ))}
                     </div>
                  )}
               </div>
               </div>
            )}
         </div>

         {/* Action Bar */}
         <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-lg flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
               <AlertCircle size={16} className="text-slate-400"/>
               <span>جميع الحقول المميزة بـ * إلزامية</span>
            </div>
            
            <div className="flex gap-3">
               <Button 
               type="button" 
               variant="ghost" 
               onClick={onClose}
               className="gap-2 border border-slate-300 hover:border-slate-400"
               >
               <X size={18}/>
               إلغاء
               </Button>
               <Button 
               type="submit" 
               className="gap-2 shadow-sm hover:shadow"
               >
               <Save size={18}/>
               حفظ البيانات
               </Button>
            </div>
         </div>
         </form>
      </div>
    </div>
  );
};
