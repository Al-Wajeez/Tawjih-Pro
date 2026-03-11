
import React, { useState, useMemo, useEffect } from 'react';
import { ConsolidatedStudent, FileMetadata, ColumnDefinition, FilterRule, SortRule, GroupRule, GuidanceSettings, SmartFlagType, SubjectKey } from '../types';
import { Search, Eye, Filter, Edit2, Trash2, CheckSquare, Square, ThumbsUp, ThumbsDown, Anchor, ArrowRightLeft, Printer, FileDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, CheckCircle, XCircle, StickyNote, AlertTriangle, Sparkles, Shuffle, Bookmark, TableProperties, X, ArrowUpRight, ListFilter, Presentation, ChevronDown, PenTool, Star, TableIcon } from 'lucide-react';
import { Button } from './Button';
import { ReportTemplate } from './ReportTemplate';
import { ConfirmDialog } from './ConfirmDialog';
import { AdvancedFilterModal } from './AdvancedFilterModal';
import { CustomListModal } from './CustomListModal';
import { ClassCouncilMode } from './ClassCouncilMode';
import { exportToWord, exportNoticesToWord, generateCustomListWord } from '../services/exportService';
import { processData } from '../services/dataProcessor';

export type ViewMode = 
  | 'grades_s1' | 'grades_s2' | 'grades_s3' | 'grades_past' | 'grades_s1_s2' | 'grades_s1_s2_s3'
  | 'choices_s1' | 'choices_s2' | 'choices_s3'
  | 'guidance_s1' | 'guidance_s2' | 'guidance_s3' ;

interface StudentTableProps {
  students: ConsolidatedStudent[];
  viewMode: ViewMode;
  onEdit: (student: ConsolidatedStudent) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onBulkUpdate?: (ids: string[], field: string, value: any) => void;
  onAdd: () => void;
  onView: (student: ConsolidatedStudent) => void; 
  onUpdate?: (student: ConsolidatedStudent) => void; // New prop for single updates
  meta: Partial<FileMetadata>;
  settings: GuidanceSettings;
}

// Bulk Options Constants
const DECISION_OPTIONS = [
  'جذع مشترك علوم وتكنولوجيا',
  'جذع مشترك آداب',
  'تعليم مهني',
  'تكوين مهني',
  'إعادة السنة'
];

export const StudentTable: React.FC<StudentTableProps> = ({ students, viewMode, onEdit, onDelete, onDeleteMany, onBulkUpdate, onAdd, onView, onUpdate, meta, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // -- Pagination & Display State --
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [decimalPlaces, setDecimalPlaces] = useState(2);

  // -- Advanced Processing State --
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [groupRule, setGroupRule] = useState<GroupRule>({ field: null });
  const [activeSmartFilter, setActiveSmartFilter] = useState<SmartFlagType | null>(null);

  // -- Column Customization State --
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  
  // -- Tools Menu State --
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // -- Modals State --
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrintHelp, setShowPrintHelp] = useState(false);
  const [showCustomListModal, setShowCustomListModal] = useState(false);
  const [showPresentationMode, setShowPresentationMode] = useState(false);

  // Reset pagination when data/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRules, groupRule, viewMode, students.length, activeSmartFilter]);

  // Reset hidden columns when view mode changes
  useEffect(() => {
    setHiddenColumns(new Set());
  }, [viewMode]);

  // 1. Column Definitions based on View Mode
  const getColumns = (): ColumnDefinition[] => {
    const common: ColumnDefinition[] = [
      { key: 'index', label: '#', type: 'number' },
      { key: 'fullName', label: 'اللقب و الاسم', type: 'string' },
      { key: 'birthDate', label: 'تاريخ الميلاد', type: 'date' },
      { key: 'gender', label: 'الجنس', type: 'string' },
    ];

    const gradesCols = (sem: string): ColumnDefinition[] => [
        { key: `${sem}.math`, label: 'الرياضيات', type: 'number' },
        { key: `${sem}.physics`, label: 'الفيزياء', type: 'number' },
        { key: `${sem}.nature`, label: 'العلوم', type: 'number' },
        { key: `${sem}.arabic`, label: 'العربية', type: 'number' },
        { key: `${sem}.french`, label: 'الفرنسية', type: 'number' },
        { key: `${sem}.english`, label: 'الإنجليزية', type: 'number' },
        { key: `${sem}.historyGeo`, label: 'التاريخ', type: 'number' },
        { key: `${sem}.avg`, label: 'المعدل', type: 'number' },
    ];

    if (viewMode === 'grades_s1') return [...common, ...gradesCols('s1')];
    if (viewMode === 'grades_s2') return [...common, ...gradesCols('s2')];
    if (viewMode === 'grades_s3') return [...common, ...gradesCols('s3')];
    if (viewMode === 'grades_past') return [...common, ...gradesCols('past')];
    if (viewMode === 'grades_s1_s2') return [...common, ...gradesCols('s1_s2')];
    if (viewMode === 'grades_s1_s2_s3') return [...common, ...gradesCols('s1_s2_s3')];

    // Guidance S1
    if (viewMode === 'guidance_s1') {
      return [
        ...common,
        { key: 's1.avg', label: 'المعدل', type: 'number' },
        { key: 'orientationS1.choice1', label: 'الرغبة الأولى', type: 'string' },
        { key: 'guidance.scienceScore', label: 'مجموعة التوجيه علوم', type: 'number' },
        { key: 'guidance.scienceRank', label: 'ترتيب علوم', type: 'number' },
        { key: 'guidance.artsScore', label: 'مجموعة التوجيه آداب', type: 'number' },
        { key: 'guidance.artsRank', label: 'ترتيب آداب', type: 'number' },
        { key: 'orientationS1.preliminaryGuidance', label: 'التوجيه الأولي', type: 'string' },
        { key: 'orientationS1.compatibility', label: 'التوافق', type: 'string' },
        { key: 'orientationS1.counselorDecision', label: 'اقتراح المستشار', type: 'string' },
        { key: 'orientationS1.councilDecision', label: 'قرار المجلس', type: 'string' },
      ];
    }
    // Guidance S2
    if (viewMode === 'guidance_s2') {
        return [
          ...common,
          { key: 's1_s2.avg', label: 'المعدل', type: 'number' },
          { key: 'orientationS2.choice1', label: 'الرغبة الاولى', type: 'string' },
          { key: 'guidanceS2.scienceScore', label: 'مجموعة التوجيه علوم', type: 'number' },
          { key: 'guidanceS2.scienceRank', label: 'ترتيب علوم', type: 'number' },
          { key: 'guidanceS2.artsScore', label: 'مجموعة التوجيه آداب', type: 'number' },
          { key: 'guidanceS2.artsRank', label: 'ترتيب آداب', type: 'number' },
          { key: 'guidanceS2.compatibility', label: 'التوافق', type: 'string' },
          { key: 'guidanceS2.stability', label: 'الاستقرار', type: 'string' },
          { key: 'orientationS2.counselorDecision', label: 'اقتراح المستشار', type: 'string' },
          { key: 'orientationS2.councilDecision', label: 'قرار المجلس', type: 'string' },
        ];
    }
    // Guidance S3
    if (viewMode === 'guidance_s3') {
        return [
          ...common,
          { key: 'bemGrade', label: 'معدل الشهادة', type: 'number' },
          { key: 's1_s2_s3.avg', label: 'المعدل', type: 'number' },
          { key: 'orientationS3.choice1', label: 'الرغبة الاولى', type: 'string' },
          { key: 'guidanceS3.scienceScore', label: 'مجموعة التوجيه علوم', type: 'number' },
          { key: 'guidanceS3.scienceRank', label: 'ترتيب علوم', type: 'number' },
          { key: 'guidanceS3.artsScore', label: 'مجموعة التوجيه آداب', type: 'number' },
          { key: 'guidanceS3.artsRank', label: 'ترتيب آداب', type: 'number' },
          { key: 'guidanceS3.compatibility', label: 'التوافق', type: 'string' },
          { key: 'orientationS3.councilDecision', label: 'قرار المجلس', type: 'string' },
          { key: 'orientationS3.admissionsDecision', label: 'قرار القبول', type: 'string' },
        ];
    }

    // Choices S1
    if (viewMode === 'choices_s1') {
      return [
        ...common,
        { key: 'orientationS1.choice1', label: 'الرغبة 1', type: 'string' },
        { key: 'orientationS1.choice2', label: 'الرغبة 2', type: 'string' },
        { key: 'orientationS1.choice3', label: 'الرغبة 3', type: 'string' },
        { key: 'orientationS1.choice4', label: 'الرغبة 4', type: 'string' },
      ];
    }
    // Choices S2
    if (viewMode === 'choices_s2') {
      return [
        ...common,
        { key: 'orientationS2.choice1', label: 'الرغبة 1', type: 'string' },
        { key: 'orientationS2.choice2', label: 'الرغبة 2', type: 'string' },
        { key: 'orientationS2.choice3', label: 'الرغبة 3', type: 'string' },
        { key: 'orientationS2.choice4', label: 'الرغبة 4', type: 'string' },
      ];
    }
    // Choices S3
    if (viewMode === 'choices_s3') {
      return [
        ...common,
        { key: 'orientationS3.choice1', label: 'الرغبة 1', type: 'string' },
        { key: 'orientationS3.choice2', label: 'الرغبة 2', type: 'string' },
        { key: 'orientationS3.choice3', label: 'الرغبة 3', type: 'string' },
        { key: 'orientationS3.choice4', label: 'الرغبة 4', type: 'string' },
      ];
    }
    
    // Default fallback
    return common;
  };

  const columns = getColumns();
  const displayColumns = columns.filter(c => !hiddenColumns.has(c.key));

  const toggleColumn = (key: string) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(key)) {
      newHidden.delete(key);
    } else {
      newHidden.add(key);
    }
    setHiddenColumns(newHidden);
  };

  // 2. Data Processing (Filtering, Sorting, Grouping)
  const { processed: filteredStudents, grouped: groupedStudents } = useMemo(() => {
    // First apply basic text search
    let data = students;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        data = data.filter(s => s.fullName.toLowerCase().includes(lower) || s.birthDate.includes(lower));
    }

    // Apply Smart Filter
    if (activeSmartFilter) {
        data = data.filter(s => s.smartFlags.includes(activeSmartFilter));
    }
    
    // Then apply advanced rules
    return processData(data, filterRules, sortRules, groupRule);
  }, [students, searchTerm, filterRules, sortRules, groupRule, viewMode, activeSmartFilter]);

  const flatStudents = filteredStudents; 

  // 3. Pagination Logic
  const totalItems = flatStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  
  // If grouped, we show all (pagination disabled for grouping). If not grouped, we show page.
  const paginatedStudents = groupedStudents ? flatStudents : flatStudents.slice(startIdx, endIdx);

  const toggleSelectAll = () => {
    if (selectedIds.size === flatStudents.length && flatStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(flatStudents.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const initiateBulkDelete = () => {
    if (selectedIds.size > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmBulkDelete = () => {
    onDeleteMany(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  const handleBulkChange = (field: string, value: string) => {
      if (!onBulkUpdate || selectedIds.size === 0 || !value) return;
      onBulkUpdate(Array.from(selectedIds), field, value);
      // Optional: Clear selection after update? No, keep it for further actions
  };

  const handlePrint = () => {
    try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            window.print();
        } else {
            throw new Error("Popup blocked");
        }
    } catch (e) {
        console.error("Print blocked, showing instructions");
        setShowPrintHelp(true);
    }
  };

  const handleExportWord = () => {
     let type: 'S1' | 'S2' | 'S3' = 'S1';
     if (viewMode.includes('s2')) type = 'S2';
     if (viewMode.includes('s3')) type = 'S3';
     // Export selected if any, otherwise all filtered
     const targetStudents = selectedIds.size > 0 
         ? flatStudents.filter(s => selectedIds.has(s.id))
         : flatStudents;
     exportToWord(targetStudents, type, meta);
  };

  const handleGenerateCustomList = (title: string, selectedColKeys: string[]) => {
      // Logic to generate the custom word doc
      const targetStudents = selectedIds.size > 0
          ? flatStudents.filter(s => selectedIds.has(s.id))
          : flatStudents;
      
      generateCustomListWord(targetStudents, columns, selectedColKeys, title, meta);
      setShowCustomListModal(false);
  };

  const handleExportNotices = () => {
     let type: 'S1' | 'S2' | 'S3' = 'S1';
     if (viewMode.includes('s2')) type = 'S2';
     if (viewMode.includes('s3')) type = 'S3';
     
     // Use selected students if any, otherwise all filtered
     const targetStudents = selectedIds.size > 0 
         ? flatStudents.filter(s => selectedIds.has(s.id))
         : flatStudents;

     exportNoticesToWord(targetStudents, type, meta);
  };

  const isGuidanceView = viewMode.startsWith('guidance');
  const reportType = viewMode.includes('s2') ? 'S2' : viewMode.includes('s3') ? 'S3' : 'S1';

  // Determine semester context for Presentation Mode
  const contextSemester = viewMode.includes('s3') ? 'S3' : viewMode.includes('s2') ? 'S2' : 'S1';

  // -- Render Cell Helper --
  const renderCell = (student: ConsolidatedStudent, colKey: string) => {
      const orient = viewMode.includes('s2') ? student.orientationS2 : viewMode.includes('s3') ? student.orientationS3 : student.orientationS1;
      const guidance = viewMode.includes('s2') ? student.guidanceS2 : viewMode.includes('s3') ? student.guidanceS3 : student.guidance;

      // Access helpers
      const getGrade = (sem: 's1' | 's2' | 's3' | 'past', key: string) => (student[sem] as any)?.[key];

      if (colKey.includes('.')) {
          const [parent, child] = colKey.split('.');
          
          if (parent === 's1' || parent === 's2' || parent === 's3' || parent === 'past') {
              const val = getGrade(parent as any, child);
              
              // Special handling for Average to show badge
              if (child === 'avg' && val !== undefined) {
                  const isAcceptable = val >= settings.passingThreshold;
                  return (
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{Number(val).toFixed(decimalPlaces)}</span>
                          <span className={`text-xs px-1.5 py-2 rounded ${isAcceptable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                             {isAcceptable ? 'مقبول' : 'غير مقبول'}
                          </span>
                      </div>
                  );
              }

              return val !== undefined ? Number(val).toFixed(decimalPlaces) : '-';
          }

          // Handle Composite Semesters (Calculated on the fly)
          if (parent === 's1_s2' || parent === 's1_s2_s3') {
              let val = 0;
              if (parent === 's1_s2') {
                  val = ((student.s1?.[child as SubjectKey] || 0) + (student.s2?.[child as SubjectKey] || 0)) / 2;
              } else {
                  val = ((student.s1?.[child as SubjectKey] || 0) + (student.s2?.[child as SubjectKey] || 0) + (student.s3?.[child as SubjectKey] || 0)) / 3;
              }

              if (child === 'avg') {
                  const isAcceptable = val >= settings.passingThreshold;
                  return (
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{val.toFixed(decimalPlaces)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isAcceptable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                             {isAcceptable ? 'مقبول' : 'غير مقبول'}
                          </span>
                      </div>
                  );
              }
              return <span className="font-medium text-slate-700">{val.toFixed(decimalPlaces)}</span>;
          }

          if (parent.startsWith('guidance')) {
              const val = (guidance as any)?.[child];
              if (child.includes('Rank')) {
                   return <span className="rounded-full flex items-center justify-center text-xs font-bold text-slate-700">{val || '-'}</span>;
              }
              if (child.includes('Score')) {
                   const color = child.includes('science') ? 'text-emerald-700' : 'text-rose-700';
                   return <span className={`font-medium ${color}`}>{val !== undefined ? Number(val).toFixed(decimalPlaces) : '-'}</span>;
              }
              if (child === 'preliminaryGuidance') {
                  const isSci = val === 'science';
                  return <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${isSci ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{isSci ? 'علوم' : val === 'arts' ? 'آداب' : '-'}</span>;
              }
              if (child === 'compatibility') {
                  if (val === 'comply') return <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded whitespace-nowrap"><ThumbsUp size={12}/> متوافق</span>;
                  if (val === 'not-comply') return <span className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded whitespace-nowrap"><ThumbsDown size={12}/> غير متوافق</span>;
                  return '-';
              }
              if (child === 'stability') {
                  if (val === 'stable') return <span className="flex items-center gap-1 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded whitespace-nowrap"><Anchor size={12}/> مستقر</span>;
                  if (val === 'unstable') return <span className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded whitespace-nowrap"><ArrowRightLeft size={12}/> متغير</span>;
                  return '-';
              }
          }
          if (parent.startsWith('orientation')) {
              const val = (orient as any)?.[child];
              if (child === 'compatibility') {
                  if (val === 'comply') return <span className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded whitespace-nowrap"><ThumbsUp size={12}/> متوافق</span>;
                  if (val === 'not-comply') return <span className="flex items-center justify-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded whitespace-nowrap"><ThumbsDown size={12}/> غير متوافق</span>;
                  return <span className="text-slate-300">-</span>;
              }
              
              if (child === 'preliminaryGuidance') {
                  const isSci = val === 'science';
                  return <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${isSci ? 'bg-emerald-100 text-emerald-800' : val === 'arts' ? 'bg-rose-100 text-rose-800' : ''}`}>{isSci ? 'علوم وتكنولوجيا' : val === 'arts' ? 'آداب' : '-'}</span>;
              }
              if (child === 'choice1') return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold whitespace-nowrap">{val || '-'}</span>;
              if (child === 'admissionsDecision') return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold whitespace-nowrap">{val || '-'}</span>;
              if (child === 'counselorDecision') return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold whitespace-nowrap">{val || '-'}</span>;
              if (child === 'councilDecision') return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold whitespace-nowrap">{val || '-'}</span>;
              return <span className="text-xs">{val || '-'}</span>;
          }
      }

      // Root level keys
      if (colKey === 'fullName') {
          return (
            <div className="flex flex-col items-start gap-1">
                <div className="font-medium text-slate-900 whitespace-nowrap flex items-center gap-2">
                    {/* Visual Indicators only: Star for Talent, Triangle for Risk */}
                    {(student.smartFlags.includes('talent_science') || student.smartFlags.includes('talent_arts')) && (
                        <Star size={14} className="text-purple-500 fill-purple-500" />
                    )}
                    {student.smartFlags.includes('risk') && (
                        <AlertTriangle size={14} className="text-red-500 fill-red-100" />
                    )}
                    
                    <span>{student.fullName}</span>
                    
                    {student.isRepeater && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">معيد</span>}
                </div>
            </div>
          );
      }
      if (colKey === 'birthDate') return <span className="whitespace-nowrap">{student.birthDate}</span>;
      if (colKey === 'gender') return student.gender;
      if (colKey === 'bemGrade') return <span className="font-bold text-amber-700">{student.bemGrade !== undefined ? student.bemGrade.toFixed(2) : '-'}</span>;

      return '-';
  };

  const renderRows = (data: ConsolidatedStudent[]) => {
      return data.map((s, idx) => {
        const isSelected = selectedIds.has(s.id);
        // Calculate global index for display (if paginated)
        const displayIndex = groupedStudents ? idx + 1 : startIdx + idx + 1;

        return (
          <tr key={s.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-blue-50/50' : ''}`}>
            <td className="p-4 text-center">
              <button onClick={() => toggleSelect(s.id)} className={`transition-colors ${isSelected ? 'text-primary-600' : 'text-slate-300 hover:text-slate-400'}`}>
                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </td>
            <td className="p-4 text-slate-500">{displayIndex}</td>
            {displayColumns.map(col => {
                if (col.key === 'index') return null;
                return (
                    <td key={col.key} className="p-4 border-l border-transparent hover:border-slate-100 text-center">
                        {renderCell(s, col.key)}
                    </td>
                );
            })}
            <td className="p-4 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onView(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50" title="تفاصيل"><Eye size={16} /></button>
                    <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="تعديل"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="حذف"><Trash2 size={16} /></button>
                </div>
            </td>
          </tr>
        );
      });
  };

  return (
    <>
      {/* Hidden Report for Printing */}
      <ReportTemplate students={flatStudents} type={reportType} metadata={meta} />

      {/* Class Council Presentation Mode */}
      {showPresentationMode && (
        <ClassCouncilMode 
           students={flatStudents} 
           settings={settings}
           semester={contextSemester}
           onClose={() => setShowPresentationMode(false)}
           onUpdate={(updatedStudent) => {
              if (onUpdate) onUpdate(updatedStudent);
           }}
        />
      )}

      {/* ... Rest of JSX (Dialogs, Modals, Table Container) ... */}
      
      <ConfirmDialog 
         isOpen={showDeleteConfirm}
         title="حذف متعدد"
         message={`هل أنت متأكد من حذف ${selectedIds.size} تلميذ؟ هذه العملية لا يمكن التراجع عنها.`}
         onConfirm={confirmBulkDelete}
         onCancel={() => setShowDeleteConfirm(false)}
         isDestructive
         confirmLabel="حذف المحدد"
      />
      
      <ConfirmDialog
         isOpen={showPrintHelp}
         title="طباعة التقرير"
         message="لم يتمكن المتصفح من فتح نافذة الطباعة تلقائياً بسبب قيود الأمان. يرجى الضغط على Ctrl + P (أو Command + P) لطباعة الصفحة الحالية."
         onConfirm={() => setShowPrintHelp(false)}
         onCancel={() => setShowPrintHelp(false)}
         confirmLabel="حسناً"
         cancelLabel="إغلاق"
      />

      {showAdvancedFilter && (
        <AdvancedFilterModal 
           columns={columns.filter(c => c.key !== 'index')} 
           activeSorts={sortRules}
           activeFilters={filterRules}
           activeGroup={groupRule}
           activeSmartFilter={activeSmartFilter}
           onApply={(f, s, g, smart) => {
               setFilterRules(f);
               setSortRules(s);
               setGroupRule(g);
               setActiveSmartFilter(smart);
           }}
           onClose={() => setShowAdvancedFilter(false)}
        />
      )}

      {showCustomListModal && (
          <CustomListModal 
             isOpen={showCustomListModal}
             onClose={() => setShowCustomListModal(false)}
             totalStudents={selectedIds.size > 0 ? selectedIds.size : flatStudents.length}
             allColumns={columns}
             visibleColumnKeys={hiddenColumns}
             onGenerate={handleGenerateCustomList}
          />
      )}

      {/* Backdrop for Column Menu */}
      {showColumnMenu && (
        <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setShowColumnMenu(false)} />
      )}
      
      {/* Backdrop for Tools Menu */}
      {showToolsMenu && (
        <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setShowToolsMenu(false)} />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full print:hidden relative">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
             <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-slate-800">
                   {viewMode.includes('grades') && 'كشف النقاط'}
                   {viewMode.includes('choices') && 'رغبات التلاميذ'}
                   {viewMode.includes('guidance') && 'التوجيه'}
                </h2>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-sm font-medium">{flatStudents.length} تلميذ(ة)</span>
                
                {(filterRules.length > 0 || sortRules.length > 0 || groupRule.field || activeSmartFilter) && (
                   <span className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100">
                      <Filter size={10} /> نشط
                   </span>
                )}
             </div>
             
             <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap items-center">
                
                {/* Search First */}
                <div className="relative flex-1 sm:w-64 order-1">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="بحث سريع..." 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 text-sm"
                   />
                </div>

                {/* Tools Dropdown Menu */}
                <div className="relative order-2">
                    <Button 
                        variant="outline" 
                        size="md" 
                        onClick={() => setShowToolsMenu(!showToolsMenu)}
                        className={`gap-2 ${showToolsMenu ? 'bg-slate-100 border-slate-300' : ''}`}
                    >
                        <PenTool size={16} /> أدوات <ChevronDown size={14}/>
                    </Button>
                    
                    {showToolsMenu && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-30 p-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                            <button 
                                onClick={() => { setShowPresentationMode(true); setShowToolsMenu(false); }} 
                                className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"
                            >
                                <Presentation size={16} className="text-slate-500"/>
                                مجلس الأقسام
                            </button>
                            <button 
                                onClick={() => { setShowCustomListModal(true); setShowToolsMenu(false); }} 
                                className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"
                            >
                                <ListFilter size={16} className="text-slate-500"/>
                                قائمة مخصصة
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                                onClick={() => { setShowAdvancedFilter(true); setShowToolsMenu(false); }} 
                                className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"
                            >
                                <Filter size={16} className="text-slate-500"/>
                                تصفية وفرز متقدم
                            </button>

                            {isGuidanceView && (
                              <>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                                onClick={handleExportWord}
                                className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"
                            >
                                <FileDown size={16} className="text-slate-500"/>
                                الجدول الإستخلاصي
                            </button>

                            <button 
                                onClick={handlePrint}
                                className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"
                            >
                                <Printer size={16} className="text-slate-500"/>
                                طباعة الجدول الإستخلاصي
                            </button>
                            </>
                            )}

                        </div>
                    )}
                </div>

                {/* Standard Actions - Order 3 */}
                <div className="flex gap-2 order-3">
      
                    <Button size="md" onClick={onAdd}>+ إضافة</Button>
                    
                    {/* Column Toggle Button */}
                    <div className="relative">
                        <Button 
                            variant="outline" 
                            size="md" 
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className={`px-2 ${showColumnMenu ? 'bg-slate-100' : ''}`}
                            title="تخصيص الأعمدة"
                        >
                            <TableProperties size={18} />
                        </Button>
                        {showColumnMenu && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-30 p-2 max-h-80 overflow-y-auto">
                                <h4 className="text-xs font-bold text-slate-500 px-2 pb-2 border-b border-slate-100 mb-2">عرض الأعمدة</h4>
                                {columns.filter(c => c.key !== 'index').map(col => (
                                <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                                    <input 
                                        type="checkbox" 
                                        checked={!hiddenColumns.has(col.key)} 
                                        onChange={() => toggleColumn(col.key)}
                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-slate-700">{col.label}</span>
                                </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

             </div>
          </div>
        </div>
        
        <div className="overflow-auto flex-1">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 w-12 bg-slate-50 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.size > 0 && selectedIds.size === flatStudents.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="p-4 bg-slate-50">#</th>
                {displayColumns.map(col => {
                    if (col.key === 'index') return null;
                    return (
                        <th key={col.key} className="p-4 bg-slate-50 whitespace-nowrap text-center">
                            {col.label}
                        </th>
                    );
                })}
                <th className="p-4 bg-slate-50 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedStudents ? (
                  Object.entries(groupedStudents).map(([groupKey, groupData]) => {
                      const groupStudents = groupData as ConsolidatedStudent[];
                      return (
                      <React.Fragment key={groupKey}>
                          <tr className="bg-slate-100/80">
                              <td colSpan={displayColumns.length + 2} className="p-3 font-bold text-slate-700 text-right pr-4">
                                  {groupKey} ({groupStudents.length})
                              </td>
                          </tr>
                          {renderRows(groupStudents)}
                      </React.Fragment>
                  )})
              ) : (
                  renderRows(paginatedStudents)
              )}
            </tbody>
          </table>
          {flatStudents.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p>
                 {activeSmartFilter ? 'لا توجد نتائج لهذا الفلتر الذكي' : 'لا توجد بيانات مطابقة'}
              </p>
            </div>
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-6 -translate-x-1/4 -translate-y-2 z-50 animate-in slide-in-from-bottom-8 duration-300">
                <div className="relative">
                    {/* Floating card with backdrop blur */}
                    <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-300/30 p-4 flex items-center gap-2 max-w-[90vw] overflow-x-auto">
                        {/* Selected count badge */}
                        <div className="px-3 py-2 bg-primary-600 text-white rounded-xl font-semibold whitespace-nowrap text-sm flex items-center gap-2 shadow-sm">
                            <CheckSquare size={16} className="opacity-90" />
                            <span>{selectedIds.size}</span>
                            <span className="opacity-90">محدد</span>
                        </div>
                        
                        {/* Divider */}
                        <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

                        {/* Bulk Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Council Decision Dropdown */}
                            <div className="relative group">
                                <select 
                                    className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:border-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 appearance-none min-w-[100px] cursor-pointer shadow-sm hover:shadow"
                                    onChange={(e) => handleBulkChange('councilDecision', e.target.value)}
                                    value=""
                                >
                                    <option value="" disabled hidden>قرار المجلس...</option>
                                    {DECISION_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                            </div>

                            {/* Counselor Decision Dropdown */}
                            <div className="relative group">
                                <select 
                                    className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:border-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 appearance-none min-w-[100px] cursor-pointer shadow-sm hover:shadow"
                                    onChange={(e) => handleBulkChange('counselorDecision', e.target.value)}
                                    value=""
                                >
                                    <option value="" disabled hidden>اقتراح المستشار...</option>
                                    {DECISION_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                                {/* Generate List Button */}
                                <button
                                    onClick={() => setShowCustomListModal(true)}
                                    className="px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-sm whitespace-nowrap group"
                                    title="توليد قائمة مخصصة للمحددين"
                                >
                                    <ListFilter size={16} className="transition-transform group-hover:scale-110" />
                                    <span>قائمة</span>
                                </button>

                                {/* Print Notices Button */}
                                <button
                                    onClick={handleExportNotices}
                                    className="px-4 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-sm whitespace-nowrap group"
                                    title="طباعة الإشعارات للمحددين"
                                >
                                    <StickyNote size={16} className="transition-transform group-hover:scale-110" />
                                    <span>إشعارات</span>
                                </button>

                                {/* Delete Button */}
                                <button
                                    onClick={initiateBulkDelete}
                                    className="px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-sm whitespace-nowrap group"
                                >
                                    <Trash2 size={16} className="transition-transform group-hover:scale-110" />
                                    <span>حذف</span>
                                </button>

                                {/* Cancel Selection Button */}
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="px-3 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-sm group"
                                    title="إلغاء التحديد"
                                >
                                    <X size={18} className="transition-transform group-hover:rotate-90" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Pagination & Config Footer */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
               {/* Decimal Selector */}
               <div className="flex items-center gap-2">
                  <span>الفواصل:</span>
                  <select
                    value={decimalPlaces}
                    onChange={(e) => setDecimalPlaces(Number(e.target.value))}
                    dir='rtl'
                    className="bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium appearance-none"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
               </div>
               
               {!groupedStudents && (
                 <>
                   <span className="hidden sm:inline text-slate-300">|</span>
                   <div className="flex items-center gap-2">
                     <span>الأسطر:</span>
                     <select
                        value={pageSize}
                        onChange={(e) => {
                           setPageSize(Number(e.target.value));
                           setCurrentPage(1);
                        }}
                        dir='rtl'
                        className="bg-white border border-slate-300 rounded text-center px-2 py-1 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium appearance-none"
                     >
                        {[10, 20, 50, 100, 200].map(size => (
                           <option className='text-center' key={size} value={size}>{size}</option>
                        ))}
                     </select>
                   </div>
                   <span className="hidden sm:inline text-slate-300">|</span>
                   <span>
                     عرض <strong>{startIdx + 1}-{endIdx}</strong> من أصل <strong>{totalItems}</strong>
                   </span>
                 </>
               )}
            </div>

            {!groupedStudents && (
                <div className="flex items-center gap-1">
                   <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                      className="px-2"
                      title="الصفحة الأولى"
                   >
                     <ChevronsLeft size={16} className="rtl:rotate-180" />
                   </Button>
                   <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      className="px-2"
                      title="السابق"
                   >
                     <ChevronLeft size={16} className="rtl:rotate-180" />
                   </Button>
                   
                   <div className="flex items-center gap-1 mx-2 text-sm font-medium">
                      <span className="bg-white border border-slate-300 px-3 py-1 rounded">
                         {currentPage}
                      </span>
                      <span className="text-slate-400">/</span>
                      <span>{totalPages}</span>
                   </div>

                   <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      className="px-2"
                      title="التالي"
                   >
                     <ChevronRight size={16} className="rtl:rotate-180" />
                   </Button>
                   <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                      className="px-2"
                      title="الصفحة الأخيرة"
                   >
                     <ChevronsRight size={16} className="rtl:rotate-180" />
                   </Button>
                </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
