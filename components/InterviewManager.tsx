import React, { useState, useMemo } from 'react';
import { 
  Users, Search, ClipboardList, AlertTriangle, Shuffle, CheckCircle2, 
  Calendar as CalendarIcon, Clock, Mail, MessageCircle, GripVertical, 
  Printer, X, Plus, Layout, List, Edit, Trash2,
  ChevronDown,
  File
} from 'lucide-react';
import { ConsolidatedStudent, InterviewData, FileMetadata } from '../types';
import { Button } from './Button';
import { exportInterviewToWord, printAppointmentSchedule } from '../services/exportService';
import { StudentDetailsModal } from './StudentDetailsModal';

interface InterviewManagerProps {
  students: ConsolidatedStudent[];
  onUpdate: (student: ConsolidatedStudent) => void;
  meta: Partial<FileMetadata>;
}

type ViewMode = 'list' | 'kanban';
type ColumnType = 'pending' | 'scheduled' | 'completed';

export const InterviewManager: React.FC<InterviewManagerProps> = ({ students, onUpdate, meta }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Drag and Drop State
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null);
  
  // Schedule Form State
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('09:00');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<ConsolidatedStudent | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.classCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // Kanban Columns
  const columns = useMemo(() => {
    const cols = {
      pending: [] as ConsolidatedStudent[],
      scheduled: [] as ConsolidatedStudent[],
      completed: [] as ConsolidatedStudent[]
    };

    filteredStudents.forEach(s => {
      const status = s.interview?.status || 'pending';
      if (status === 'completed') {
        cols.completed.push(s);
      } else if (status === 'scheduled') {
        cols.scheduled.push(s);
      } else {
        // Pending
        cols.pending.push(s);
      }
    });

    // Sort Scheduled by Date & Time
    cols.scheduled.sort((a, b) => {
        const dateA = a.interview?.date || '9999';
        const timeA = a.interview?.time || '00:00';
        const dateB = b.interview?.date || '9999';
        const timeB = b.interview?.time || '00:00';
        return dateA.localeCompare(dateB) || timeA.localeCompare(timeB);
    });

    return cols;
  }, [filteredStudents]);

  // --- Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedStudentId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCol: ColumnType) => {
    e.preventDefault();
    if (!draggedStudentId) return;

    const student = students.find(s => s.id === draggedStudentId);
    if (!student) return;

    if (targetCol === 'scheduled') {
        setPendingScheduleId(draggedStudentId);
        setScheduleModalOpen(true);
    } else if (targetCol === 'completed') {
        updateStatus(student, 'completed');
    } else {
        updateStatus(student, 'pending');
    }
    
    setDraggedStudentId(null);
  };

  const updateStatus = (student: ConsolidatedStudent, status: InterviewData['status'], date?: string, time?: string) => {
      const currentInterview = student.interview || {
          status: 'pending',
          date: new Date().toISOString().split('T')[0],
          studentReason: '',
          parentOpinion: '',
          counselorObservation: ''
      };

      const updatedStudent = {
          ...student,
          interview: {
              ...currentInterview,
              status,
              ...(date && { date }),
              ...(time && { time })
          }
      };
      onUpdate(updatedStudent);
  };

  const confirmSchedule = () => {
      if (pendingScheduleId) {
          const student = students.find(s => s.id === pendingScheduleId);
          if (student) {
              updateStatus(student, 'scheduled', scheduleDate, scheduleTime);
          }
      }
      setScheduleModalOpen(false);
      setPendingScheduleId(null);
  };

  const handlePrintSchedule = () => {
      // Use selected date or today
      printAppointmentSchedule(students, scheduleDate, meta);
  };

  // Edit appointment handler
  const handleEditAppointment = (student: ConsolidatedStudent) => {
    setStudentToEdit(student);
    setEditDate(student.interview?.date || new Date().toISOString().split('T')[0]);
    setEditTime(student.interview?.time || '09:00');
    setEditModalOpen(true);
  };

  const confirmEditAppointment = () => {
    if (studentToEdit) {
      updateStatus(studentToEdit, 'scheduled', editDate, editTime);
    }
    setEditModalOpen(false);
    setStudentToEdit(null);
  };

  // Delete appointment handlers
  const handleDeleteAppointment = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      updateStatus(student, 'pending');
    }
  };

  const handleClearAllScheduled = () => {
    if (window.confirm('هل أنت متأكد من إلغاء جميع المواعيد المجدولة؟')) {
      columns.scheduled.forEach(student => {
        updateStatus(student, 'pending');
      });
    }
  };

  const generateWhatsAppLink = (student: ConsolidatedStudent) => {
      const msg = `ولي أمر التلميذ(ة) ${student.fullName} المحترم، يرجى التقرب من المؤسسة يوم ${student.interview?.date} على الساعة ${student.interview?.time || '09:00'} لمقابلة مستشار التوجيه بخصوص توجيه ابنكم.`;
      return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const generateMailLink = (student: ConsolidatedStudent) => {
      const subject = "دعوة لمقابلة التوجيه المدرسي";
      const body = `ولي أمر التلميذ(ة) ${student.fullName} المحترم،%0D%0A%0D%0Aيرجى التقرب من المؤسسة يوم ${student.interview?.date} على الساعة ${student.interview?.time || '09:00'} لمقابلة مستشار التوجيه بخصوص توجيه ابنكم.%0D%0A%0D%0Aتقبلوا تحياتنا.`;
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  // --- Render Helpers ---

  const KanbanCard = ({ student }: { student: ConsolidatedStudent }) => {
      const isPriority = student.smartFlags.includes('risk') || student.smartFlags.includes('mismatch');
      
      return (
          <div 
            draggable 
            onDragStart={(e) => handleDragStart(e, student.id)}
            onClick={() => setSelectedStudentId(student.id)}
            className={`bg-white p-3 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative ${isPriority ? 'border-l-4 border-l-red-500' : 'border-slate-200'}`}
          >
              <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800 text-sm">{student.fullName}</span>
                  <div className="flex items-center gap-1">
                      {student.interview?.status === 'scheduled' && (
                          <>
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditAppointment(student);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="تعديل الموعد"
                              >
                                  <Edit size={14} />
                              </button>
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAppointment(student.id);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="حذف الموعد"
                              >
                                  <Trash2 size={14} />
                              </button>
                          </>
                      )}
                      <GripVertical size={16} className="text-slate-300 opacity-0 group-hover:opacity-100"/>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{student.classCode || 'بدون قسم'}</span>
                  {student.interview?.status === 'scheduled' && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                          <Clock size={10}/> {student.interview.time}
                      </span>
                  )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                  {student.smartFlags.includes('mismatch') && <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold flex items-center gap-1"><Shuffle size={10}/> عدم توافق</span>}
                  {student.smartFlags.includes('risk') && <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold flex items-center gap-1"><AlertTriangle size={10}/> خطر</span>}
              </div>

              {/* Actions for Scheduled */}
              {student.interview?.status === 'scheduled' && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={generateWhatsAppLink(student)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100" title="إرسال عبر واتساب"><MessageCircle size={14}/></a>
                      <a href={generateMailLink(student)} onClick={e => e.stopPropagation()} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="إرسال دعوة عبر البريد"><Mail size={14}/></a>
                      <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            generateNoticesCall(student, meta);
                        }}
                        className="p-1.5 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 inline-block cursor-pointer"
                        title="إرسال دعوة عبر البريد"
                        >
                        <File size={14}/>
                        </a>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList size={24} className="text-primary-600"/>
                    نظام المقابلات والمواعيد
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    تنظيم وجدولة مقابلات التوجيه 
                </p>
            </div>

            <div className="flex gap-3 items-center w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="بحث عن تلميذ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow text-primary-700' : 'text-slate-500'}`} title="عرض اللوحة"><Layout size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-primary-700' : 'text-slate-500'}`} title="عرض القائمة"><List size={18}/></button>
                </div>
            </div>
        </div>

        {/* Board Area */}
        <div className="flex-1 overflow-hidden p-6">
            <div className="h-full flex flex-col">
                {/* Board Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">لوحة المتابعة</h2>
                        <p className="text-sm text-slate-500 mt-1">سحب وإفلات البطاقات لإدارة المقابلات</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <span>إجمالي الطلاب:</span>
                            <span className="font-bold text-slate-900">{columns.pending.length + columns.scheduled.length + columns.completed.length}</span>
                        </div>
                    </div>
                </div>

                {/* Board Columns */}
                <div className="flex-1 flex gap-4 min-w-[1000px] overflow-hidden pb-2">
                    
                    {/* Column 1: Pending */}
                    <div className="flex-1 flex flex-col min-w-[320px] overflow-x-auto">
                        <div 
                            className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-x-auto"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'pending')}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-slate-200 bg-slate-50/80 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                                        <h3 className="font-bold text-slate-800">في الانتظار</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">تم إنشاؤه</span>
                                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {columns.pending.length}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">طلاب يحتاجون إلى جدولة مقابلة</p>
                            </div>

                            {/* Column Body */}
                            <div className="flex-1 overflow-y-auto p-3">
                                {columns.pending.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg m-2">
                                        <Clock className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm">لا توجد طلبات</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {columns.pending.map(student => (
                                            <KanbanCard key={student.id} student={student} />
                                        ))}
                                    </div>
                                )}
                                
                                {/* Empty drop zone hint */}
                                <div className="mt-4 p-3 border-2 border-dashed border-slate-200 rounded-lg text-center hidden group-hover:block">
                                    <span className="text-sm text-slate-500">افلت البطاقة هنا</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Scheduled */}
                    <div className="flex-1 flex flex-col min-w-[320px] overflow-x-auto">
                        <div 
                            className="flex-1 flex flex-col bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow overflow-x-auto"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'scheduled')}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-blue-200 bg-blue-50/80 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-blue-100 rounded-lg">
                                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h3 className="font-bold text-blue-900">المجدولة</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setScheduleModalOpen(true)}
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                        >
                                            تغيير التاريخ
                                        </button>
                                        {columns.scheduled.length > 0 && (
                                            <button 
                                                onClick={handleClearAllScheduled}
                                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                                                title="مسح جميع المواعيد"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {columns.scheduled.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-blue-600 font-medium">
                                        {new Date(scheduleDate).toLocaleDateString('ar-DZ', { 
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    <button 
                                        onClick={handlePrintSchedule}
                                        className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-1 rounded transition-colors"
                                        title="طباعة الجدول"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Column Body */}
                            <div className="flex-1 overflow-y-auto p-3">
                                {columns.scheduled.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-blue-400 border-2 border-dashed border-blue-200 rounded-lg m-2 group">
                                        <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm text-blue-500">اسحب البطاقات هنا</span>
                                        <span className="text-xs text-blue-400 mt-1">لجدولة موعد</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="mb-1 flex items-center justify-between">
                                            <div className="text-xs text-blue-600 font-bold px-2">المواعيد المجدولة:</div>
                                            <button 
                                                onClick={handleClearAllScheduled}
                                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                                مسح الكل
                                            </button>
                                        </div>
                                        {columns.scheduled.map((student, index) => (
                                            <div key={student.id} className="relative">
                                                {index > 0 && (
                                                    <div className="absolute left-1/2 -top-3 -translate-x-1/2 w-0.5 h-3 bg-blue-200"></div>
                                                )}
                                                <KanbanCard student={student} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Completed */}
                    <div className="flex-1 flex flex-col min-w-[320px] overflow-x-auto">
                        <div 
                            className="flex-1 flex flex-col bg-white rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-shadow overflow-x-auto"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'completed')}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-emerald-200 bg-emerald-50/80 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-emerald-100 rounded-lg">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <h3 className="font-bold text-emerald-900">المكتملة</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-emerald-500">تم إنجازها</span>
                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {columns.completed.length}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-emerald-600">مقابلات تم الانتهاء منها</p>
                            </div>

                            {/* Column Body */}
                            <div className="flex-1 overflow-y-auto p-3">
                                {columns.completed.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-emerald-400 border-2 border-dashed border-emerald-200 rounded-lg m-2">
                                        <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm text-emerald-500">لا توجد مقابلات مكتملة</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Today's completed */}
                                        <div className="mb-3">
                                            <div className="text-xs text-emerald-600 font-medium mb-2 px-2">تم إنجازها اليوم:</div>
                                            {columns.completed.slice(0, 5).map(student => (
                                                <KanbanCard key={student.id} student={student} />
                                            ))}
                                        </div>
                                        
                                        {/* Older completed (collapsible) */}
                                        {columns.completed.length > 5 && (
                                            <div className="border-t border-emerald-100 pt-3">
                                                <details className="group">
                                                    <summary className="flex items-center justify-between text-xs text-emerald-600 font-medium cursor-pointer list-none p-2 hover:bg-emerald-50 rounded-lg">
                                                        <span>المقابلات السابقة ({columns.completed.length - 5})</span>
                                                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                                                    </summary>
                                                    <div className="mt-2 space-y-3 pl-2">
                                                        {columns.completed.slice(5).map(student => (
                                                            <KanbanCard key={student.id} student={student} />
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Board Footer Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">معدل الانتظار</div>
                            <div className="text-lg font-bold text-slate-900">
                                {columns.pending.length > 0 ? `${Math.round(columns.pending.length / (columns.pending.length + columns.scheduled.length) * 100)}%` : '0%'}
                            </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                            <div 
                                className="bg-slate-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.round(columns.pending.length / (columns.pending.length + columns.scheduled.length) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">معدل الإنجاز</div>
                            <div className="text-lg font-bold text-emerald-600">
                                {columns.completed.length > 0 ? `${Math.round(columns.completed.length / (columns.pending.length + columns.scheduled.length + columns.completed.length) * 100)}%` : '0%'}
                            </div>
                        </div>
                        <div className="w-full bg-emerald-200 rounded-full h-1.5 mt-2">
                            <div 
                                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.round(columns.completed.length / (columns.pending.length + columns.scheduled.length + columns.completed.length) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Schedule Modal */}
        {scheduleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">تحديد موعد المقابلة</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">التاريخ</label>
                            <input 
                                type="date" 
                                value={scheduleDate}
                                onChange={e => setScheduleDate(e.target.value)}
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">التوقيت</label>
                            <input 
                                type="time" 
                                value={scheduleTime}
                                onChange={e => setScheduleTime(e.target.value)}
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="ghost" onClick={() => { setScheduleModalOpen(false); setPendingScheduleId(null); }}>إلغاء</Button>
                        <Button onClick={confirmSchedule}>تأكيد الموعد</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Appointment Modal */}
        {editModalOpen && studentToEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">تعديل موعد المقابلة</h3>
                    <p className="text-sm text-slate-600 mb-4">تعديل موعد: <span className="font-bold">{studentToEdit.fullName}</span></p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">التاريخ</label>
                            <input 
                                type="date" 
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">التوقيت</label>
                            <input 
                                type="time" 
                                value={editTime}
                                onChange={e => setEditTime(e.target.value)}
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="ghost" onClick={() => setEditModalOpen(false)}>إلغاء</Button>
                        <Button onClick={confirmEditAppointment}>حفظ التعديلات</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Student Details (Reusing existing modal if selected) */}
        {selectedStudentId && (
            <StudentDetailsModal 
                student={students.find(s => s.id === selectedStudentId)!} 
                onClose={() => setSelectedStudentId(null)}
                onSave={onUpdate}
            />
        )}
    </div>
  );
};

// Helper to download blob
const downloadDoc = (html: string, filename: string) => {
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Professional CSS for Word
const getWordStyles = (isLandscape: boolean) => `
    <style>
        @page Section1 {
            size: ${isLandscape ? '841.9pt 595.3pt' : '595.3pt 841.9pt'};
            mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
            margin: 1.5cm;
        }
        div.Section1 {
            page: Section1;
        }
        body { font-family: 'Times New Roman', serif; direction: rtl; font-size: 11pt; color: #1f2937; }
        
        /* Headers */
        .header { margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        .header-top { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 15px; color: #1e3a8a; }
        .label { font-weight: bold; color: #4b5563; font-size: 11pt; }
        
        .title { 
            text-align: center; font-weight: bold; font-size: 18pt; 
            margin: 20px 0; padding: 10px; 
            background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 8px;
        }
        
        /* Tables */
        table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 15px; }
        th { 
            border: 1px solid #94a3b8; 
            background-color: #f1f5f9; 
            color: #334155;
            padding: 8px; 
            text-align: center; 
            font-weight: bold; 
        }
        td { 
            border: 1px solid #cbd5e1; 
            padding: 6px; 
            text-align: center; 
            vertical-align: middle;
        }
        
        /* Specific Table Styles */
        .thead-dark th { background-color: #1e293b; color: white; border-color: #0f172a; }
        .thead-blue th { background-color: #dbeafe; color: #1e40af; border-color: #93c5fd; }
        .thead-amber th { background-color: #fef3c7; color: #92400e; border-color: #fcd34d; }
        
        /* Utility Colors */
        .text-success { color: #15803d; font-weight: bold; }
        .text-danger { color: #b91c1c; font-weight: bold; }
        .bg-success-light { background-color: #dcfce7; }
        .bg-danger-light { background-color: #fee2e2; }
        .bg-blue-light { background-color: #eff6ff; }
        .bg-amber-light { background-color: #fffbeb; }
        
        /* Section Titles */
        .section-header {
            font-size: 14pt; font-weight: bold; color: #374151;
            border-bottom: 1px solid #e5e7eb; margin-top: 20px; margin-bottom: 10px; padding-bottom: 5px;
        }
        
        /* Boxes */
        .box { border: 1px solid #e2e8f0; padding: 10px; background-color: #f8fafc; border-radius: 4px; }
        .box-warning { background-color: #fffbeb; border-color: #fcd34d; }
    </style>
`;

// Helper to wrap content for Word
const wrapHtml = (content: string, title: string, isLandscape: boolean) => `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        ${getWordStyles(isLandscape)}
    </head>
    <body>
        <div class="Section1">
            ${content}
        </div>
    </body>
    </html>
`;


const getCommonHeader = (meta: Partial<FileMetadata>) => `
    <div class="header">
        <div class="header-top">
          الجمهوريــــة الجزائريــــة الديمقراطيـــــة الشعبيـــــــــــة<br/>
          وزارة التربية الوطنية
        </div>
        <table style="border: none; width: 100%; margin-bottom: 20px;">
          <tr>
             <td style="border: none; text-align: right; vertical-align: top; width: 33%;">
               <span class="label"> ${meta.directorate || '....................'}</span><br/>
               <span class="label"> ${meta.school || '....................'}</span>
             </td>
             <td style="border: none; width: 33%;"></td>
             <td style="border: none; text-align: left; vertical-align: top; width: 33%;">
               <span class="label">السنة الدراسية:</span> ${meta.year || '....................'}<br/>
               <span class="label">تاريخ الاستخراج:</span> ${new Date().toLocaleDateString('ar-DZ')}
             </td>
          </tr>
        </table>
    </div>
`;

const generateNoticesCall = (student: ConsolidatedStudent, meta: Partial<FileMetadata>) => {

    const content = `
        ${getCommonHeader(meta)}
        <div class="title" style="background-color: rgb(226, 254, 233); border-color: rgb(168, 252, 165); color: rgb(37, 153, 27);">
            إستدعاء
            <div style="font-size: 12pt; margin-top: 5px; font-weight: normal;">ولي الأمر</div>
        </div>

        <div class="section-header">
            <p>السيد ولي أمر التلميذ(ة) المحترم،</p>
            
            <p>الموضوع: دعوة للحضور إلى المؤسسة</p>
            
            <p>تحية طيبة وبعد،</p>
            
            <p>تشرف إدارة ${meta.school} دعوتكم للحضور إلى مقر المؤسسة 
            ، وذلك يوم <strong>${student.interview?.date || '............'}</strong> 
            على الساعة <strong>${student.interview?.time || '...........'}</strong>.</p>
            
            <p>يأتي هذا الاستدعاء للنظر في أمر تربوي هام يخص مسار ابنكم/ابنتكم 
            <strong>${student.fullName}</strong>، المزداد(ة) بتاريخ <strong>${student.birthDate}</strong>، 
            والمتمدرس(ة) بقسم السنة الرابعة متوسط ${student.classCode || '...........'}، 
            </p>
            
            <p>نظرًا لأهمية الموضوع الذي يتعلق بالمستوى التحصيلي والسلوكي 
            للتلميذ(ة) داخل المؤسسة، فإننا نأمل منكم التكرم بالحضور في الموعد 
            المحدد، والتوجه إلى مكتب التوجيه والإرشاد المدرسي والمهني أو مكتب إدارة 
            المؤسسة فور وصولكم.</p>
            
            <p>نحيطكم علمًا بأن هذا اللقاء يندرج في إطار متابعة أولياء الأمور 
            للمسار الدراسي لأبنائهم وتعزيز سبل التعاون بين الأسرة والمؤسسة 
            التربوية.</p>
            
            <p>وتفضلوا بقبول فائق الاحترام والتقدير.</p>
        
        </div>

        <div style="margin-top: 50px;">
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="width: 50%; border: none; text-align: center;"><strong>مستشار التوجيه:</strong></td>
                    <td style="width: 50%; border: none; text-align: center;"><strong>مدير المتوسطة:</strong></td>
                </tr>
            </table>
        </div>
    `;
  
    downloadDoc(wrapHtml(content, 'Remedial Plan', false), `إستدعاء__${student.fullName.replace(/\s+/g, '_')}.doc`);
};