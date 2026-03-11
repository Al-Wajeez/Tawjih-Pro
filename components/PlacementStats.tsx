
import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Printer, BarChart3, X, PieChart, FileBarChart, Trophy, TrendingUp, Users, AlertTriangle, TrendingDown, Percent, Activity, Layout, FileDown, ChevronDown, BarChart2, Table2, ChevronsUpDown } from 'lucide-react';
import { ConsolidatedStudent, OrientationData, SubjectKey } from '../types';
import { Button } from './Button';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartModalProps {
  title: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
    value2?: number;
    color2?: string;
  }>;
  tableHeaders?: string[];
  tableRows?: any[][];
  onClose: () => void;
  maxValue?: number;
}

interface PlacementStatsProps {
  students: ConsolidatedStudent[];
  type: 'S1' | 'S2' | 'S3';
  mode?: 'semesterly' | 'classes';
}

// --- Configuration Types ---
type TimeBasis = 's1' | 's2' | 's3' | 's1_s2' | 'annual';
type GuidanceCriterion = 'calculated' | 'choice' | 'counselor' | 'council' | 'admissions';
type ChartType = 'bar_gpa' | 'stacked_orientation' | 'pie_size';

const SUBJECT_CONFIG: { key: SubjectKey; label: string; color: string }[] = [
  { key: 'arabic', label: 'اللغة العربية', color: 'bg-emerald-500' },
  { key: 'math', label: 'الرياضيات', color: 'bg-blue-500' },
  { key: 'physics', label: 'الفيزياء', color: 'bg-cyan-500' },
  { key: 'nature', label: 'العلوم الطبيعية', color: 'bg-teal-500' },
  { key: 'french', label: 'اللغة الفرنسية', color: 'bg-indigo-500' },
  { key: 'english', label: 'اللغة الإنجليزية', color: 'bg-violet-500' },
  { key: 'historyGeo', label: 'التاريخ والجغرافيا', color: 'bg-amber-500' },
  { key: 'avg', label: 'المعدل الفصلي', color: 'bg-slate-700' },
];

interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
  value2?: number; // For comparison
  color2?: string;
}

interface ActiveChartState {
  title: string;
  data: ChartDataPoint[];
  tableHeaders?: string[];
  tableRows?: (string | number | React.ReactNode)[][];
  maxValue?: number;
}

interface StatsDemographic { m: number; f: number; total: number }

interface PlacementStatsData {
  gender: StatsDemographic;
  repeater: { yes: number; no: number; total: number };
  classes: Record<string, number>;
  firstChoice: Record<string, number>;
  calculatedGuidance: { science: number; arts: number; total: number };
  alignment: { comply: number; notComply: number; total: number };
  stability: { stable: number; unstable: number; total: number };
  counselor: Record<string, number>;
  council: Record<string, number>;
  admissions: Record<string, number>;
  
  t1: {
    totalAdmitted: number;
    arts: { total: number; match: number };
    science: { total: number; match: number };
    vocational: { total: number };
    registered: StatsDemographic;
    artsCalc: StatsDemographic;
    artsChoice: StatsDemographic;
    sciCalc: StatsDemographic;
    sciChoice: StatsDemographic;
    vocCalc: StatsDemographic;
    vocChoice: StatsDemographic;
    registeredBem: StatsDemographic;
    bemartsChoice: StatsDemographic;
    bemsciChoice: StatsDemographic;
    bemtotalChoice: StatsDemographic;
    transitionartsChoice: StatsDemographic;
    transitionsciChoice: StatsDemographic;
    transitiontotalChoice: StatsDemographic;
    outcomes: {
      admitted: StatsDemographic;
      transitionadmitted: StatsDemographic;
      vocEd: StatsDemographic;
      vocTr: StatsDemographic;
      repeat: StatsDemographic;
    }
  }
}

interface ClassMetric {
    className: string;
    studentCount: number;
    avgGpa: number;
    
    // Performance
    successCount: number; // GPA >= 10
    successPct: number;
    failCount: number;
    failPct: number;
    riskCount: number;
    riskPct: number;

    // Orientation (Dynamic based on selected criterion)
    scienceCount: number;
    sciencePct: number;
    artsCount: number;
    artsPct: number;
    vocationalCount: number;
    vocationalPct: number;
    repeatersCount: number;
    repeatersPct: number;
}

const getDatasetColors = (index: number, isSecondary: boolean = false) => {
  const primaryColors = [
    { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' }, // Blue
    { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' }, // Green
    { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' }, // Amber
    { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },   // Red
    { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' }, // Purple
  ];
  
  const secondaryColor = { bg: 'rgba(100, 116, 139, 0.5)', border: 'rgb(100, 116, 139)' }; // Slate
  
  if (isSecondary) return secondaryColor;
  return primaryColors[index % primaryColors.length];
};

// --- Chart Modal Component ---
export const ChartModal: React.FC<ChartModalProps> = ({ 
  title, 
  data, 
  tableHeaders,
  tableRows,
  onClose, 
  maxValue 
}) => {
  const chartRef = useRef<any>(null);

  // Calculate max value dynamically if not provided
  const computedMax = maxValue || Math.max(...data.map(d => Math.max(d.value, d.value2 || 0))) * 1.2 || 10;

  const handlePrint = () => {
    window.print();
  };

  // Prepare data for Chart.js
  const chartData: ChartData<'bar'> = {
    labels: data.map(item => item.label),
    datasets: [
      {
        label: 'القيمة 1', // You might want to make this dynamic
        data: data.map(item => item.value),
        backgroundColor: data.map((_, idx) => getDatasetColors(idx).bg),
        borderColor: data.map((_, idx) => getDatasetColors(idx).border),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      ...(data.some(item => item.value2 !== undefined) ? [{
        label: 'القيمة 2', // You might want to make this dynamic
        data: data.map(item => item.value2 || 0),
        backgroundColor: data.map((_, idx) => getDatasetColors(idx).bg),
        borderColor: data.map((_, idx) => getDatasetColors(idx).border),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      }] : [])
    ].filter(dataset => dataset.data.some(value => value > 0)) // Remove empty datasets
  };

  // Chart options
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        rtl: true, // For Arabic/RTL support
        labels: {
          font: {
            family: 'system-ui, sans-serif'
          }
        }
      },
      title: {
        display: false, // We already have title in the modal header
      },
      tooltip: {
        rtl: true,
        titleAlign: 'right',
        bodyAlign: 'right',
        footerAlign: 'right',
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: computedMax,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          .chart-modal-content, .chart-modal-content * { visibility: visible; }
          .chart-modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
            background: white;
            padding: 20px;
            z-index: 9999;
          }
          .no-print { display: none !important; }
          canvas { 
            max-height: 70vh !important;
            width: 100% !important;
          }
        }
      `}</style>
      
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden chart-modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
             <BarChart3 size={20} className="text-primary-600"/>
             {title}
           </h3>
           <div className="flex gap-2 no-print">
               <Button variant="secondary" size="sm" onClick={handlePrint} className="bg-slate-200 hover:bg-slate-300 text-slate-700">
                   <Printer size={16} className="ml-1"/> طباعة
               </Button>
               <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
           </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
           {/* Chart Section with Chart.js */}
           <div className="w-full h-96 mb-6">
             <Bar ref={chartRef} data={chartData} options={chartOptions} />
           </div>
           
        </div>
      </div>
    </div>
  );
};

export const PlacementStats: React.FC<PlacementStatsProps> = ({ students, type, mode = 'semesterly' }) => {
  const [activeChart, setActiveChart] = useState<ActiveChartState | null>(null);
  
  // Analytics Filters
  const [timeBasis, setTimeBasis] = useState<TimeBasis>('s1');
  const [criterion, setCriterion] = useState<GuidanceCriterion>('calculated');
  const [chartType, setChartType] = useState<ChartType>('bar_gpa');

   // Export Helpers
  const exportTableToExcel = (tableId: string, filename: string) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportTableToWord = (tableId: string, filename: string) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'>
      <style>
        body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; }
        table { border-collapse: collapse; width: 100%; border: 1px solid black; }
        th, td { border: 1px solid black; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style>
      </head><body>
      <h2 style="text-align: center;">${filename}</h2>
      ${table.outerHTML}
      </body></html>
    `;
    
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHandlers = (id: string, title: string) => ({
    onExportExcel: () => exportTableToExcel(id, title),
    onExportWord: () => exportTableToWord(id, title)
  });

  // --- Helpers ---
  const normalize = (str: string | undefined) => (str || '').trim().toLowerCase();
  
  const isArts = (str: string) => {
    const s = normalize(str);
    // Explicit check for 'arts' keyword used in calculated guidance
    return s === 'arts' || s.includes('arts') || s.includes('آداب') || s.includes('liter') || s.includes('lettre');
  };
  const isScience = (str: string) => {
    const s = normalize(str);
    return s === 'science' || s.includes('science') || s.includes('علوم') || s.includes('تكنولوجيا');
  };
  const isVocEducation = (str: string) => normalize(str).includes('تعليم مهني');
  const isVocTraining = (str: string) => normalize(str).includes('تكوين مهني') && !normalize(str).includes('تعليم');
  const isVocational = (str: string) => normalize(str).includes('مهني'); 
  const isRepeat = (str: string) => {
    const s = normalize(str);
    return s.includes('يعيد') || s.includes('إعادة') || s.includes('تكرار') || s.includes('repeat') || s.includes('redoubl') || s.includes('مكرر');
  };

  const getOrient = (s: ConsolidatedStudent) => type === 'S1' ? s.orientationS1 : type === 'S2' ? s.orientationS2 : s.orientationS3;
  const getGuidance = (s: ConsolidatedStudent) => type === 'S1' ? s.guidance : type === 'S2' ? s.guidanceS2 : s.guidanceS3;

  const getPct = (part: number, total: number) => total === 0 ? '0.00%' : ((part / total) * 100).toFixed(2) + '%';

  // --- Class Analytics Logic ---
  const classMetrics = useMemo<ClassMetric[]>(() => {
      if (mode !== 'classes') return [];

      const groups: Record<string, ConsolidatedStudent[]> = {};
      students.forEach(s => {
          const cls = s.classCode || 'غير محدد';
          if (!groups[cls]) groups[cls] = [];
          groups[cls].push(s);
      });

      return Object.entries(groups).map(([className, classStudents]) => {
          let totalGpa = 0;
          let countWithGpa = 0;
          
          let successCount = 0;
          let failCount = 0;
          let riskCount = 0;

          let scienceCount = 0;
          let artsCount = 0;
          let vocationalCount = 0;
          let repeatersCount = 0;

          classStudents.forEach(s => {
              // 1. Calculate GPA based on selected Time Basis
              let gpa = 0;
              let hasGpa = false;

              if (timeBasis === 's1') {
                  gpa = s.s1?.avg || 0;
                  hasGpa = !!s.s1?.avg;
              } else if (timeBasis === 's2') {
                  gpa = s.s2?.avg || 0;
                  hasGpa = !!s.s2?.avg;
              } else if (timeBasis === 's3') {
                  gpa = s.s3?.avg || 0;
                  hasGpa = !!s.s3?.avg;
              } else if (timeBasis === 's1_s2') {
                  const s1 = s.s1?.avg;
                  const s2 = s.s2?.avg;
                  if (s1 !== undefined && s2 !== undefined) {
                      gpa = (s1 + s2) / 2;
                      hasGpa = true;
                  }
              } else if (timeBasis === 'annual') {
                  const s1 = s.s1?.avg || 0;
                  const s2 = s.s2?.avg || 0;
                  const s3 = s.s3?.avg || 0;
                  // Crude fallback annual if s3 missing
                  if (s.s3?.avg) {
                      gpa = (s1 + s2 + s3) / 3;
                      hasGpa = true;
                  } else if (s.s2?.avg) {
                      gpa = (s1 + s2) / 2;
                      hasGpa = true;
                  } else {
                      gpa = s1;
                      hasGpa = !!s.s1?.avg;
                  }
              }

              if (hasGpa) {
                  totalGpa += gpa;
                  countWithGpa++;
                  if (gpa >= 10) successCount++;
                  else failCount++;
                  if (gpa < 9) riskCount++; // Risk threshold from code convention
              }

              // 2. Count Orientation based on Criterion
              let orientString = '';
              
              if (criterion === 'calculated') {
                  // Use calculated preliminary guidance
                  const guid = timeBasis === 's1' ? s.orientationS1.preliminaryGuidance 
                             : timeBasis === 's2' ? s.guidanceS2?.preliminaryGuidance 
                             : s.guidanceS3?.preliminaryGuidance || s.guidanceS2?.preliminaryGuidance;
                  if (guid === 'science') orientString = 'science';
                  else if (guid === 'arts') orientString = 'arts';
              } else {
                  // Text based
                  const orientObj = timeBasis === 's1' ? s.orientationS1 
                                  : timeBasis === 's2' ? s.orientationS2 
                                  : s.orientationS3;
                  
                  if (criterion === 'choice') orientString = orientObj.choice1 || '';
                  else if (criterion === 'counselor') orientString = orientObj.counselorDecision || '';
                  else if (criterion === 'council') orientString = orientObj.councilDecision || '';
                  else if (criterion === 'admissions') orientString = orientObj.admissionsDecision || '';
              }

              if (isScience(orientString)) scienceCount++;
              else if (isArts(orientString)) artsCount++;
              else if (isVocational(orientString)) vocationalCount++;
              else if (isRepeat(orientString)) repeatersCount++;
          });

          const total = classStudents.length;
          
          return {
              className,
              studentCount: total,
              avgGpa: countWithGpa > 0 ? totalGpa / countWithGpa : 0,
              
              successCount,
              successPct: countWithGpa > 0 ? (successCount / countWithGpa) * 100 : 0,
              failCount,
              failPct: countWithGpa > 0 ? (failCount / countWithGpa) * 100 : 0,
              riskCount,
              riskPct: total > 0 ? (riskCount / total) * 100 : 0,

              scienceCount,
              sciencePct: total > 0 ? (scienceCount / total) * 100 : 0,
              artsCount,
              artsPct: total > 0 ? (artsCount / total) * 100 : 0,
              vocationalCount,
              vocationalPct: total > 0 ? (vocationalCount / total) * 100 : 0,
              repeatersCount,
              repeatersPct: total > 0 ? (repeatersCount / total) * 100 : 0,
          };
      }).sort((a, b) => b.avgGpa - a.avgGpa); // Sort by avg GPA descending
  }, [students, mode, timeBasis, criterion]);

  // --- Statistics Calculation (Standard Mode) ---
  const stats = useMemo<PlacementStatsData>(() => {
    if (mode === 'classes') return {} as any; // Skip in class mode

    const data: PlacementStatsData = {
        gender: { m: 0, f: 0, total: 0 },
        repeater: { yes: 0, no: 0, total: 0 },
        classes: {} as Record<string, number>,
        firstChoice: {} as Record<string, number>,
        calculatedGuidance: { science: 0, arts: 0, total: 0 },
        alignment: { comply: 0, notComply: 0, total: 0 },
        stability: { stable: 0, unstable: 0, total: 0 },
        counselor: {} as Record<string, number>,
        council: {} as Record<string, number>,
        admissions: {} as Record<string, number>,
        
        t1: {
            totalAdmitted: 0,
            arts: { total: 0, match: 0 },
            science: { total: 0, match: 0 },
            vocational: { total: 0 },
            registered: { m: 0, f: 0, total: 0 },
            artsCalc: { m: 0, f: 0, total: 0 },
            artsChoice: { m: 0, f: 0, total: 0 },
            sciCalc: { m: 0, f: 0, total: 0 },
            sciChoice: { m: 0, f: 0, total: 0 },
            vocCalc: { m: 0, f: 0, total: 0 },
            vocChoice: { m: 0, f: 0, total: 0 },
            registeredBem: { m: 0, f: 0, total: 0 },
            bemartsChoice: { m: 0, f: 0, total: 0 },
            bemsciChoice: { m: 0, f: 0, total: 0 },
            bemtotalChoice: { m: 0, f: 0, total: 0 },
            transitionartsChoice: { m: 0, f: 0, total: 0 },
            transitionsciChoice: { m: 0, f: 0, total: 0 },
            transitiontotalChoice: { m: 0, f: 0, total: 0 },
            outcomes: {
                admitted: { m: 0, f: 0, total: 0 },
                transitionadmitted: { m: 0, f: 0, total: 0 },
                vocEd: { m: 0, f: 0, total: 0 },
                vocTr: { m: 0, f: 0, total: 0 },
                repeat: { m: 0, f: 0, total: 0 },
            }
        }
    };

    const addT1 = (bucket: any, gender: string) => {
        if (normalize(gender) === 'ذكر') bucket.m++; else bucket.f++;
        bucket.total++;
    };

    students.forEach(s => {
        const orient = getOrient(s);
        const guid = getGuidance(s);
        const stability = (guid as any)?.stability;

        const gender = normalize(s.gender);
        const isMale = gender === 'ذكر';

        if (isMale) data.gender.m++; else data.gender.f++;
        data.gender.total++;

        if (s.isRepeater) data.repeater.yes++; else data.repeater.no++;
        data.repeater.total++;

        const cls = s.classCode || 'غير محدد';
        data.classes[cls] = (data.classes[cls] || 0) + 1;

        const c1 = orient.choice1 || 'بدون رغبة';
        data.firstChoice[c1] = (data.firstChoice[c1] || 0) + 1;

        if (orient.preliminaryGuidance === 'science') data.calculatedGuidance.science++;
        else if (orient.preliminaryGuidance === 'arts') data.calculatedGuidance.arts++;
        if (orient.preliminaryGuidance) data.calculatedGuidance.total++;

        if (orient.compatibility === 'comply') data.alignment.comply++;
        else if (orient.compatibility === 'not-comply') data.alignment.notComply++;
        if (orient.compatibility) data.alignment.total++;

        if (stability === 'stable') data.stability.stable++;
        else if (stability === 'unstable') data.stability.unstable++;
        if (stability) data.stability.total++;

        if (orient.counselorDecision) data.counselor[orient.counselorDecision] = (data.counselor[orient.counselorDecision] || 0) + 1;
        if (orient.councilDecision) data.council[orient.councilDecision] = (data.council[orient.councilDecision] || 0) + 1;
        if (orient.admissionsDecision) data.admissions[orient.admissionsDecision] = (data.admissions[orient.admissionsDecision] || 0) + 1;

        addT1(data.t1.registered, s.gender);

        if (type === 'S3' && s.bemGrade !== undefined) {
            addT1(data.t1.registeredBem, s.gender);
            
            // Success in BEM
            if (s.bemGrade >= 10) {
                const decision = orient.councilDecision || '';
                if (isArts(decision)) {
                    addT1(data.t1.bemartsChoice, s.gender);
                    addT1(data.t1.bemtotalChoice, s.gender);
                } else if (isScience(decision)) {
                    addT1(data.t1.bemsciChoice, s.gender);
                    addT1(data.t1.bemtotalChoice, s.gender);
                }
            }

            // Success via Transition Grade
            if (s.transitionGrade && s.transitionGrade >= 10) {
                const decision = orient.councilDecision || '';
                if (isArts(decision)) {
                    addT1(data.t1.transitionartsChoice, s.gender);
                    addT1(data.t1.transitiontotalChoice, s.gender);
                } else if (isScience(decision)) {
                    addT1(data.t1.transitionsciChoice, s.gender);
                    addT1(data.t1.transitiontotalChoice, s.gender);
                }
                addT1(data.t1.outcomes.transitionadmitted, s.gender);
            }
        }

        const table2Decision = type === 'S3' 
            ? (orient.admissionsDecision || orient.councilDecision) 
            : (type === 'S2' ? orient.councilDecision : '');

        if (type === 'S1') {
            if (orient.preliminaryGuidance === 'arts') addT1(data.t1.artsCalc, s.gender);
            if (orient.preliminaryGuidance === 'science') addT1(data.t1.sciCalc, s.gender);
        } else if (table2Decision) {
            if (isArts(table2Decision)) addT1(data.t1.artsCalc, s.gender);
            if (isScience(table2Decision)) addT1(data.t1.sciCalc, s.gender);
            if (isVocational(table2Decision)) addT1(data.t1.vocCalc, s.gender);
        }
        

        const decision = type === 'S3' ? (orient.admissionsDecision || orient.councilDecision) : orient.councilDecision;
        
        // Table 1 metrics (Final Decision)
        if (decision && !isRepeat(decision)) {
             data.t1.totalAdmitted++;
             if (isArts(decision)) {
                 data.t1.arts.total++;
                 if (isArts(orient.choice1)) data.t1.arts.match++;
             } else if (isScience(decision)) {
                 data.t1.science.total++;
                 if (isScience(orient.choice1)) data.t1.science.match++;
             } else if (isVocational(decision)) {
                 data.t1.vocational.total++;
             }
        }

        // Table 2 Outcomes (Council Decision)
        if (table2Decision) {
            if (isRepeat(table2Decision)) {
                addT1(data.t1.outcomes.repeat, s.gender);
            } else if (isArts(table2Decision) || isScience(table2Decision)) {
                addT1(data.t1.outcomes.admitted, s.gender);
            } else if (isVocEducation(table2Decision)) {
                addT1(data.t1.outcomes.vocEd, s.gender);
            } else if (isVocTraining(table2Decision)) {
                addT1(data.t1.outcomes.vocTr, s.gender);
            } else if (isVocational(table2Decision)) {
                if (table2Decision.includes('تعليم')) addT1(data.t1.outcomes.vocEd, s.gender);
                else addT1(data.t1.outcomes.vocTr, s.gender);
            }
        }
    });

    return data;
  }, [students, type, mode]);

  // --- Subject Stats Helper ---
  const calculateSubjectStats = (semesterDataKey: 's1' | 's2' | 's3') => {
    return SUBJECT_CONFIG.map(conf => {
        const grades = students.map(s => (s[semesterDataKey] as any)?.[conf.key]).filter(g => typeof g === 'number');
        const count = grades.length;
        if (count === 0) return { ...conf, count: 0, mean: 0, stdDev: 0, above10: 0, pctAbove: '0%', below10: 0, pctBelow: '0%' };

        const sum = grades.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const variance = grades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);
        const above10 = grades.filter(g => g >= 10).length;
        
        return {
            ...conf,
            count,
            mean,
            stdDev,
            above10,
            pctAbove: getPct(above10, count),
            below10: count - above10,
            pctBelow: getPct(count - above10, count)
        };
    });
  };

  const subjectStatsS1 = calculateSubjectStats('s1');
  const subjectStatsS2 = calculateSubjectStats('s2');
  const subjectStatsS3 = calculateSubjectStats('s3');

  const currentSubjectStats = type === 'S1' ? subjectStatsS1 : type === 'S2' ? subjectStatsS2 : subjectStatsS3;

  const handlePrint = () => window.print();

  const getTitle = () => {
     if (mode === 'classes') return 'لوحة قيادة مقارنة الأقسام';
     if (type === 'S1') return 'إحصائيات التوجيه التدريجي (الفصل الأول)';
     if (type === 'S2') return 'إحصائيات التوجيه المسبق (الفصل الثاني)';
     return 'إحصائيات التوجيه النهائي (الفصل الثالث)';
  };

  const getGuidanceLabel = () => type === 'S1' ? 'التوجيه التدريجي' : type === 'S2' ? 'التوجيه المسبق' : 'التوجيه النهائي';

  const handleExportWord = () => {
    const styles = `
        <style>
            /* Essential for Word Landscape Orientation */
            @page Section1 {
                size: 841.9pt 595.3pt; /* A4 Landscape Points */
                mso-page-orientation: landscape;
                margin: 2.0cm;
            }
            div.Section1 {
                page: Section1;
            }
            body { font-family: 'Times New Roman', Arial, sans-serif; direction: rtl; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; text-align: center; }
            th, td { border: 1px solid #000000; padding: 6px; vertical-align: middle; }
            th { background-color: #f3f4f6; font-weight: bold; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 20px; text-decoration: underline; }
            h3 { text-align: right; font-size: 16px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-weight: bold; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            .bg-blue { background-color: #dbeafe !important; }
            .bg-amber { background-color: #fef3c7 !important; }
            .bg-gray { background-color: #f3f4f6 !important; }
            .bg-emerald { background-color: #d1fae5 !important; }
            .text-emerald { color: #059669; font-weight: bold; }
            .text-red { color: #e11d48; font-weight: bold; }
        </style>
    `;

    const header = `
        <div class="header">
            <p>الجمهوريــــة الجزائريــــة الديمقراطيـــــة الشعبيـــــــــــة</p>
            <p>وزارة التربية الوطنية</p>
            <h1>${getTitle()}</h1>
        </div>
    `;

    // --- Content Building ---
    let content = '';

    if (mode === 'classes') {
        const rows = classMetrics.map(m => `
            <tr>
                <td style="text-align: center; font-weight: bold;">الرابعة م ${m.className}</td>
                <td>${m.studentCount}</td>
                <td style="font-weight: bold;">${m.avgGpa.toFixed(2)}</td>
                <td class="text-emerald">${m.successPct.toFixed(1)}%</td>
                <td class="text-red">${m.riskPct.toFixed(1)}%</td>
                <td class="bg-blue">${m.sciencePct.toFixed(1)}% (${m.scienceCount})</td>
                <td class="bg-amber">${m.artsPct.toFixed(1)}% (${m.artsCount})</td>
                <td>${m.repeatersCount}</td>
            </tr>
        `).join('');

        content += `
            <h3>تحليل مقارن للأقسام</h3>
            <table>
                <thead>
                    <tr>
                        <th>القسم</th>
                        <th>العدد</th>
                        <th>المعدل العام</th>
                        <th>نسبة النجاح</th>
                        <th>نسبة الخطر</th>
                        <th>توجه علمي</th>
                        <th>توجه أدبي</th>
                        <th>معيدون</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    } else {
        // --- Table 1 ---
        content += `<h3>جدول 1: حصيلة التوجيه للتلاميذ المقبولين في السنة الاولى ثانوي</h3>`;
        content += `
            <table>
                <thead>
                    <tr>
                        <th colspan="2" class="bg-gray">التعليم المهني</th>
                        <th colspan="4" class="bg-blue">جذع مشترك علوم وتكنولوجيا</th>
                        <th colspan="4" class="bg-amber">جذع مشترك آداب</th>
                        <th rowspan="2">المجموع الكلي</th>
                    </tr>
                    <tr>
                        <th>النسبة</th><th>المجموع</th>
                        <th>النسبة</th><th>المجموع</th><th>النسبة</th><th>تحقيق الرغبة 1</th>
                        <th>النسبة</th><th>المجموع</th><th>النسبة</th><th>تحقيق الرغبة 1</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${getPct(stats.t1.vocational.total, stats.t1.totalAdmitted)}</td><td>${stats.t1.vocational.total}</td>
                        <td>${getPct(stats.t1.science.total, stats.t1.totalAdmitted)}</td><td>${stats.t1.science.total}</td><td>${getPct(stats.t1.science.match, stats.t1.science.total)}</td><td>${stats.t1.science.match}</td>
                        <td>${getPct(stats.t1.arts.total, stats.t1.totalAdmitted)}</td><td>${stats.t1.arts.total}</td><td>${getPct(stats.t1.arts.match, stats.t1.arts.total)}</td><td>${stats.t1.arts.match}</td>
                        <td>${stats.t1.totalAdmitted}</td>
                    </tr>
                </tbody>
            </table>
        `;

        // --- Table 2 ---
        content += `<h3>جدول 2: محضر اجتماع مجلس القسم للسنة اولى ثانوي</h3>`;
        content += `
            <table>
                <thead>
                    <tr>
                         <th colspan="2" style="width: 40%; text-align: right;">البيان</th>
                         <th style="width: 15%">الذكور</th><th style="width: 15%">الإناث</th><th style="width: 15%">المجموع</th><th style="width: 15%">النسبة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="2" style="text-align: right;">عدد التلاميذ المسجلين</td>
                    <td>${stats.t1.registered.m}</td>
                    <td>${stats.t1.registered.f}</td>
                    <td>${stats.t1.registered.total}</td>
                    <td>-</td>
                    </tr>
                    
                    <tr><td rowspan="2" class="bg-amber" style="text-align: right;">اقتراح التوجيه إلى ج.م آداب</td>
                    <td class="bg-amber" style="text-align: right;">${getGuidanceLabel()}</td>
                    <td>${stats.t1.artsCalc.m}</td>
                    <td>${stats.t1.artsCalc.f}</td>
                    <td>${stats.t1.artsCalc.total}</td>
                    <td>${getPct(stats.t1.artsCalc.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr><td class="bg-amber" style="text-align: right;">الرغبة الأولى</td>
                    <td>${stats.t1.artsChoice.m}</td>
                    <td>${stats.t1.artsChoice.f}</td>
                    <td>${stats.t1.artsChoice.total}</td>
                    <td>${getPct(stats.t1.artsChoice.total, stats.t1.registered.total)}</td>
                    </tr>
                    
                    <tr><td rowspan="2" class="bg-blue" style="text-align: right;">اقتراح التوجيه إلى ج.م علوم</td>
                    <td class="bg-blue" style="text-align: right;">${getGuidanceLabel()}</td>
                    <td>${stats.t1.sciCalc.m}</td>
                    <td>${stats.t1.sciCalc.f}</td>
                    <td>${stats.t1.sciCalc.total}</td>
                    <td>${getPct(stats.t1.sciCalc.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr><td class="bg-blue" style="text-align: right;">الرغبة الأولى</td>
                    <td>${stats.t1.sciChoice.m}</td>
                    <td>${stats.t1.sciChoice.f}</td>
                    <td>${stats.t1.sciChoice.total}</td>
                    <td>${getPct(stats.t1.sciChoice.total, stats.t1.registered.total)}</td>
                    </tr>
                    
                    <tr><td rowspan="2" class="bg-gray" style="text-align: right;">اقتراح التوجيه إلى تعليم مهني</td>
                    <td class="bg-gray" style="text-align: right;">${getGuidanceLabel()}</td>
                    <td>${stats.t1.vocCalc.m}</td>
                    <td>${stats.t1.vocCalc.f}</td>
                    <td>${stats.t1.vocCalc.total}</td>
                    <td>${getPct(stats.t1.vocCalc.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr><td class="bg-gray" style="text-align: right;">الرغبة الأولى</td>
                    <td>${stats.t1.vocChoice.m}</td>
                    <td>${stats.t1.vocChoice.f}</td>
                    <td>${stats.t1.vocChoice.total}</td>
                    <td>${getPct(stats.t1.vocChoice.total, stats.t1.registered.total)}</td>
                    </tr>
                    
                    <tr><td colspan="2" style="text-align: right;">المقترحون للقبول</td>
                    <td>${stats.t1.outcomes.admitted.m}</td>
                    <td>${stats.t1.outcomes.admitted.f}</td>
                    <td>${stats.t1.outcomes.admitted.total}</td>
                    <td>${getPct(stats.t1.outcomes.admitted.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr><td colspan="2" style="text-align: right;">المقترحون للإعادة</td>
                    <td>${stats.t1.outcomes.repeat.m}</td>
                    <td>${stats.t1.outcomes.repeat.f}</td>
                    <td>${stats.t1.outcomes.repeat.total}</td>
                    <td>${getPct(stats.t1.outcomes.repeat.total, stats.t1.registered.total)}</td>
                    </tr>
                </tbody>
            </table>
        `;

        // --- Table 3 & 4 (Side by Side using nested tables for Word compatibility) ---
        content += `
            <table style="border: none; margin-bottom: 20px;">
                <tr>
                    <td style="border: none; vertical-align: top; padding: 5px; width: 50%;">
                        <h3>جدول 3: توزيع التلاميذ حسب الجنس</h3>
                        <table>
                            <thead><tr><th>الجنس</th><th>العدد</th><th>النسبة</th></tr></thead>
                            <tbody>
                                <tr><td>ذكور</td><td>${stats.gender.m}</td><td>${getPct(stats.gender.m, stats.gender.total)}</td></tr>
                                <tr><td>إناث</td><td>${stats.gender.f}</td><td>${getPct(stats.gender.f, stats.gender.total)}</td></tr>
                                <tr style="font-weight: bold; background-color: #f0f0f0;"><td>المجموع</td><td>${stats.gender.total}</td><td>100%</td></tr>
                            </tbody>
                        </table>
                    </td>
                    <td style="border: none; vertical-align: top; padding: 5px; width: 50%;">
                        <h3>جدول 4: توزيع التلاميذ حسب الإعادة</h3>
                        <table>
                            <thead><tr><th>الحالة</th><th>العدد</th><th>النسبة</th></tr></thead>
                            <tbody>
                                <tr><td>متمدرس</td><td>${stats.repeater.no}</td><td>${getPct(stats.repeater.no, stats.repeater.total)}</td></tr>
                                <tr><td>معيد</td><td>${stats.repeater.yes}</td><td>${getPct(stats.repeater.yes, stats.repeater.total)}</td></tr>
                                <tr style="font-weight: bold; background-color: #f0f0f0;"><td>المجموع</td><td>${stats.repeater.total}</td><td>100%</td></tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </table>
        `;

        // --- Table 4b ---
        const classRows = Object.entries(stats.classes).map(([cls, count]) => `<tr><td>${cls}</td><td>${count}</td><td>${getPct(count as number, stats.gender.total)}</td></tr>`).join('');
        content += `<h3>جدول 4 (تابع): توزيع التلاميذ حسب الفوج</h3><table><thead><tr><th>الفوج</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${classRows}</tbody></table>`;

        // --- Table 5 & 6 (Side by Side) ---
        const choiceRows = Object.entries(stats.firstChoice).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td><td>${getPct(v as number, stats.gender.total)}</td></tr>`).join('');
        content += `
            <table style="border: none; margin-bottom: 20px;">
                <tr>
                    <td style="border: none; vertical-align: top; padding: 5px; width: 50%;">
                        <h3>جدول 5: توزيع الرغبات (الرغبة 1)</h3>
                        <table><thead><tr><th>الرغبة</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${choiceRows}</tbody></table>
                    </td>
                    <td style="border: none; vertical-align: top; padding: 5px; width: 50%;">
                        <h3>جدول 6: التوجيه المحسوب</h3>
                        <table>
                            <thead><tr><th>الجذع</th><th>العدد</th><th>النسبة</th></tr></thead>
                            <tbody>
                                <tr><td class="bg-blue">علوم وتكنولوجيا</td><td>${stats.calculatedGuidance.science}</td><td>${getPct(stats.calculatedGuidance.science, stats.calculatedGuidance.total)}</td></tr>
                                <tr><td class="bg-amber">آداب</td><td>${stats.calculatedGuidance.arts}</td><td>${getPct(stats.calculatedGuidance.arts, stats.calculatedGuidance.total)}</td></tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </table>
        `;

        // --- Table 7 & 8 ---
        let table8 = '';
        if (type === 'S2' || type === 'S3') {
            table8 = `
                <h3>جدول 8: استقرار الرغبة</h3>
                <table>
                    <thead><tr><th>الحالة</th><th>العدد</th><th>النسبة</th></tr></thead>
                    <tbody>
                        <tr><td>مستقر</td><td>${stats.stability.stable}</td><td>${getPct(stats.stability.stable, stats.stability.total)}</td></tr>
                        <tr><td>متذبذب</td><td>${stats.stability.unstable}</td><td>${getPct(stats.stability.unstable, stats.stability.total)}</td></tr>
                    </tbody>
                </table>
            `;
        }

        content += `
            <table style="border: none; margin-bottom: 20px;">
                <tr>
                    <td style="border: none; vertical-align: top; padding: 5px; width: 50%;">
                        <h3>جدول 7: انسجام الرغبة</h3>
                        <table>
                            <thead><tr><th>الحالة</th><th>العدد</th><th>النسبة</th></tr></thead>
                            <tbody>
                                <tr><td>منسجم</td><td>${stats.alignment.comply}</td><td>${getPct(stats.alignment.comply, stats.alignment.total)}</td></tr>
                                <tr><td>غير منسجم</td><td>${stats.alignment.notComply}</td><td>${getPct(stats.alignment.notComply, stats.alignment.total)}</td></tr>
                            </tbody>
                        </table>
                    </td>
                    <td style="border: none; vertical-align: top; padding: 5px; width: 50%;">
                        ${table8}
                    </td>
                </tr>
            </table>
        `;

        // --- Table 9, 10, 10b ---
        const renderDecisionTable = (title: string, data: Record<string, number>) => {
            const rows = Object.entries(data).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td><td>${getPct(v, stats.gender.total)}</td></tr>`).join('');
            return `<h3>${title}</h3><table><thead><tr><th>القرار</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${rows}</tbody></table>`;
        };

        content += renderDecisionTable('جدول 9: اقتراحات مستشار التوجيه', stats.counselor);
        content += renderDecisionTable('جدول 10: قرارات مجلس القسم', stats.council);
        if (type === 'S3') {
            content += renderDecisionTable('جدول 10 (تابع): قرارات مجلس القبول النهائي', stats.admissions);
        }

        // --- Table 11: Subjects ---
        const subRows = currentSubjectStats.map(s => `
            <tr>
                <td style="text-align: right;">${s.label}</td>
                <td>${s.count}</td>
                <td style="font-weight: bold;">${s.mean.toFixed(2)}</td>
                <td>${s.stdDev.toFixed(2)}</td>
                <td class="text-emerald">${s.above10}</td>
                <td class="text-emerald">${s.pctAbove}</td>
                <td class="text-red">${s.below10}</td>
                <td class="text-red">${s.pctBelow}</td>
            </tr>
        `).join('');
        
        content += `
            <h3>جدول 11: نتائج التلاميذ حسب المواد الدراسية</h3>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">المادة</th><th rowspan="2">العدد</th><th rowspan="2">المتوسط</th><th rowspan="2">الانحراف</th>
                        <th colspan="2">العدد ≥ 10</th><th colspan="2">العدد < 10</th>
                    </tr>
                    <tr><th>العدد</th><th>%</th><th>العدد</th><th>%</th></tr>
                </thead>
                <tbody>${subRows}</tbody>
            </table>
        `;

        // --- Table 12/13 Comparison ---
        const renderCompTable = (title: string, data1: any[], data2: any[], label1: string, label2: string) => {
            const rows = data2.map(s2 => {
                const s1 = data1.find(x => x.key === s2.key) || s2;
                const diff = s2.mean - s1.mean;
                const diffColor = diff >= 0 ? '#059669' : '#e11d48';
                return `
                    <tr>
                        <td style="text-align: right;">${s2.label}</td>
                        <td>${s1.mean.toFixed(2)}</td>
                        <td>${s2.mean.toFixed(2)}</td>
                        <td style="font-weight: bold; color: ${diffColor};" dir="ltr">${diff > 0 ? '+' : ''}${diff.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
            return `
                <h3>${title}</h3>
                <table>
                    <thead><tr><th>المادة</th><th>${label1}</th><th>${label2}</th><th>الفارق</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        };

        if (type === 'S2' || type === 'S3') {
            content += renderCompTable('جدول 12: مقارنة الفصل الأول والثاني', subjectStatsS1, subjectStatsS2, 'متوسط S1', 'متوسط S2');
        }
        if (type === 'S3') {
            content += renderCompTable('جدول 13: مقارنة الفصل الثاني والثالث', subjectStatsS2, subjectStatsS3, 'متوسط S2', 'متوسط S3');
        }
    }

    // --- Final Assembly ---
    // Word requires specific XML namespaces and a VML/Office block to respect page orientation fully
    const finalHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>${getTitle()}</title>
            <!--[if gte mso 9]>
            <xml>
            <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
            </xml>
            <![endif]-->
            ${styles}
        </head>
        <body>
            <div class="Section1">
                ${header}
                ${content}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', finalHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stats_Report_FULL_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Render Helpers ---
  const SectionHeader = ({ 
    title, 
    onChartClick,
    onExportExcel,
    onExportWord 
  }: { 
    title: string, 
    onChartClick?: () => void,
    onExportExcel?: () => void,
    onExportWord?: () => void
  }) => (
    <div className="flex justify-between items-center mb-4 mt-8 pb-2 border-b-2 border-slate-200 break-after-avoid">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Layout size={18} className="text-primary-600 no-print"/>
            {title}
        </h3>
        <div className="flex gap-2 print:hidden">
            {onExportExcel && (
                <Button variant="ghost" size="sm" onClick={onExportExcel} title="تصدير Excel" className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2">
                    <FileDown size={18}/>
                </Button>
            )}
            {onExportWord && (
                <Button variant="ghost" size="sm" onClick={onExportWord} title="تصدير Word" className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2">
                    <FileBarChart size={18}/>
                </Button>
            )}
            {onChartClick && (
                <Button variant="ghost" size="sm" onClick={onChartClick} className="text-primary-600 bg-primary-50 hover:bg-primary-100">
                    <BarChart3 size={18} className="ml-1"/> عرض المبيان
                </Button>
            )}
        </div>
    </div>
  );

   const SimpleTable = ({ headers, rows, isEmpty, id }: { headers: string[], rows: (string|number|React.ReactNode)[][], isEmpty?: boolean, id?: string }) => {
    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-300 rounded-lg bg-slate-50 mb-6 text-slate-400 gap-2">
                <PieChart size={32} className="opacity-20" />
                <span className="text-sm font-medium">لا توجد بيانات متاحة لهذا الجدول</span>
            </div>
        );
    }
    return (
        <div className="overflow-hidden border border-slate-300 rounded-lg mb-6 break-inside-avoid shadow-sm">
            <table id={id} className="w-full text-sm text-center">
                <thead className="bg-slate-100 text-slate-800 font-bold">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="p-3 border-b border-r border-slate-300 last:border-r-0">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            {row.map((cell, i) => <td key={i} className="p-3 border-r border-slate-200 last:border-r-0 font-medium">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  };

  const BarGraph = ({ value, max, color = 'bg-blue-500', height = 'h-4' }: { value: number, max: number, color?: string, height?: string }) => (
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height} flex items-center border border-slate-200`}>
          <div className={`${height} ${color}`} style={{ width: `${Math.min((value/max)*100, 100)}%` }}></div>
      </div>
  );

  // --- Custom SVG Chart Renderer ---
  const renderAnalysisChart = (metrics: ClassMetric[], type: ChartType) => {
        const height = 300;
        const maxGpa = 20;
        const paddingLeft = 50;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 30;

        if (type === 'bar_gpa') {
        const chartWidth = 700; // fixed SVG width (or dynamic if you want)
        const barCount = metrics.length;
        const slotWidth = (chartWidth - paddingLeft - paddingRight) / barCount;
        const barWidth = slotWidth * 0.6; // 60% of slot width
        const barGap = slotWidth - barWidth; // remaining space

        return (
            <div className="w-full overflow-x-auto pb-4">
            <svg height={height} width={chartWidth} className="mx-auto">
                {/* Grid Lines */}
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(val => {
                const y = height - paddingBottom - (val / maxGpa) * (height - paddingTop - paddingBottom);
                return (
                    <g key={val}>
                    <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                    <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#94a3b8">{val}</text>
                    </g>
                );
                })}

                {/* Bars */}
                {metrics.map((m, i) => {
                const x = paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
                const h = (m.avgGpa / maxGpa) * (height - paddingTop - paddingBottom);
                const y = height - paddingBottom - h;

                return (
                    <g key={m.className} className="group">
                    <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        className="fill-primary-500 transition-all hover:opacity-80 cursor-pointer"
                        rx="4"
                    />
                    <text
                        x={x + barWidth / 2}
                        y={y - 10}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#1e293b"
                    >
                        {m.avgGpa.toFixed(2)}
                    </text>
                    <text
                        x={x + barWidth / 2}
                        y={height - 10}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#475569"
                    >
                        {m.className}
                    </text>
                    </g>
                );
                })}
            </svg>
            </div>
        );
        }


        if (type === 'stacked_orientation') {
        const chartWidth = 700; // fixed or dynamic
        const barCount = metrics.length;
        const slotWidth = (chartWidth - paddingLeft - paddingRight) / barCount;
        const barWidth = slotWidth * 0.6; // 60% of slot
        const barGap = slotWidth - barWidth;

        return (
            <div className="w-full overflow-x-auto pb-4">
            {/* Legend */}
            <div className="flex justify-center gap-4 mb-2 text-sm">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded"></div>علوم</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded"></div>آداب</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-400 rounded"></div>أخرى</div>
            </div>

            <svg height={height} width={chartWidth} className="mx-auto">
                {metrics.map((m, i) => {
                const total = m.studentCount || 1;
                const hSci = (m.scienceCount / total) * (height - paddingTop - paddingBottom);
                const hArts = (m.artsCount / total) * (height - paddingTop - paddingBottom);
                const hOther = ((total - m.scienceCount - m.artsCount) / total) * (height - paddingTop - paddingBottom);

                // Center bar in slot
                const x = paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
                let currentY = height - paddingBottom;

                return (
                    <g key={m.className}>
                    {/* Science */}
                    <rect x={x} y={currentY - hSci} width={barWidth} height={hSci} fill="#10b981" />
                    {hSci > 15 && <text x={x + barWidth / 2} y={currentY - hSci / 2 + 4} textAnchor="middle" fill="white" fontSize="10">{m.scienceCount}</text>}

                    {/* Arts */}
                    <rect x={x} y={currentY - hSci - hArts} width={barWidth} height={hArts} fill="#f43f5e" />
                    {hArts > 15 && <text x={x + barWidth / 2} y={currentY - hSci - hArts / 2 + 4} textAnchor="middle" fill="white" fontSize="10">{m.artsCount}</text>}

                    {/* Other */}
                    <rect x={x} y={currentY - hSci - hArts - hOther} width={barWidth} height={hOther} fill="#94a3b8" />

                    {/* Class label */}
                    <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{m.className}</text>
                    </g>
                );
                })}
            </svg>
            </div>
        );
        }


        if (type === 'pie_size') {
            const totalStudents = metrics.reduce((acc, m) => acc + m.studentCount, 0);
            let cumulativeAngle = 0;
            const radius = 100;
            const centerX = 200;
            const centerY = 150;

            return (
                <div className="flex justify-center items-center h-[300px]">
                    <svg width="400" height="300" viewBox="0 0 400 300">
                        {metrics.map((m, i) => {
                            const angle = (m.studentCount / totalStudents) * 2 * Math.PI;
                            const x1 = centerX + radius * Math.cos(cumulativeAngle);
                            const y1 = centerY + radius * Math.sin(cumulativeAngle);
                            const x2 = centerX + radius * Math.cos(cumulativeAngle + angle);
                            const y2 = centerY + radius * Math.sin(cumulativeAngle + angle);
                            
                            const largeArcFlag = angle > Math.PI ? 1 : 0;
                            const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                            
                            // Simple colors
                            const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];
                            const color = colors[i % colors.length];
                            
                            // Label pos
                            const midAngle = cumulativeAngle + angle / 2;
                            const lx = centerX + (radius + 30) * Math.cos(midAngle);
                            const ly = centerY + (radius + 30) * Math.sin(midAngle);

                            cumulativeAngle += angle;

                            return (
                                <g key={m.className}>
                                    <path d={pathData} fill={color} stroke="white" strokeWidth="2" />
                                    <text x={lx} y={ly} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#334155">{m.className} ({m.studentCount})</text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            );
        }
    };

  if (students.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <PieChart size={64} className="opacity-10" />
              <h2 className="text-xl font-bold">لا توجد بيانات لعرض الإحصائيات</h2>
              <p>يرجى استيراد ملفات التلاميذ أولاً</p>
          </div>
      );
  }

  // --- RENDER CLASS ANALYTICS MODE ---
  if (mode === 'classes') {
      const bestClass = [...classMetrics].sort((a,b) => b.avgGpa - a.avgGpa)[0];
      const worstClass = [...classMetrics].sort((a,b) => a.avgGpa - b.avgGpa)[0];
      const highestScience = [...classMetrics].sort((a,b) => b.sciencePct - a.sciencePct)[0];
      const highestSuccess = [...classMetrics].sort((a,b) => b.successPct - a.successPct)[0];

      return (
        <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header with Controls */}
            <div className="flex flex-col p-6 md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Layout size={24} className="text-primary-600"/>
                        لوحة قيادة تحليل الأقسام
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">مقارنة شاملة للأداء والتوجيه بين الأفواج التربوية</p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Time Context Selector */}
                    <div className="relative">
                        <select 
                            value={timeBasis}
                            onChange={(e) => setTimeBasis(e.target.value as TimeBasis)}
                            dir='rtl'
                            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 pl-10 pr-3 outline-none font-bold appearance-none cursor-pointer"
                        >
                            <option value="s1">الفصل الأول</option>
                            <option value="s2">الفصل الثاني</option>
                            <option value="s3">الفصل الثالث </option>
                            <option value="s1_s2">معدل فصلين</option>
                            <option value="annual">المعدل السنوي</option>
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    {/* Orientation Source Selector */}
                    <div className="relative">
                        <select 
                            value={criterion}
                            onChange={(e) => setCriterion(e.target.value as GuidanceCriterion)}
                            dir='rtl'
                            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 pl-10 pr-3 outline-none font-bold appearance-none cursor-pointer"
                        >
                            <option value="calculated">التوجيه المحسوب (النقاط)</option>
                            <option value="choice">رغبة التلميذ</option>
                            <option value="council">قرار مجلس القسم</option>
                            <option value="admissions">قرار القبول النهائي</option>
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    <Button onClick={handleExportWord} variant="primary" size="md">
                        <FileDown size={16} className="ml-2"/> تصدير (Word)
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-8 pb-10">
                {/* Enhanced Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Best Class Card */}
                    <div className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-yellow-300"></div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl group-hover:bg-yellow-200 transition-colors">
                                <Trophy size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">أعلى معدل قسم</p>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1">{bestClass?.className || '--'}</h3>
                                    </div>
                                    <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg">
                                        الأفضل
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-slate-500">20/</span>
                                    <span className="text-3xl font-bold text-slate-900">{bestClass?.avgGpa.toFixed(2)}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="text-xs text-slate-500">عدد التلاميذ</div>
                                    <div className="text-sm font-medium text-slate-700">{bestClass?.studentCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Worst Class Card */}
                    <div className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-red-400 to-red-300"></div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:bg-red-200 transition-colors">
                                <TrendingDown size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">أدنى معدل قسم</p>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1">{worstClass?.className || '--'}</h3>
                                    </div>
                                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                        يحتاج تحسين
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-slate-500">20/</span>
                                    <span className="text-3xl font-bold text-slate-900">{worstClass?.avgGpa.toFixed(2)}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="text-xs text-slate-500">عدد التلاميذ</div>
                                    <div className="text-sm font-medium text-slate-700">{worstClass?.studentCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Highest Success Card */}
                    <div className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-300"></div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:bg-emerald-200 transition-colors">
                                <Percent size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">أعلى نسبة نجاح</p>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1">{highestSuccess?.className || '--'}</h3>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                        متميز
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-slate-900">{highestSuccess?.successPct.toFixed(1)}</span>
                                    <span className="text-sm text-slate-500">%</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">النجاحات</span>
                                        <span className="text-sm font-medium text-emerald-600">
                                            {highestSuccess?.successCount || 0}/{highestSuccess?.studentCount || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Highest Science Card */}
                    <div className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-300"></div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-200 transition-colors">
                                <Activity size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">أعلى توجه علمي</p>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1">{highestScience?.className || '--'}</h3>
                                    </div>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                        علمي
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-slate-900">{highestScience?.sciencePct.toFixed(1)}</span>
                                    <span className="text-sm text-slate-500">%</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">موجهون للعلوم</span>
                                        <span className="text-sm font-medium text-blue-600">
                                            {highestScience?.scienceCount || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Chart Container */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-50 rounded-lg">
                                    <PieChart size={24} className="text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">التمثيل البياني المقارن</h3>
                                    <p className="text-slate-600 text-sm mt-1">تحليل الأداء والتوجيه بين الأقسام</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setChartType('bar_gpa')}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${chartType === 'bar_gpa' 
                                        ? 'bg-primary-600 text-white shadow-sm' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    مقارنة المعدلات
                                </button>
                                <button
                                    onClick={() => setChartType('stacked_orientation')}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${chartType === 'stacked_orientation' 
                                        ? 'bg-primary-600 text-white shadow-sm' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    توزيع التوجيه
                                </button>
                                <button
                                    onClick={() => setChartType('pie_size')}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${chartType === 'pie_size' 
                                        ? 'bg-primary-600 text-white shadow-sm' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    تعداد التلاميذ
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 min-h-[400px]">
                        {renderAnalysisChart(classMetrics, chartType)}
                    </div>
                    
                    {chartType !== 'pie_size' && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                                    <span className="text-slate-600">أقل من 10/20</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                                    <span className="text-slate-600">10-14/20</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-slate-600">أكثر من 14/20</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Table with Sorting */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-50 rounded-lg">
                                <Table2 size={24} className="text-primary-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">تفاصيل الأداء حسب الفوج</h3>
                                <p className="text-slate-600 text-sm mt-1">مقارنة مفصلة للأقسام مع إمكانية الفرز</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-4 text-center font-semibold text-slate-700 min-w-[120px]">
                                        <span>القسم</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-slate-700 min-w-[100px]">
                                        <span>العدد</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-slate-700 min-w-[140px]">
                                        <span>المعدل العام</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-emerald-700 min-w-[120px]">
                                        <span>نسبة النجاح</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-red-700 min-w-[120px]">
                                        <span>نسبة الخطر</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-blue-700 min-w-[120px] bg-blue-50/50">
                                        <span>علوم</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-rose-700 min-w-[120px] bg-rose-50/50">
                                        <span>آداب</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-slate-700 min-w-[100px]">
                                        <span>إعادة</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {classMetrics.map((cls, index) => (
                                    <tr 
                                        key={cls.className} 
                                        className={`border-t border-slate-100 hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-slate-50/30' : ''}`}
                                    >
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <span className="font-bold text-slate-900">{cls.className}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 rounded-full">
                                                <span className="font-bold text-slate-900">{cls.studentCount}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-lg text-slate-900">{cls.avgGpa.toFixed(2)}</span>
                                                    <span className="text-xs text-slate-500">/20</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-500 ${
                                                            cls.avgGpa >= 14 ? 'bg-emerald-500' : 
                                                            cls.avgGpa >= 10 ? 'bg-primary-500' : 'bg-red-400'
                                                        }`}
                                                        style={{ width: `${Math.min(100, (cls.avgGpa / 20) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-lg text-emerald-600">{cls.successPct.toFixed(2)}%</span>
                                                <span className="text-xs text-slate-500">
                                                    ({cls.successCount}/{cls.studentCount})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {cls.riskCount > 0 ? (
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-1 px-3 py-1 bg-red-50 rounded-full">
                                                        <AlertTriangle size={12} className="text-red-500" />
                                                        <span className="font-bold text-red-600">{cls.riskPct.toFixed(2)}%</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500">({cls.riskCount})</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-medium">--</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center bg-blue-50/30">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-bold text-lg text-blue-700">{cls.sciencePct.toFixed(1)}%</span>
                                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                    {cls.scienceCount}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center bg-rose-50/30">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-bold text-lg text-rose-700">{cls.artsPct.toFixed(1)}%</span>
                                                <span className="text-xs text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                                                    {cls.artsCount}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {cls.repeatersCount > 0 ? (
                                                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full">
                                                    <span className="font-bold text-slate-700">{cls.repeatersCount}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-medium">--</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <div>
                                إجمالي الأقسام: <span className="font-bold text-slate-900">{classMetrics.length}</span>
                            </div>
                            <div>
                                إجمالي التلاميذ: <span className="font-bold text-slate-900">
                                    {classMetrics.reduce((sum, cls) => sum + cls.studentCount, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- STANDARD MODE RENDER (Existing logic) ---
  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-300">
      
      {activeChart && (
          <ChartModal 
             {...activeChart}
             onClose={() => setActiveChart(null)}
          />
      )}

      {/* Header with Controls */}
    <div className="flex flex-col p-6 md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layout size={24} className="text-primary-600"/>
                {getTitle()}
            </h1>
            <p className="text-slate-500 text-xs mt-1">تقرير إحصائي شامل لعملية التوجيه</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">

            <Button onClick={handleExportWord} variant="primary">
                <FileDown size={18} className="ml-2"/> تصدير التقرير
            </Button>
        </div>
    </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-y-auto print:p-0 print:shadow-none print:border-none print:overflow-visible" dir="rtl">
        
        {/* Table 1 */}
        <SectionHeader 
          title="جدول 1: حصيلة التوجيه للتلاميذ المقبولين في السنة الاولى ثانوي" 
          {...exportHandlers('table-1', 'جدول 1: حصيلة التوجيه للتلاميذ المقبولين في السنة الاولى ثانوي')}
          onChartClick={() => setActiveChart({
             title: 'فعالية التوجيه (توزيع المقبولين)',
             data: [
                 { label: 'علوم وتكنولوجيا', value: stats.t1.science.total, color: 'bg-blue-500' },
                 { label: 'آداب', value: stats.t1.arts.total, color: 'bg-amber-500' },
                 { label: 'تعليم مهني', value: stats.t1.vocational.total, color: 'bg-slate-500' },
             ],
             tableHeaders: ['التوجيه', 'العدد', 'النسبة', 'تحقيق الرغبة الاولى'],
             tableRows: [
                 ['علوم وتكنولوجيا', stats.t1.science.total, getPct(stats.t1.science.total, stats.t1.totalAdmitted), stats.t1.science.match],
                 ['آداب', stats.t1.arts.total, getPct(stats.t1.arts.total, stats.t1.totalAdmitted), stats.t1.arts.match],
                 ['تعليم مهني', stats.t1.vocational.total, getPct(stats.t1.vocational.total, stats.t1.totalAdmitted), '-']
             ]
          })}
        />
        <div className="border rounded-lg mb-6 break-inside-avoid shadow-sm">
            <table id="table-1" className="w-full border-collapse text-center text-sm">
                <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold">
                        <th rowSpan={2} className="border border-slate-300 p-3 bg-white w-20 align-middle">عدد التلاميذ</th>
                        <th colSpan={4} className="border border-slate-300 p-3 bg-amber-50">جذع مشترك آداب</th>
                        <th colSpan={4} className="border border-slate-300 p-3 bg-blue-50">جذع مشترك علوم وتكنولوجيا</th>
                        <th colSpan={2} className="border border-slate-300 p-3 bg-gray-50">التعليم المهني</th>
                    </tr>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-700">
                        <th className="border border-slate-300 p-2">تحقيق الرغبة الأولى</th>
                        <th className="border border-slate-300 p-2">النسبة</th>
                        <th className="border border-slate-300 p-2">المجموع</th>
                        <th className="border border-slate-300 p-2">النسبة</th>
                        <th className="border border-slate-300 p-2">تحقيق الرغبة الأولى</th>
                        <th className="border border-slate-300 p-2">النسبة</th>
                        <th className="border border-slate-300 p-2">المجموع</th>
                        <th className="border border-slate-300 p-2">النسبة</th>
                        <th className="border border-slate-300 p-2">تحقيق الرغبة الأولى</th>
                        <th className="border border-slate-300 p-2">النسبة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="font-bold text-base h-12 bg-white hover:bg-slate-50">
                        <td className="border border-slate-300 p-3">{stats.t1.totalAdmitted}</td>

                        <td className="border border-slate-300 p-3 text-amber-700">{stats.t1.arts.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text text-amber-700" dir="ltr">{getPct(stats.t1.arts.total, stats.t1.totalAdmitted)}</td>
                        <td className="border border-slate-300 p-3 text-amber-700">{stats.t1.arts.match}</td>
                        <td className="border border-slate-300 p-3 ltr-text text-amber-700" dir="ltr">{getPct(stats.t1.arts.match, stats.t1.arts.total)}</td>
                        
                        <td className="border border-slate-300 p-3 text-blue-700">{stats.t1.science.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text text-blue-700" dir="ltr">{getPct(stats.t1.science.total, stats.t1.totalAdmitted)}</td>
                        <td className="border border-slate-300 p-3 text-blue-700">{stats.t1.science.match}</td>
                        <td className="border border-slate-300 p-3 ltr-text text-blue-700" dir="ltr">{getPct(stats.t1.science.match, stats.t1.science.total)}</td>
                        
                        <td className="border border-slate-300 p-3 text-gray-700">{stats.t1.vocational.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text text-gray-700" dir="ltr">{getPct(stats.t1.vocational.total, stats.t1.totalAdmitted)}</td>
                        
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Table 2 */}
        <SectionHeader 
            title="جدول 2: محضر اجتماع مجلس القسم للسنة اولى ثانوي" 
            {...exportHandlers('table-2', 'جدول 2: محضر اجتماع مجلس القسم للسنة اولى ثانوي')}
            onChartClick={() => setActiveChart({
                title: 'مقارنة التوجيه المحسوب مقابل الرغبة الأولى',
                data: [
                    { label: 'جذع مشترك آداب', value: stats.t1.artsCalc.total, color: 'bg-amber-400', value2: stats.t1.artsChoice.total, color2: 'bg-amber-600' },
                    { label: 'جذع مشترك علوم', value: stats.t1.sciCalc.total, color: 'bg-blue-400', value2: stats.t1.sciChoice.total, color2: 'bg-blue-600' },
                    { label: 'تعليم مهني', value: stats.t1.vocCalc.total, color: 'bg-slate-400', value2: stats.t1.vocChoice.total, color2: 'bg-slate-600' },
                ],
                tableHeaders: ['المسار', 'توجيه محسوب', 'رغبة أولى'],
                tableRows: [
                    ['آداب', stats.t1.artsCalc.total, stats.t1.artsChoice.total],
                    ['علوم', stats.t1.sciCalc.total, stats.t1.sciChoice.total],
                    ['تعليم مهني', stats.t1.vocCalc.total, stats.t1.vocChoice.total],
                ]
            })}
        />
        <div className="mb-8 shadow-sm rounded-lg border">
            <table id="table-2" className="w-full border-collapse text-center text-sm">
                <thead className="bg-slate-100 text-slate-900 font-bold">
                    <tr>
                         <th colSpan={2} className="border border-slate-300 p-3 w-[40%] text-right pr-4"></th>
                         <th className="border border-slate-300 p-3 w-[15%]">الذكور</th>
                         <th className="border border-slate-300 p-3 w-[15%]">الإناث</th>
                         <th className="border border-slate-300 p-3 w-[15%]">المجموع</th>
                         <th className="border border-slate-300 p-3 w-[15%]">النسبة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="font-bold bg-white hover:bg-slate-50">
                        <td colSpan={2} className="border border-slate-300 p-3 text-center pr-4">عدد التلاميذ المسجلين في السنة الرابعة متوسط</td>
                            <td className="border border-slate-300 p-3">{stats.t1.registered.m}</td>
                            <td className="border border-slate-300 p-3">{stats.t1.registered.f}</td>
                            <td className="border border-slate-300 p-3">{stats.t1.registered.total}</td>
                            <td className="border border-slate-300 p-3">{((stats.t1.registered.total/stats.t1.registered.total)*100).toFixed(2)}%</td>
                        </tr>
                    {/* Arts */}
                    <tr className="hover:bg-amber-50/20">
                        <td rowSpan={2} className="border border-slate-300 p-3 bg-amber-50 text-center pr-4 font-bold w-[20%] text-amber-900">اقتراح التوجيه إلى<br/>جذع مشترك آداب</td>
                        <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4">{getGuidanceLabel()}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.artsCalc.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.artsCalc.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.artsCalc.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.artsCalc.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr className="hover:bg-amber-50/20">
                        <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4">التوجيه حسب الرغبة الأولى</td>
                        <td className="border border-slate-300 p-3">{stats.t1.artsChoice.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.artsChoice.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.artsChoice.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.artsChoice.total, stats.t1.registered.total)}</td>
                    </tr>
                    {/* Science */}
                    <tr className="hover:bg-blue-50/20">
                        <td rowSpan={2} className="border border-slate-300 p-3 bg-blue-50 text-center pr-4 font-bold text-blue-900">اقتراح التوجيه إلى<br/>جذع مشترك علوم</td>
                        <td className="border border-slate-300 p-3 bg-blue-50/50 text-right pr-4">{getGuidanceLabel()}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.sciCalc.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.sciCalc.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.sciCalc.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.sciCalc.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr className="hover:bg-blue-50/20">
                        <td className="border border-slate-300 p-3 bg-blue-50/50 text-right pr-4">التوجيه حسب الرغبة الأولى</td>
                        <td className="border border-slate-300 p-3">{stats.t1.sciChoice.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.sciChoice.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.sciChoice.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.sciChoice.total, stats.t1.registered.total)}</td>
                    </tr>
                    {/* Voc */}
                    <tr className="hover:bg-gray-50/20">
                        <td rowSpan={2} className="border border-slate-300 p-3 bg-gray-50 text-center pr-4 font-bold text-gray-900">اقتراح التوجيه إلى<br/>التعليم المهني</td>
                        <td className="border border-slate-300 p-3 bg-gray-50/50 text-right pr-4">{getGuidanceLabel()}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.vocCalc.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.vocCalc.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.vocCalc.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.vocCalc.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/20"><td className="border border-slate-300 p-3 bg-gray-50/50 text-right pr-4">التوجيه حسب الرغبة الأولى</td>
                        <td className="border border-slate-300 p-3">{stats.t1.vocChoice.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.vocChoice.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.vocChoice.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.vocChoice.total, stats.t1.registered.total)}</td>
                    </tr>
                    {/* Decisions */}
                    <tr className="hover:bg-slate-50"><td colSpan={2} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">المقترحون للقبول</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.admitted.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.admitted.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.admitted.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.admitted.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50"><td colSpan={2} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">المقترحون للتعليم المهني</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocEd.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocEd.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocEd.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.vocEd.total, stats.t1.registered.total)}</td>
                    </tr>
                        <tr className="hover:bg-slate-50"><td colSpan={2} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">المقترحون للتكوين المهني</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocTr.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocTr.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocTr.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.vocTr.total, stats.t1.registered.total)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50"><td colSpan={2} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">المقترحون للإعادة</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.repeat.m}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.repeat.f}</td>
                        <td className="border border-slate-300 p-3">{stats.t1.outcomes.repeat.total}</td>
                        <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.repeat.total, stats.t1.registered.total)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* S3 Council Meeting Table */}
        {type === 'S3' && (
            <>
                <SectionHeader 
                    title="جدول: محضر اجتماع مجلس أساتذة السنة الرابعة" 
                    {...exportHandlers('table-x', 'جدول: محضر اجتماع مجلس أساتذة السنة الرابعة')}
                    onChartClick={() => setActiveChart({
                        title: 'مقارنة الناجحون في امتحان ش.ت.م والناجحون حسب معدل القبول',
                        data: [
                            { label: 'الناجحون في امتحان ش.ت.م', value: stats.t1.bemtotalChoice.total, color: 'bg-amber-400', value2: stats.t1.bemtotalChoice.total, color2: 'bg-amber-600' },
                            { label: 'الناجحون حسب معدل القبول', value: stats.t1.transitiontotalChoice.total, color: 'bg-blue-400', value2: stats.t1.transitiontotalChoice.total, color2: 'bg-blue-600' },
                        ],
                        tableHeaders: ['المسار', 'توجيه محسوب', 'رغبة أولى'],
                        tableRows: [
                            ['ش.ت.م', stats.t1.bemtotalChoice.total, stats.t1.bemtotalChoice.total],
                            ['معدل القبول', stats.t1.transitiontotalChoice.total, stats.t1.transitiontotalChoice.total],
                        ]
                    })}
                />
                <div className="mb-8 shadow-sm rounded-lg border border-slate-300 overflow-x-auto">
                    <table id="table-x" className="w-full border-collapse text-center text-sm">
                        <thead className="bg-slate-100 text-slate-900 font-bold">
                            <tr>
                                 <th colSpan={3} className="border border-slate-300 p-3 w-[40%] text-right pr-4">البيان</th>
                                 <th className="border border-slate-300 p-3 w-[15%]">الذكور</th>
                                 <th className="border border-slate-300 p-3 w-[15%]">الإناث</th>
                                 <th className="border border-slate-300 p-3 w-[15%]">المجموع</th>
                                 <th className="border border-slate-300 p-3 w-[15%]">النسبة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="font-bold bg-white hover:bg-slate-50">
                                <td colSpan={3} className="border border-slate-300 p-3 text-center pr-4">عدد التلاميذ المسجلين</td>
                                    <td className="border border-slate-300 p-3">{stats.t1.registered.m}</td>
                                    <td className="border border-slate-300 p-3">{stats.t1.registered.f}</td>
                                    <td className="border border-slate-300 p-3">{stats.t1.registered.total}</td>
                                    <td className="border border-slate-300 p-3">100.00%</td>
                            </tr>
                            <tr className="font-bold bg-white hover:bg-slate-50">
                                <td colSpan={3} className="border border-slate-300 p-3 text-center pr-4">عدد التلاميذ الحاضرين</td>
                                    <td className="border border-slate-300 p-3">{stats.t1.registeredBem.m}</td>
                                    <td className="border border-slate-300 p-3">{stats.t1.registeredBem.f}</td>
                                    <td className="border border-slate-300 p-3">{stats.t1.registeredBem.total}</td>
                                    <td className="border border-slate-300 p-3">{getPct(stats.t1.registeredBem.total, stats.t1.registered.total)}</td>
                            </tr>
                            {/* Arts */}
                            <tr className="hover:bg-amber-50/20">
                                <td rowSpan={6} className="border border-slate-300 p-3 bg-amber-50 text-center pr-4 font-bold w-[20%] text-amber-900">عدد التلاميذ المقبولين في السنة الاولى من التعليم الثانوي العام والتكنولوجي</td>
                                <td rowSpan={3} className="border border-slate-300 p-3 bg-amber-50/50 text-center pr-4">الناجحون في امتحان ش.ت.م</td>
                                <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4">ج م آداب</td>
                                <td className="border border-slate-300 p-3">{stats.t1.bemartsChoice.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.bemartsChoice.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.bemartsChoice.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.bemartsChoice.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                            <tr className="hover:bg-amber-50/20">
                                <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4">ج م ع تك</td>
                                <td className="border border-slate-300 p-3">{stats.t1.bemsciChoice.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.bemsciChoice.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.bemsciChoice.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.bemsciChoice.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                            <tr className="hover:bg-amber-50/20">
                                <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4 font-bold">المجموع</td>
                                <td className="border border-slate-300 p-3 font-bold">{stats.t1.bemtotalChoice.m}</td>
                                <td className="border border-slate-300 p-3 font-bold">{stats.t1.bemtotalChoice.f}</td>
                                <td className="border border-slate-300 p-3 font-bold">{stats.t1.bemtotalChoice.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text font-bold" dir="ltr">{getPct(stats.t1.bemtotalChoice.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                            <tr className="hover:bg-amber-50/20">
                                <td rowSpan={3} className="border border-slate-300 p-3 bg-amber-50/50 text-center pr-4">الناجحون حسب معدل القبول</td>
                                <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4">ج م آداب</td>
                                <td className="border border-slate-300 p-3">{stats.t1.transitionartsChoice.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.transitionartsChoice.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.transitionartsChoice.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.transitionartsChoice.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                            <tr className="hover:bg-amber-50/20">
                                <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4">ج م ع تك</td>
                                <td className="border border-slate-300 p-3">{stats.t1.transitionsciChoice.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.transitionsciChoice.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.transitionsciChoice.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.transitionsciChoice.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                            <tr className="hover:bg-amber-50/20">
                                <td className="border border-slate-300 p-3 bg-amber-50/50 text-right pr-4 font-bold">المجموع</td>
                                <td className="border border-slate-300 p-3 font-bold">{stats.t1.transitiontotalChoice.m}</td>
                                <td className="border border-slate-300 p-3 font-bold">{stats.t1.transitiontotalChoice.f}</td>
                                <td className="border border-slate-300 p-3 font-bold">{stats.t1.transitiontotalChoice.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text font-bold" dir="ltr">{getPct(stats.t1.transitiontotalChoice.total, stats.t1.registeredBem.total)}</td>
                            </tr>

                            {/* Decisions */}
                            <tr className="hover:bg-slate-50"><td colSpan={3} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">المجموع العام للمقبولين</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.transitionadmitted.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.transitionadmitted.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.transitionadmitted.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.transitionadmitted.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                            <tr className="hover:bg-slate-50"><td colSpan={3} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">المقترحون لإعادة السنة</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.repeat.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.repeat.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.repeat.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.repeat.total, stats.t1.registered.total)}</td>
                            </tr>
                            <tr className="hover:bg-slate-50"><td colSpan={3} className="border border-slate-300 p-3 text-center pr-4 font-bold bg-white">الموجهون للتعليم والتكوين المهني</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocTr.m + stats.t1.outcomes.vocEd.m}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocTr.f + stats.t1.outcomes.vocEd.f}</td>
                                <td className="border border-slate-300 p-3">{stats.t1.outcomes.vocTr.total + stats.t1.outcomes.vocEd.total}</td>
                                <td className="border border-slate-300 p-3 ltr-text" dir="ltr">{getPct(stats.t1.outcomes.vocTr.total + stats.t1.outcomes.vocEd.total, stats.t1.registeredBem.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {/* Stacked Tables */}
        <div className="flex flex-col gap-6 break-inside-avoid">
            <div>
                <SectionHeader 
                    title="جدول 3: توزيع التلاميذ حسب الجنس" 
                    {...exportHandlers('table-3', 'جدول 3: توزيع التلاميذ حسب الجنس')}
                    onChartClick={() => setActiveChart({
                        title: 'توزيع التلاميذ حسب الجنس',
                        data: [
                            { label: 'ذكور', value: stats.gender.m, color: 'bg-blue-500' },
                            { label: 'إناث', value: stats.gender.f, color: 'bg-pink-500' },
                        ],
                        tableHeaders: ['الجنس', 'العدد', 'النسبة'],
                        tableRows: [
                            ['ذكور', stats.gender.m, getPct(stats.gender.m, stats.gender.total)],
                            ['إناث', stats.gender.f, getPct(stats.gender.f, stats.gender.total)],
                            ['المجموع', stats.gender.total, '100%']
                        ]
                    })}
                />
                <SimpleTable 
                    id="table-3"
                    isEmpty={stats.gender.total === 0}
                    headers={['الجنس', 'العدد', 'النسبة']}
                    rows={[
                        ['ذكور', stats.gender.m, getPct(stats.gender.m, stats.gender.total)],
                        ['إناث', stats.gender.f, getPct(stats.gender.f, stats.gender.total)],
                        ['المجموع', stats.gender.total, '100%']
                    ]}
                />
            </div>
            <div>
                 <SectionHeader 
                    title="جدول 4: توزيع التلاميذ حسب الإعادة" 
                    {...exportHandlers('table-4', 'جدول 4: توزيع التلاميذ حسب الإعادة')}
                    onChartClick={() => setActiveChart({
                        title: 'توزيع التلاميذ حسب الإعادة',
                        data: [
                            { label: 'متمدرس', value: stats.repeater.no, color: 'bg-emerald-500' },
                            { label: 'معيد', value: stats.repeater.yes, color: 'bg-amber-500' },
                        ],
                        tableHeaders: ['الحالة', 'العدد', 'النسبة'],
                        tableRows: [
                            ['متمدرس', stats.repeater.no, getPct(stats.repeater.no, stats.repeater.total)],
                            ['معيد', stats.repeater.yes, getPct(stats.repeater.yes, stats.repeater.total)],
                            ['المجموع', stats.repeater.total, '100%']
                        ]
                    })}
                />
                 <SimpleTable 
                    id="table-4b"
                    isEmpty={stats.repeater.total === 0}
                    headers={['الحالة', 'العدد', 'النسبة']}
                    rows={[
                        ['متمدرس', stats.repeater.no, getPct(stats.repeater.no, stats.repeater.total)],
                        ['معيد', stats.repeater.yes, getPct(stats.repeater.yes, stats.repeater.total)],
                        ['المجموع', stats.repeater.total, '100%']
                    ]}
                />
            </div>
        </div>
        
        <SectionHeader 
            title="جدول 4 (تابع): توزيع التلاميذ حسب الفوج التربوي" 
            {...exportHandlers('table-4b', 'جدول 4ب توزيع الفوج')}
            onChartClick={() => {
                const entries = Object.entries(stats.classes);
                const total = Object.values(stats.classes).reduce((sum, val) => sum + (val as number), 0);
                setActiveChart({
                    title: 'توزيع التلاميذ حسب الفوج التربوي',
                    data: entries.map(([k, v], i) => ({
                        label: k,
                        value: v as number,
                        color: `bg-indigo-${(i % 5 + 4) * 100}`
                    })),
                    tableHeaders: ['الفوج التربوي', 'عدد التلاميذ', 'النسبة'],
                    tableRows: [
                        ...entries.map(([cls, count]) => [cls, count, getPct(count as number, total)]),
                        ['المجموع', total, '100%']
                    ]
                });
            }}
        />
        <SimpleTable 
            id="table-4b"
            isEmpty={Object.keys(stats.classes).length === 0}
            headers={['الفوج التربوي', 'عدد التلاميذ', 'النسبة']}
            rows={[
                ...Object.entries(stats.classes).map(([cls, count]) => [cls, count, getPct(count as number, Object.values(stats.classes).reduce((sum, val) => sum + (val as number), 0))]),
                ['المجموع', Object.values(stats.classes).reduce((sum, val) => sum + (val as number), 0), '100%']
            ]}
        />

        <div className="flex flex-col gap-6 break-inside-avoid">
            <div>
                <SectionHeader 
                    title="جدول 5: توزيع التلاميذ حسب الرغبة الأولى" 
                    {...exportHandlers('table-5', 'جدول 5: توزيع التلاميذ حسب الرغبة الأولى')}
                    onChartClick={() => {
                        const entries = Object.entries(stats.firstChoice).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
                        const total = Object.values(stats.firstChoice).reduce((sum, val) => sum + (val as number), 0);
                        setActiveChart({
                            title: 'أكثر الرغبات طلباً',
                            data: entries.map(([k, v], i) => ({
                                label: k,
                                value: v as number,
                                color: `bg-blue-${(i % 4 + 4) * 100}`
                            })),
                            tableHeaders: ['الرغبة', 'العدد', 'النسبة'],
                            tableRows: [
                                ...Object.entries(stats.firstChoice).map(([k, v]) => [k, v, getPct(v as number, total)]),
                                ['المجموع', total, '100%']
                            ]
                        });
                    }}
                />
                <SimpleTable 
                    id="table-5"
                    isEmpty={Object.keys(stats.firstChoice).length === 0}
                    headers={['الرغبة', 'العدد', 'النسبة']}
                    rows={[
                        ...Object.entries(stats.firstChoice).map(([k, v]) => [k, v, getPct(v as number, Object.values(stats.firstChoice).reduce((sum, val) => sum + (val as number), 0))]),
                        ['المجموع', Object.values(stats.firstChoice).reduce((sum, val) => sum + (val as number), 0), '100%']
                    ]}
                />
            </div>
            <div>
                <SectionHeader 
                    title="جدول 6: توزيع التلاميذ حسب الجذع المشترك (المحسوب)" 
                    {...exportHandlers('table-6', 'جدول 6 التوجيه المحسوب')}
                    onChartClick={() => setActiveChart({
                        title: 'توزيع التلاميذ حسب التوجيه المحسوب',
                        data: [
                            { label: 'علوم وتكنولوجيا', value: stats.calculatedGuidance.science, color: 'bg-blue-500' },
                            { label: 'آداب', value: stats.calculatedGuidance.arts, color: 'bg-amber-500' },
                        ],
                        tableHeaders: ['الجذع المشترك', 'العدد', 'النسبة'],
                        tableRows: [
                            ['علوم وتكنولوجيا', stats.calculatedGuidance.science, getPct(stats.calculatedGuidance.science, stats.calculatedGuidance.total)],
                            ['آداب', stats.calculatedGuidance.arts, getPct(stats.calculatedGuidance.arts, stats.calculatedGuidance.total)],
                        ]
                    })}
                />
                <SimpleTable 
                    id="table-6"
                    isEmpty={stats.calculatedGuidance.total === 0}
                    headers={['الجذع المشترك', 'العدد', 'النسبة']}
                    rows={[
                        ['علوم وتكنولوجيا', stats.calculatedGuidance.science, getPct(stats.calculatedGuidance.science, stats.calculatedGuidance.total)],
                        ['آداب', stats.calculatedGuidance.arts, getPct(stats.calculatedGuidance.arts, stats.calculatedGuidance.total)],
                        ['المجموع', stats.calculatedGuidance.total, '100%']
                    ]}
                />
             </div>
        </div>

        <div className="flex flex-col gap-6 break-inside-avoid">
            <div>
                <SectionHeader 
                    title="جدول 7: توزيع التلاميذ حسب انسجام الرغبة" 
                    {...exportHandlers('table-7', 'جدول 7: توزيع التلاميذ حسب انسجام الرغبة')}
                    onChartClick={() => setActiveChart({
                        title: 'نسبة انسجام الرغبة مع التوجيه',
                        data: [
                            { label: 'منسجم', value: stats.alignment.comply, color: 'bg-emerald-500' },
                            { label: 'غير منسجم', value: stats.alignment.notComply, color: 'bg-rose-500' },
                        ],
                        tableHeaders: ['حالة الانسجام', 'العدد', 'النسبة'],
                        tableRows: [
                            ['منسجم', stats.alignment.comply, getPct(stats.alignment.comply, stats.alignment.total)],
                            ['غير منسجم', stats.alignment.notComply, getPct(stats.alignment.notComply, stats.alignment.total)],
                        ]
                    })}
                />
                <SimpleTable 
                    id="table-7"
                    isEmpty={stats.alignment.total === 0}
                    headers={['حالة الانسجام', 'العدد', 'النسبة']}
                    rows={[
                        ['منسجم (ر1 توافق المحسوب)', stats.alignment.comply, getPct(stats.alignment.comply, stats.alignment.total)],
                        ['غير منسجم', stats.alignment.notComply, getPct(stats.alignment.notComply, stats.alignment.total)],
                        ['المجموع', stats.alignment.total, '100%']
                    ]}
                />
            </div>
            {(type === 'S2' || type === 'S3') && (
                <div>
                     <SectionHeader 
                        title="جدول 8: توزيع التلاميذ حسب استقرار الرغبة" 
                        {...exportHandlers('table-8', 'جدول 8: توزيع التلاميذ حسب استقرار الرغبة')}
                        onChartClick={() => setActiveChart({
                            title: 'نسبة استقرار الرغبة',
                            data: [
                                { label: 'مستقر', value: stats.stability.stable, color: 'bg-blue-500' },
                                { label: 'متذبذب', value: stats.stability.unstable, color: 'bg-orange-500' },
                            ],
                            tableHeaders: ['حالة الاستقرار', 'العدد', 'النسبة'],
                            tableRows: [
                                ['مستقر', stats.stability.stable, getPct(stats.stability.stable, stats.stability.total)],
                                ['متذبذب', stats.stability.unstable, getPct(stats.stability.unstable, stats.stability.total)],
                            ]
                        })}
                    />
                     <SimpleTable 
                        id="table-8"
                        isEmpty={stats.stability.total === 0}
                        headers={['حالة الاستقرار', 'العدد', 'النسبة']}
                        rows={[
                            ['مستقر (رغبة ثابتة)', stats.stability.stable, getPct(stats.stability.stable, stats.stability.total)],
                            ['متذبذب (رغبة متغيرة)', stats.stability.unstable, getPct(stats.stability.unstable, stats.stability.total)],
                            ['المجموع', stats.stability.total, '100%']
                        ]}
                    />
                </div>
            )}
        </div>

        <SectionHeader 
            title="جدول 9: توزيع التلاميذ حسب اقتراح مستشار التوجيه" 
            {...exportHandlers('table-9', 'جدول 9: توزيع التلاميذ حسب اقتراح مستشار التوجيه')}
            onChartClick={() => {
                const entries = Object.entries(stats.counselor).sort((a,b) => (b[1] as number) - (a[1] as number));
                const total = Object.values(stats.counselor).reduce((sum, val) => sum + (val as number), 0);
                setActiveChart({
                    title: 'توزيع اقتراحات مستشار التوجيه',
                    data: entries.map(([k, v], i) => ({ label: k, value: v as number, color: `bg-cyan-${(i % 5 + 4) * 100}` })),
                    tableHeaders: ['الاقتراح', 'العدد', 'النسبة'],
                    tableRows: [
                        ...entries.map(([k, v]) => [k, v, getPct(v as number, total)]),
                        ['المجموع', total, '100%']
                    ]
                });
            }}
        />
        <SimpleTable 
        id="table-9"
            isEmpty={Object.keys(stats.counselor).length === 0}
            headers={['الاقتراح', 'العدد', 'النسبة']}
            rows={[
                ...Object.entries(stats.counselor).map(([k, v]) => [k, v, getPct(v as number, Object.values(stats.counselor).reduce((sum, val) => sum + (val as number), 0))]),
                ['المجموع', Object.values(stats.counselor).reduce((sum, val) => sum + (val as number), 0), '100%']
            ]}
        />

        <div className="flex flex-col gap-6 break-inside-avoid">
            <div>
                <SectionHeader 
                    title="جدول 10: توزيع التلاميذ حسب قرار مجلس القسم" 
                    {...exportHandlers('table-10', 'جدول 10 قرارات المجلس')}
                    onChartClick={() => {
                        const entries = Object.entries(stats.council).sort((a,b) => (b[1] as number) - (a[1] as number));
                        const total = Object.values(stats.council).reduce((sum, val) => sum + (val as number), 0);
                        setActiveChart({
                            title: 'توزيع قرارات مجلس القسم',
                            data: entries.map(([k, v], i) => ({ label: k, value: v as number, color: `bg-violet-${(i % 5 + 4) * 100}` })),
                            tableHeaders: ['القرار', 'العدد', 'النسبة'],
                            tableRows: [
                                ...entries.map(([k, v]) => [k, v, getPct(v as number, total)]),
                                ['المجموع', total, '100%']
                            ]
                        });
                    }}
                />
                <SimpleTable 
                    id="table-10"
                    isEmpty={Object.keys(stats.council).length === 0}
                    headers={['القرار', 'العدد', 'النسبة']}
                    rows={[
                        ...Object.entries(stats.council).map(([k, v]) => [k, v, getPct(v as number, Object.values(stats.council).reduce((sum, val) => sum + (val as number), 0))]),
                        ['المجموع', Object.values(stats.council).reduce((sum, val) => sum + (val as number), 0), '100%']
                    ]}
                />
            </div>
            {type === 'S3' && (
                <div>
                    <SectionHeader 
                        title="جدول 10 (تابع): توزيع التلاميذ حسب قرار مجلس القبول" 
                        {...exportHandlers('table-10b', 'جدول 10 (تابع): توزيع التلاميذ حسب قرار مجلس القبول')}
                        onChartClick={() => {
                            const entries = Object.entries(stats.admissions).sort((a,b) => (b[1] as number) - (a[1] as number));
                            const total = Object.values(stats.admissions).reduce((sum, val) => sum + (val as number), 0);
                            setActiveChart({
                                title: 'توزيع قرارات مجلس القبول',
                                data: entries.map(([k, v], i) => ({ label: k, value: v as number, color: `bg-emerald-${(i % 5 + 4) * 100}` })),
                                tableHeaders: ['القرار', 'العدد', 'النسبة'],
                                tableRows: [
                                    ...entries.map(([k, v]) => [k, v, getPct(v as number, total)]),
                                    ['المجموع', total, '100%']
                                ]
                            });
                        }}
                    />
                    <SimpleTable 
                    id="table-10b"
                        isEmpty={Object.keys(stats.admissions).length === 0}
                        headers={['القرار', 'العدد', 'النسبة']}
                        rows={[
                            ...Object.entries(stats.admissions).map(([k, v]) => [k, v, getPct(v as number, Object.values(stats.admissions).reduce((sum, val) => sum + (val as number), 0))]),
                            ['المجموع', Object.values(stats.admissions).reduce((sum, val) => sum + (val as number), 0), '100%']
                        ]}
                    />
                </div>
            )}
        </div>
        
        {/* Table 11: Subject Stats with Graph */}
        <SectionHeader 
            title={`جدول 11: نتائج التلاميذ حسب المواد الدراسية (${type === 'S1' ? 'الفصل الأول' : type === 'S2' ? 'الفصل الثاني' : 'الفصل الثالث'})`} 
            {...exportHandlers('table-11', 'جدول 11: نتائج التلاميذ حسب المواد الدراسية')}
            onChartClick={() => setActiveChart({
                title: 'معدلات المواد الدراسية',
                data: currentSubjectStats.map(s => ({ label: s.label, value: s.mean, color: s.color.replace('bg-', 'bg-').replace('text-', 'bg-') })),
                tableHeaders: ['المادة', 'المتوسط الحسابي', 'عدد ≥ 10'],
                tableRows: currentSubjectStats.map(s => [s.label, s.mean.toFixed(2), s.above10])
            })}
        />
        <div className="overflow-hidden border border-slate-300 rounded-lg mb-8 break-inside-avoid shadow-sm">
             <table id="table-11" className="w-full text-sm text-center">
                 <thead className="bg-slate-100 text-slate-800 font-bold">
                     <tr>
                         <th className="p-3 border border-slate-300 w-32">المادة</th>
                         <th className="p-3 border border-slate-300 w-16">عدد التلاميذ</th>
                         <th className="p-3 border border-slate-300 w-16 bg-blue-50">المتوسط الحسابي</th>
                         <th className="p-3 border border-slate-300 w-16">الانحراف المعياري</th>
                         <th className="p-3 border border-slate-300 w-16 text-emerald-700">العدد ≥ 10</th>
                         <th className="p-3 border border-slate-300 w-16 text-emerald-700">النسبة</th>
                         <th className="p-3 border border-slate-300 w-16 text-rose-700">العدد {'<'} 10</th>
                         <th className="p-3 border border-slate-300 w-16 text-rose-700">النسبة</th>
                         <th className="p-3 border border-slate-300 w-48">مبيان المتوسط</th>
                     </tr>
                 </thead>
                 <tbody className="bg-white">
                     {currentSubjectStats.map((sub, idx) => (
                         <tr key={sub.key} className="hover:bg-slate-50 transition-colors">
                             <td className="p-3 border border-slate-300 font-medium text-right pr-4">{sub.label}</td>
                             <td className="p-3 border border-slate-300">{sub.count}</td>
                             <td className="p-3 border border-slate-300 font-bold bg-blue-50">{sub.mean.toFixed(2)}</td>
                             <td className="p-3 border border-slate-300">{sub.stdDev.toFixed(2)}</td>
                             <td className="p-3 border border-slate-300 text-emerald-700 font-semibold">{sub.above10}</td>
                             <td className="p-3 border border-slate-300 ltr-text text-emerald-700" dir="ltr">{sub.pctAbove}</td>
                             <td className="p-3 border border-slate-300 text-rose-700 font-semibold">{sub.below10}</td>
                             <td className="p-3 border border-slate-300 ltr-text text-rose-700" dir="ltr">{sub.pctBelow}</td>
                             <td className="p-3 border border-slate-300 align-middle">
                                <BarGraph value={sub.mean} max={20} color={sub.color} />
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
        </div>
        
        {/* Table 12: Compare S1 vs S2 */}
        {(type === 'S2' || type === 'S3') && (
            <div className="break-inside-avoid">
                <SectionHeader 
                    title="جدول 12: مقارنة نتائج التلاميذ بين الفصلين الأول والثاني" 
                    {...exportHandlers('table-12', 'جدول 12: مقارنة نتائج التلاميذ بين الفصلين الأول والثاني')}
                    onChartClick={() => setActiveChart({
                        title: 'مقارنة الفصل الأول والثاني',
                        data: subjectStatsS2.map(s2 => {
                            const s1 = subjectStatsS1.find(x => x.key === s2.key) || s2;
                            return { 
                                label: s2.label, 
                                value: s1.mean, 
                                color: 'bg-blue-500', 
                                value2: s2.mean, 
                                color2: 'bg-indigo-500' 
                            };
                        }),
                        tableHeaders: ['المادة', 'متوسط الفصل الأول', 'متوسط الفصل الثاني', 'الفارق'],
                        tableRows: subjectStatsS2.map(s2 => {
                            const s1 = subjectStatsS1.find(x => x.key === s2.key) || s2;
                            return [s2.label, s1.mean.toFixed(2), s2.mean.toFixed(2), (s2.mean - s1.mean).toFixed(2)];
                        })
                    })}
                />
                <div className="overflow-hidden border border-slate-300 rounded-lg mb-8 shadow-sm">
                    <table id="table-12" className="w-full text-sm text-center">
                        <thead className="bg-slate-100 text-slate-800 font-bold">
                            <tr>
                                <th className="p-3 border border-slate-300" rowSpan={2}>المادة</th>
                                <th colSpan={4} className="p-3 border border-slate-300 bg-blue-50">الفصل الأول</th>
                                <th colSpan={4} className="p-3 border border-slate-300 bg-indigo-50">الفصل الثاني</th>
                                <th className="p-3 border border-slate-300" rowSpan={2}>الفارق</th>
                                <th className="p-3 border border-slate-300 w-48" rowSpan={2}>تطور النتائج</th>
                            </tr>
                            <tr>
                                <th className="p-3 border border-slate-300 bg-blue-50">المتوسط الحسابي</th>
                                <th className="p-3 border border-slate-300 bg-blue-50">الإنحراف المعياري</th>
                                <th className="p-3 border border-slate-300 bg-blue-50">العدد ≥ 10</th>
                                <th className="p-3 border border-slate-300 bg-blue-50">النسبة</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">المتوسط الحسابي</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">الإنحراف المعياري</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">العدد ≥ 10</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">النسبة</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {subjectStatsS2.map((s2, idx) => {
                                const s1 = subjectStatsS1.find(x => x.key === s2.key) || s2;
                                const diff = s2.mean - s1.mean;
                                return (
                                    <tr key={s2.key} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 border border-slate-300 font-medium text-right pr-4">{s2.label}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-blue-50">{s1.mean.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-blue-50">{s1.stdDev.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 bg-blue-50">{s1.above10}</td>
                                        <td className="p-3 border border-slate-300 bg-blue-50">{s1.pctAbove}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-indigo-50">{s2.mean.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-indigo-50">{s2.stdDev.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 bg-indigo-50">{s2.below10}</td>
                                        <td className="p-3 border border-slate-300 bg-indigo-50">{s2.pctAbove}</td>
                                        <td className={`p-3 border border-slate-300 font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                        </td>
                                        <td className="p-3 border border-slate-300 align-middle">
                                            <div className="flex gap-1 h-4 w-full">
                                                 <div className="bg-blue-300 h-full rounded-sm" style={{width: '48%'}} title={`S1: ${s1.mean}`}>
                                                     <div className="bg-blue-600 h-full" style={{width: `${(s1.mean/20)*100}%`}}></div>
                                                 </div>
                                                 <div className="bg-indigo-300 h-full rounded-sm" style={{width: '48%'}} title={`S2: ${s2.mean}`}>
                                                     <div className="bg-indigo-600 h-full" style={{width: `${(s2.mean/20)*100}%`}}></div>
                                                 </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

         {/* Table 13: Compare S2 vs S3 */}
         {type === 'S3' && (
            <div className="break-inside-avoid">
                <SectionHeader 
                    title="جدول 13: مقارنة نتائج التلاميذ بين الفصلين الثاني والثالث" 
                    {...exportHandlers('table-13', 'جدول 13: مقارنة نتائج التلاميذ بين الفصلين الثاني والثالث')}
                    onChartClick={() => setActiveChart({
                        title: 'مقارنة الفصل الثاني والثالث',
                        data: subjectStatsS3.map(s3 => {
                            const s2 = subjectStatsS2.find(x => x.key === s3.key) || s3;
                            return { 
                                label: s3.label, 
                                value: s2.mean, 
                                color: 'bg-indigo-500', 
                                value2: s3.mean, 
                                color2: 'bg-emerald-500' 
                            };
                        }),
                        tableHeaders: ['المادة', 'متوسط الفصل الثاني', 'متوسط الفصل الثالث', 'الفارق'],
                        tableRows: subjectStatsS3.map(s3 => {
                            const s2 = subjectStatsS2.find(x => x.key === s3.key) || s3;
                            return [s3.label, s2.mean.toFixed(2), s3.mean.toFixed(2), (s3.mean - s2.mean).toFixed(2)];
                        })
                    })}
                />
                <div className="overflow-hidden border border-slate-300 rounded-lg shadow-sm">
                    <table id="table-13" className="w-full text-sm text-center">
                        <thead className="bg-slate-100 text-slate-800 font-bold">
                            <tr>
                                <th className="p-3 border border-slate-300" rowSpan={2}>المادة</th>
                                <th colSpan={4} className="p-3 border border-slate-300 bg-indigo-50">الفصل الثاني</th>
                                <th colSpan={4} className="p-3 border border-slate-300 bg-emerald-50">الفصل الثالث</th>
                                <th className="p-3 border border-slate-300" rowSpan={2}>الفارق</th>
                                <th className="p-3 border border-slate-300 w-48" rowSpan={2}>تطور النتائج</th>
                            </tr>
                             <tr>
                                <th className="p-3 border border-slate-300 bg-blue-50">المتوسط الحسابي</th>
                                <th className="p-3 border border-slate-300 bg-blue-50">الإنحراف المعياري</th>
                                <th className="p-3 border border-slate-300 bg-blue-50">العدد ≥ 10</th>
                                <th className="p-3 border border-slate-300 bg-blue-50">النسبة</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">المتوسط الحسابي</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">الإنحراف المعياري</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">العدد ≥ 10</th>
                                <th className="p-3 border border-slate-300 bg-indigo-50">النسبة</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {subjectStatsS3.map((s3, idx) => {
                                const s2 = subjectStatsS2.find(x => x.key === s3.key) || s3;
                                const diff = s3.mean - s2.mean;
                                return (
                                    <tr key={s3.key} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 border border-slate-300 font-medium text-right pr-4">{s3.label}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-blue-50">{s2.mean.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-blue-50">{s2.stdDev.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 bg-blue-50">{s2.above10}</td>
                                        <td className="p-3 border border-slate-300 bg-blue-50">{s2.pctAbove}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-indigo-50">{s3.mean.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 font-bold bg-indigo-50">{s3.stdDev.toFixed(2)}</td>
                                        <td className="p-3 border border-slate-300 bg-indigo-50">{s3.below10}</td>
                                        <td className="p-3 border border-slate-300 bg-indigo-50">{s3.pctAbove}</td>
                                        <td className={`p-3 border border-slate-300 font-bold ltr-text ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                        </td>
                                        <td className="p-3 border border-slate-300 align-middle">
                                            <div className="flex gap-1 h-4 w-full">
                                                 <div className="bg-indigo-300 h-full rounded-sm" style={{width: '48%'}} title={`S2: ${s2.mean}`}>
                                                     <div className="bg-indigo-600 h-full" style={{width: `${(s2.mean/20)*100}%`}}></div>
                                                 </div>
                                                 <div className="bg-emerald-300 h-full rounded-sm" style={{width: '48%'}} title={`S3: ${s3.mean}`}>
                                                     <div className="bg-emerald-600 h-full" style={{width: `${(s3.mean/20)*100}%`}}></div>
                                                 </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
