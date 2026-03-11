import React, { useMemo, useState } from 'react';
import { 
  Users, TrendingUp, TrendingDown, Award, AlertTriangle, 
  Users2, UserCheck, GraduationCap, BarChart3, 
  ArrowUpRight, ArrowDownRight, LayoutDashboard,
  Star, Target, BookOpen, Clock, Activity,
  User, CheckCircle2, XCircle, Filter, Trophy,
  Bell, Zap, Network, ArrowLeftRight, Download,
  ChevronLeft, Search, Info, ZapOff, PieChart, FileDown,
  ThumbsUp, ThumbsDown, UsersRound, Building2, BookText,
  BarChart4, Brain, TargetIcon, Gauge, ShieldAlert,
  LineChart, UserCog, AwardIcon, Clock3, ChevronRight,
  Eye, DownloadCloud, Printer, Settings, FilterX,
  AlertCircle, FileBarChart, UsersIcon, Target as TargetIcon2,
  Maximize2, X, Plus, Grid, BarChart2, ActivityIcon,
  Link2, TrendingUpIcon, Sparkles, Target as TargetIcon3,
    LucideTrendingUp as TrendingUpIcon2,
    BarChartHorizontalIcon,
    LucideGitCompareArrows,
} from 'lucide-react';
import { StudentDetailsModal } from './StudentDetailsModal';
import { ConsolidatedStudent, SubjectKey } from '../types';
import { Button } from './Button';

interface SystemDashboardProps {
  students: ConsolidatedStudent[];
}

type SemesterView = 'GLOBAL' | 'S1' | 'S2' | 'S3';

const SUBJECT_LABELS: Record<string, string> = {
  arabic: 'اللغة العربية', french: 'اللغة الفرنسية', english: 'اللغة الإنجليزية', 
  math: 'الرياضيات', physics: 'الفيزياء', nature: 'العلوم الطبيعية', historyGeo: 'التاريخ والجغرافيا'
};

export const SystemDashboard: React.FC<SystemDashboardProps> = ({ students }) => {
  const [selectedSemester, setSelectedSemester] = useState<SemesterView>('GLOBAL');
  const [drillDownClass, setDrillDownClass] = useState<string | null>(null);
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'success' | 'risk' | 'elite'>('all');
  const [showAllTopStudents, setShowAllTopStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // --- 1. Enhanced Stats Engine ---
  const stats = useMemo(() => {
    if (!students || students.length === 0) return null;

    // CRITICAL FIX: Only analyze students who have data for the CURRENT year.
    // Students who ONLY have past data (imported from a PAST file) should not skew the dashboard.
    const activeCurrentYearStudents = students.filter(s => {
        if (selectedSemester === 'GLOBAL') {
            return (s.s1 && Object.keys(s.s1).length > 0) || 
                   (s.s2 && Object.keys(s.s2).length > 0) || 
                   (s.s3 && Object.keys(s.s3).length > 0);
        }
        const key = selectedSemester.toLowerCase() as 's1' | 's2' | 's3';
        return s[key] && Object.keys(s[key]!).length > 0;
    });

    if (activeCurrentYearStudents.length === 0) return { isEmpty: true, semester: selectedSemester };

    const getAvgForStudent = (s: ConsolidatedStudent) => {
        if (selectedSemester === 'S1') return s.s1?.avg;
        if (selectedSemester === 'S2') return s.s2?.avg;
        if (selectedSemester === 'S3') return s.s3?.avg;
        const s1 = s.s1?.avg || 0;
        const s2 = s.s2?.avg || 0;
        const s3 = s.s3?.avg || 0;
        if (s3) return (s1 + s2 + s3) / 3;
        if (s2) return (s1 + s2) / 2;
        return s1 || 0;
    };

    const sourceStudents = drillDownClass 
      ? activeCurrentYearStudents.filter(s => s.classCode === drillDownClass)
      : activeCurrentYearStudents;

    const total = sourceStudents.length;
    if (total === 0) return { isEmpty: true, semester: selectedSemester };

    // Gender & Repeater Stats
    const males = sourceStudents.filter(s => s.gender === 'ذكر').length;
    const females = total - males;
    const repeaters = sourceStudents.filter(s => s.isRepeater).length;
    const nonRepeaters = total - repeaters;
    
    const studentAvgs = sourceStudents.map(s => ({
        id: s.id,
        fullName: s.fullName,
        classCode: s.classCode || 'غير محدد',
        avg: getAvgForStudent(s) || 0,
        raw: s,
        performance: getAvgForStudent(s) || 0 >= 10 ? 'success' : getAvgForStudent(s) || 0 < 9 ? 'risk' : 'average'
    }));

    const successCount = studentAvgs.filter(s => s.avg >= 10).length;
    const riskCount = studentAvgs.filter(s => s.avg < 9).length;
    const eliteCount = studentAvgs.filter(s => s.avg >= 12).length;

    // --- BEM Probability Engine ---
    const bemPredictions = sourceStudents.map(s => {
       const s1 = s.s1?.avg || 0;
       const s2 = s.s2?.avg || 0;
       const s3 = s.s3?.avg || 0;
       const annual = s3 ? (s1 + s2 + s3) / 3 : s2 ? (s1 + s2) / 2 : s1;
       return Math.min(Math.max((annual / 15) * 100, 5), 98);
    });
    const avgBemProb = bemPredictions.reduce((a, b) => a + b, 0) / total;

    // --- Subject Synergy Matrix ---
    const synergy: Record<string, {count: number, total: number}> = {};
    const subKeys: SubjectKey[] = ['math', 'physics', 'nature', 'arabic', 'french', 'english', 'historyGeo'];

    sourceStudents.forEach(s => {
        const grades = s.s3 || s.s2 || s.s1 || {};
        subKeys.forEach(subA => {
            subKeys.forEach(subB => {
                if (subA !== subB) {
                    const gradeA = grades[subA];
                    const gradeB = grades[subB];
                    
                    // Only count if both grades exist (not undefined/null)
                    if (typeof gradeA === 'number' && typeof gradeB === 'number') {
                        const key = [subA, subB].sort().join('-');
                        
                        if (!synergy[key]) {
                            synergy[key] = { count: 0, total: 0 };
                        }
                        
                        synergy[key].total += 1; // Student has both grades
                        
                        if (gradeA < 10 && gradeB < 10) {
                            synergy[key].count += 1; // Both are weak
                        }
                    }
                }
            });
        });
    });

    // Get top 3 synergies
    const topSynergies = Object.entries(synergy)
    .sort((a,b) => b[1].count - a[1].count) // Sort by count of weak correlations
    .slice(0, 3)
    .map(([key, data]) => {
        const [subA, subB] = key.split('-');
        return {
        subjects: [subA, subB],
        label: `${SUBJECT_LABELS[subA]} - ${SUBJECT_LABELS[subB]}`,
        count: data.count,
        total: data.total,
        percentage: data.total > 0 ? (data.count / data.total) * 100 : 0
        };
    });

    // --- Subject List & Best/Worst Logic ---
    const subjectAvgs = subKeys.map(sub => {
      const grades = sourceStudents.map(s => {
          if (selectedSemester === 'S1') return s.s1?.[sub];
          if (selectedSemester === 'S2') return s.s2?.[sub];
          if (selectedSemester === 'S3') return s.s3?.[sub];
          return (s.s3?.[sub] || s.s2?.[sub] || s.s1?.[sub] || 0);
      }).filter(g => typeof g === 'number' && g > 0) as number[];
      
      const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      const improvement = sourceStudents.filter(s => {
          const s1 = s.s1?.[sub] || 0;
          const s2 = s.s2?.[sub] || 0;
          return s2 > s1 + 2;
      }).length;
      return { key: sub, label: SUBJECT_LABELS[sub], avg, improvement };
    }).sort((a, b) => b.avg - a.avg);

    const worstSubject =  subjectAvgs.length > 0 ? subjectAvgs[subjectAvgs.length - 1] : null;
    const bestSubject = subjectAvgs.length > 0 ? subjectAvgs[0] : null;

    // --- Performance Dynamics (ديناميكية الأداء) ---
    const performanceDynamics = subKeys.map(sub => {
      const semesterGrades = ['S1', 'S2', 'S3'].map(sem => {
        const grades = sourceStudents.map(s => {
          if (sem === 'S1') return s.s1?.[sub];
          if (sem === 'S2') return s.s2?.[sub];
          if (sem === 'S3') return s.s3?.[sub];
          return 0;
        }).filter(g => typeof g === 'number' && g > 0) as number[];
        
        return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      });
      
      return {
        key: sub,
        label: SUBJECT_LABELS[sub],
        grades: semesterGrades,
        trend: semesterGrades[2] > semesterGrades[0] ? 'up' : semesterGrades[2] < semesterGrades[0] ? 'down' : 'stable'
      };
    });

    // --- YoY Benchmarking ---
    const currentAvg = studentAvgs.reduce((a, b) => a + b.avg, 0) / total;
    const pastGrades = activeCurrentYearStudents.filter(s => s.past?.avg).map(s => s.past!.avg);
    const pastAvg = pastGrades.length ? pastGrades.reduce((a,b) => a+b, 0) / pastGrades.length : null;
    const yoyGrowth = pastAvg ? ((currentAvg - pastAvg) / pastAvg) * 100 : null;

    // --- Choice Saturation ---
    const sciChoiceCount = sourceStudents.filter(s => {
        const choice = selectedSemester === 'S3' ? s.orientationS3.choice1 : selectedSemester === 'S2' ? s.orientationS2.choice1 : s.orientationS1.choice1;
        return (choice || '').includes('علوم');
    }).length;
    const saturation = (sciChoiceCount / total) * 100;

    // --- Smart Alert Center ---
    const alerts: {type: 'warning' | 'info' | 'success', message: string}[] = [];
    const significantDrops = sourceStudents.filter(s => (s.s1?.avg || 0) - (s.s2?.avg || 0) > 2.5).length;
    if (significantDrops > 0 && selectedSemester !== 'S1') alerts.push({type: 'warning', message: `${significantDrops} تلميذ تراجعت نتائجهم بشكل حاد في الفصل الثاني.`});
    const mismatchCount = sourceStudents.filter(s => s.smartFlags.includes('mismatch')).length;
    if (mismatchCount > total * 0.25) alerts.push({type: 'warning', message: `تحذير: ${mismatchCount} تلميذ رغباتهم لا تتوافق مع قدراتهم العلمية.`});
    if (eliteCount > total * 0.2) alerts.push({type: 'success', message: `ممتاز: ${eliteCount} تلميذ من النخبة الأكاديمية.`});

    // --- Class Distribution ---
    const classStats: Record<string, { total: number, sumAvg: number }> = {};
    activeCurrentYearStudents.forEach(s => {
      const c = s.classCode || 'غير محدد';
      const avg = getAvgForStudent(s) || 0;
      if (!classStats[c]) classStats[c] = { total: 0, sumAvg: 0 };
      classStats[c].total += 1;
      classStats[c].sumAvg += avg;
    });
    const classAverages = Object.entries(classStats).map(([name, data]) => ({
        name,
        count: data.total,
        avg: data.sumAvg / data.total,
        successRate: sourceStudents.filter(s => s.classCode === name && (getAvgForStudent(s) || 0) >= 10).length / data.total * 100
    })).sort((a, b) => b.avg - a.avg);

    // --- Filtered Students ---
    const filteredStudents = (() => {
        switch(performanceFilter) {
            case 'success': return studentAvgs.filter(s => s.avg >= 10);
            case 'risk': return studentAvgs.filter(s => s.avg < 9);
            case 'elite': return studentAvgs.filter(s => s.avg >= 12);
            default: return studentAvgs;
        }
    })();

    // Get all top students sorted
    const allTopStudents = [...studentAvgs].sort((a, b) => b.avg - a.avg);

    return {
    isEmpty: false,
      total, males, females, repeaters, nonRepeaters, 
      successCount, riskCount, eliteCount,
      bestClass: classAverages[0],
      worstClass: classAverages[classAverages.length - 1],
      classAverages, subjectAvgs, bestSubject, worstSubject,
      topStudents: allTopStudents.slice(0, 5),
      allTopStudents,
      avgGpa: currentAvg,
      avgBemProb, yoyGrowth, topSynergies, saturation, alerts,
      filteredStudents,
      performanceDynamics
    };
  }, [students, selectedSemester, drillDownClass, performanceFilter]);

  // Filter top students based on showAllTopStudents state
  const displayedTopStudents = showAllTopStudents 
    ? stats?.allTopStudents || [] 
    : stats?.topStudents || [];

  // Handle "عرض الكل" click
  const handleShowAllTopStudents = () => {
    setShowAllTopStudents(true);
  };

  // Handle "إخفاء" click
  const handleHideTopStudents = () => {
    setShowAllTopStudents(false);
  };

  if (!stats) return <div className="p-10 text-center text-slate-400 font-bold">يرجى استيراد البيانات أولاً.</div>;

  if (stats.isEmpty) {
    return (
      <div className="flex-1 flex flex-col p-6 bg-slate-50/50" dir="rtl">
        <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold text-slate-800">تحليلات {selectedSemester === 'GLOBAL' ? 'المسار السنوي' : `الفصل ${selectedSemester.replace('S','')}`}</h1>
            <div className="bg-white rounded-xl border border-slate-200 flex items-center p-1 shadow-sm">
              {(['GLOBAL', 'S1', 'S2', 'S3'] as SemesterView[]).map(view => (
                <button
                  key={view}
                  onClick={() => { setSelectedSemester(view); setDrillDownClass(null); }}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${selectedSemester === view ? 'bg-blue-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {view === 'GLOBAL' ? 'السنوي' : `فصل ${view.replace('S', '')}`}
                </button>
              ))}
            </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-300">
           <ZapOff size={64} className="text-slate-200 mb-4" />
           <h3 className="text-xl font-bold text-slate-400">لا توجد بيانات مستوردة لهذا الفصل</h3>
           <p className="text-slate-400 mt-2">يرجى رفع ملف الحجز الخاص بالفصل {selectedSemester.replace('S','')} لتفعيل التحليلات.</p>
        </div>
      </div>
    );
  }

  // --- Feature 7: Word Doc Infographic Export ---
    const handleExportInfographic = () => {
    if (!stats) return;

    const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
        <meta charset="utf-8">
        <style>
            body { 
            font-family: 'Arial', 'Segoe UI', sans-serif; 
            direction: rtl; 
            margin: 0; 
            padding: 20px;
            background-color: #f8fafc;
            }
            .report-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            }
            .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
            margin-bottom: 30px;
            }
            .header h1 {
            color: #1e3a8a;
            margin: 0;
            font-size: 28px;
            }
            .header-subtitle {
            color: #64748b;
            font-size: 14px;
            margin-top: 5px;
            }
            .section-title {
            color: #1e293b;
            border-right: 4px solid #2563eb;
            padding-right: 12px;
            margin: 25px 0 15px 0;
            font-size: 18px;
            }
            .kpi-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 25px;
            }
            .kpi-item {
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            text-align: center;
            }
            .kpi-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
            font-weight: 600;
            }
            .kpi-value {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            }
            table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            }
            th {
            background-color: #f8fafc;
            padding: 12px;
            border: 1px solid #e2e8f0;
            text-align: right;
            font-weight: 600;
            color: #475569;
            }
            td {
            padding: 10px;
            border: 1px solid #e2e8f0;
            text-align: right;
            }
            .subject-row {
            transition: background-color 0.2s;
            }
            .subject-row:hover {
            background-color: #f8fafc;
            }
            .synergy-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            background-color: #f8fafc;
            }
            .performance-chart {
            height: 20px;
            background-color: #e2e8f0;
            border-radius: 10px;
            margin: 10px 0;
            overflow: hidden;
            position: relative;
            }
            .performance-bar {
            height: 100%;
            border-radius: 10px;
            }
            .footer {
            text-align: center;
            color: #94a3b8;
            font-size: 11px;
            border-top: 1px solid #f1f5f9;
            padding-top: 15px;
            margin-top: 30px;
            }
            .student-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            background-color: #f8fafc;
            }
            .student-rank {
            display: inline-block;
            width: 24px;
            height: 24px;
            background-color: #2563eb;
            color: white;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 8px;
            }
        </style>
        </head>
        <body>
        <div class="report-container">
            <!-- Header -->
            <div class="header">
            <h1>تقرير الإنفوجرافيك الشامل - Tawjih Pro</h1>
            <p class="header-subtitle">${selectedSemester === 'GLOBAL' ? 'التحليل السنوي للمؤسسة' : `تحليل الفصل ${selectedSemester.replace('S','')}`}</p>
            <p style="color: #475569; font-size: 12px; margin-top: 5px;">
                تاريخ الاستخراج: ${new Date().toLocaleString('ar-DZ', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
                })}
            </p>
            </div>

            <!-- 1. Key Performance Indicators -->
            <h3 class="section-title">المؤشرات الرئيسية للأداء</h3>
            <div class="kpi-grid">
            <div class="kpi-item">
                <div class="kpi-label">إجمالي التلاميذ</div>
                <div class="kpi-value">${stats.total}</div>
            </div>
            <div class="kpi-item">
                <div class="kpi-label">نسبة النجاح</div>
                <div class="kpi-value" style="color: #15803d;">${((stats.successCount / stats.total) * 100).toFixed(1)}%</div>
            </div>
            <div class="kpi-item">
                <div class="kpi-label">متوسط المعدل</div>
                <div class="kpi-value" style="color: #1d4ed8;">${stats.avgGpa.toFixed(2)}</div>
            </div>
            <div class="kpi-item">
                <div class="kpi-label">جاهزية BEM</div>
                <div class="kpi-value" style="color: #7c3aed;">${stats.avgBemProb.toFixed(0)}%</div>
            </div>
            </div>

            <!-- 2. Subjects Performance -->
            <h3 class="section-title">أداء المواد الدراسية</h3>
            <table>
            <thead>
                <tr>
                <th style="width: 60%;">المادة</th>
                <th style="width: 20%;">المتوسط</th>
                <th style="width: 20%;">التقييم</th>
                </tr>
            </thead>
            <tbody>
                ${stats.subjectAvgs.map((subject, index) => {
                let rating = '';
                let ratingColor = '';
                if (subject.avg >= 12) {
                    rating = 'ممتاز';
                    ratingColor = '#15803d';
                } else if (subject.avg >= 10) {
                    rating = 'جيد';
                    ratingColor = '#2563eb';
                } else if (subject.avg >= 8) {
                    rating = 'مقبول';
                    ratingColor = '#d97706';
                } else {
                    rating = 'بحاجة للتحسين';
                    ratingColor = '#dc2626';
                }
                
                return `
                    <tr class="subject-row">
                    <td>${subject.label}</td>
                    <td style="font-weight: bold;">${subject.avg.toFixed(2)}</td>
                    <td style="color: ${ratingColor}; font-weight: bold;">${rating}</td>
                    </tr>
                `;
                }).join('')}
            </tbody>
            </table>

            <!-- 3. Best & Worst Subjects -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px;">
                <div style="color: #166534; font-weight: bold; margin-bottom: 8px;">أفضل مادة</div>
                <div style="font-size: 18px; font-weight: bold; color: #15803d;">${stats.bestSubject?.label || 'غير محدد'}</div>
                <div style="color: #475569; font-size: 14px;">متوسط: ${stats.bestSubject?.avg.toFixed(2) || '0.00'}</div>
            </div>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px;">
                <div style="color: #991b1b; font-weight: bold; margin-bottom: 8px;">أضعف مادة</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${stats.worstSubject?.label || 'غير محدد'}</div>
                <div style="color: #475569; font-size: 14px;">متوسط: ${stats.worstSubject?.avg.toFixed(2) || '0.00'}</div>
            </div>
            </div>

            <!-- 4. Synergy Matrix -->
            <h3 class="section-title">مصفوفة الارتباط المتبادل</h3>
            ${stats.topSynergies && stats.topSynergies.length > 0 ? 
            stats.topSynergies.map(synergy => `
                <div class="synergy-box">
                <div style="font-weight: bold; color: #475569; margin-bottom: 8px;">
                    ${synergy.label}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: #64748b; font-size: 13px;">
                    ${synergy.count} حالة (${synergy.percentage.toFixed(1)}% من التلاميذ)
                    </div>
                    <div style="width: 100px; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.min(100, synergy.percentage)}%; background-color: #7c3aed;"></div>
                    </div>
                </div>
                </div>
            `).join('') 
            : '<p style="text-align: center; color: #64748b;">لا توجد علاقات ارتباط كافية للتحليل</p>'
            }

            <!-- 5. Performance Dynamics -->
            <h3 class="section-title">ديناميكية الأداء</h3>
            <table>
            <thead>
                <tr>
                <th>المادة</th>
                <th>الفصل 1</th>
                <th>الفصل 2</th>
                <th>الفصل 3</th>
                <th>الاتجاه</th>
                </tr>
            </thead>
            <tbody>
                ${stats.performanceDynamics.map(subject => {
                const trendIcon = subject.trend === 'up' ? '↑' : subject.trend === 'down' ? '↓' : '→';
                const trendColor = subject.trend === 'up' ? '#15803d' : subject.trend === 'down' ? '#dc2626' : '#64748b';
                
                return `
                    <tr>
                    <td>${subject.label}</td>
                    <td>${subject.grades[0].toFixed(2)}</td>
                    <td>${subject.grades[1].toFixed(2)}</td>
                    <td>${subject.grades[2].toFixed(2)}</td>
                    <td style="color: ${trendColor}; font-weight: bold;">${trendIcon}</td>
                    </tr>
                `;
                }).join('')}
            </tbody>
            </table>

            <!-- 6. Top Students -->
            <h3 class="section-title">النخبة الأكاديمية (أفضل 5 تلاميذ)</h3>
            ${displayedTopStudents.slice(0, 5).map((student, index) => `
            <div class="student-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span class="student-rank">${index + 1}</span>
                    <span style="font-weight: bold; color: #1e293b;">${student.fullName}</span>
                    <div style="color: #64748b; font-size: 12px; margin-top: 4px;">
                    القسم: ${student.classCode}
                    </div>
                </div>
                <div style="text-align: left;">
                    <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">
                    ${student.avg.toFixed(2)}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8;">معدل</div>
                </div>
                </div>
            </div>
            `).join('')}

            <!-- 7. Demographics -->
            <h3 class="section-title">الخصائص الديموغرافية</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <!-- Gender Distribution -->
            <div>
                <h4 style="color: #475569; margin-bottom: 10px;">التوزيع حسب الجنس</h4>
                <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #2563eb;">الذكور</span>
                    <span style="font-weight: bold;">${stats.males} (${((stats.males/stats.total)*100).toFixed(1)}%)</span>
                </div>
                <div class="performance-chart">
                    <div class="performance-bar" style="width: ${((stats.males/stats.total)*100)}%; background-color: #3b82f6;"></div>
                </div>
                </div>
                <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #ec4899;">الإناث</span>
                    <span style="font-weight: bold;">${stats.females} (${((stats.females/stats.total)*100).toFixed(1)}%)</span>
                </div>
                <div class="performance-chart">
                    <div class="performance-bar" style="width: ${((stats.females/stats.total)*100)}%; background-color: #ec4899;"></div>
                </div>
                </div>
            </div>

            <!-- Academic Status -->
            <div>
                <h4 style="color: #475569; margin-bottom: 10px;">التوزيع حسب الحالة الدراسية</h4>
                <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #10b981;">الجدد</span>
                    <span style="font-weight: bold;">${stats.nonRepeaters} (${((stats.nonRepeaters/stats.total)*100).toFixed(1)}%)</span>
                </div>
                <div class="performance-chart">
                    <div class="performance-bar" style="width: ${((stats.nonRepeaters/stats.total)*100)}%; background-color: #10b981;"></div>
                </div>
                </div>
                <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #f59e0b;">المعيدون</span>
                    <span style="font-weight: bold;">${stats.repeaters} (${((stats.repeaters/stats.total)*100).toFixed(1)}%)</span>
                </div>
                <div class="performance-chart">
                    <div class="performance-bar" style="width: ${((stats.repeaters/stats.total)*100)}%; background-color: #f59e0b;"></div>
                </div>
                </div>
            </div>
            </div>

            <!-- 8. Additional Metrics -->
            <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h4 style="color: #475569; margin-bottom: 15px;">مقاييس إضافية</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div>
                <div style="color: #64748b; font-size: 13px;">توقع نجاح BEM</div>
                <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">${stats.avgBemProb.toFixed(0)}%</div>
                </div>
                <div>
                <div style="color: #64748b; font-size: 13px;">تشبع العلوم</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${stats.saturation.toFixed(0)}%</div>
                </div>
                <div>
                <div style="color: #64748b; font-size: 13px;">حالات الخطر</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${stats.riskCount} (${getPctVal(stats.riskCount)}%)</div>
                </div>
                <div>
                <div style="color: #64748b; font-size: 13px;">النمو السنوي</div>
                <div style="font-size: 18px; font-weight: bold; color: ${stats.yoyGrowth && stats.yoyGrowth > 0 ? '#15803d' : '#dc2626'}">
                    ${stats.yoyGrowth ? `${stats.yoyGrowth.toFixed(1)}%` : 'غير متوفر'}
                </div>
                </div>
            </div>
            </div>

            <!-- Footer -->
            <div class="footer">
            <div>تم الاستخراج بواسطة نظام Tawjih Pro</div>
            <div>نظام التحليلات المتقدمة للتوجيه المدرسي</div>
            <div>جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
            </div>
        </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_تحليلي_${selectedSemester === 'GLOBAL' ? 'السنوي' : `الفصل_${selectedSemester.replace('S','')}`}_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    };

  const getPctVal = (val: number) => ((val / stats.total) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6" dir="rtl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${drillDownClass ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                <Building2 size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {drillDownClass ? `قسم ${drillDownClass}` : 'لوحة التحليلات الشاملة'}
                </h1>
                <p className="text-sm text-slate-500">
                  {drillDownClass ? 'تحليل تفصيلي للأداء الأكاديمي' : 'نظام التحليلات المتقدمة لتوجيه Pro'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-white rounded-xl border border-slate-200 flex items-center p-1">
              {(['GLOBAL', 'S1', 'S2', 'S3'] as SemesterView[]).map(view => (
                <button
                  key={view}
                  onClick={() => setSelectedSemester(view)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    selectedSemester === view
                      ? 'bg-blue-400 text-white shadow-sm'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {view === 'GLOBAL' ? 'سنوي' : `فصل ${view.replace('S', '')}`}
                </button>
              ))}
            </div>
            
            <Button 
                onClick={handleExportInfographic}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 gap-2"
            >
              <DownloadCloud size={18} />
              تصدير تقرير
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">إجمالي التلاميذ</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <UsersIcon className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">نسبة النجاح</p>
                <h3 className="text-2xl font-bold text-emerald-600">
                  {((stats.successCount / stats.total) * 100).toFixed(1)}%
                </h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <AwardIcon className="text-emerald-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">متوسط المعدل</p>
                <h3 className="text-2xl font-bold text-blue-600">{stats.avgGpa.toFixed(2)}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <LineChart className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">جاهزية BEM</p>
                <h3 className="text-2xl font-bold text-purple-600">{stats.avgBemProb.toFixed(0)}%</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TargetIcon2 className="text-purple-600" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column: Subjects Analysis */}
        <div className="lg:col-span-2 space-y-6">
            {/* CLASS DRILL-DOWN SELECTOR */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="justify-between flex items-center gap-3">
                    
                    <div className="flex gap-2">
                        <div className="flex p-2 bg-blue-50 items-center rounded-lg">
                            <Target className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">إستكشاف الأقسام</h3>
                            <p className="text-sm text-slate-500">تصفية الأقسام</p>
                        </div>
                    </div>

                    {drillDownClass && (
                        <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setDrillDownClass(null)}
                        className="text-white hover:text-white"
                        >
                        <ChevronLeft size={16} />
                        العودة للوحة الرئيسية
                        </Button>
                    )}
                </div>


                <div className="flex items-end justify-between h-40 gap-3 px-2">
                    {stats.classAverages.slice(0, 6).map((cls) => {
                        const isSelected = drillDownClass === cls.name;
                        return (
                            <div key={cls.name} onClick={() => setDrillDownClass(isSelected ? null : cls.name)} className="flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer group">
                                <div className={`w-full rounded-t-xl transition-all relative ${isSelected ? 'bg-primary-600 shadow-lg' : 'bg-slate-200 group-hover:bg-primary-300'}`} style={{ height: `${(cls.avg / 20) * 100}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">{cls.avg.toFixed(2)}</div>
                                </div>
                                <span className={`text-[9px] font-bold ${isSelected ? 'text-primary-700' : 'text-slate-400'} uppercase truncate w-full text-center`}>{cls.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
          {/* Subjects Performance Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BookText className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">أداء المواد الدراسية</h3>
                    <p className="text-sm text-slate-500">ترتيب حسب متوسط الدرجات</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">الفصل: {selectedSemester === 'GLOBAL' ? 'السنوي' : selectedSemester.replace('S', '')}</span>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="space-y-4">
                {stats.subjectAvgs.map((subject, index) => (
                  <div key={subject.key} className="flex items-center justify-between group hover:bg-slate-50 p-3 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-semibold text-slate-700">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800">{subject.label}</h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-500">
                            تحسن: <span className="font-medium text-emerald-600">{subject.improvement}</span> تلميذ
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${subject.avg >= 10 ? 'bg-emerald-500' : subject.avg >= 8 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${(subject.avg / 20) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right w-16">
                        <span className="font-bold text-lg text-slate-900">{subject.avg.toFixed(2)}</span>
                        <div className="text-xs text-slate-500">/20</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Best & Worst Subjects */}
              <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-emerald-800">أفضل مادة</h4>
                    <ThumbsUp className="text-emerald-600" size={18} />
                  </div>
                  <div className="text-xl font-bold text-emerald-900 mb-1">{stats.bestSubject?.label}</div>
                  <div className="text-sm text-emerald-600 font-medium">{stats.bestSubject?.avg.toFixed(2)} معدل</div>
                </div>
                
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-rose-800">أضعف مادة</h4>
                    <ThumbsDown className="text-rose-600" size={18} />
                  </div>
                  <div className="text-xl font-bold text-rose-900 mb-1">{stats.worstSubject?.label}</div>
                  <div className="text-sm text-rose-600 font-medium">{stats.worstSubject?.avg.toFixed(2)} معدل</div>
                </div>
              </div>
            </div>
            {/* Performance Dynamics (ديناميكية الأداء) - RESTORED SECTION */}

            <div className="mt-10 pt-10 border-t border-slate-100 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-primary-500"/> ديناميكية الأداء (الفصل {selectedSemester === 'GLOBAL' ? 'السنوي' : selectedSemester.replace('S','')})
                    </h4>
                </div>
                <div className="w-full h-20 flex items-end gap-2 px-2">
                    {stats.subjectAvgs.map((sub, i) => (
                        <div key={sub.key} className={`flex-1 rounded-t-xl transition-all duration-1000 relative group ${sub.avg >= 10 ? 'bg-primary-500/20 group-hover:bg-primary-500' : 'bg-rose-500/20 group-hover:bg-rose-500'}`} style={{ height: `${(sub.avg/20)*100}%` }}>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 font-bold whitespace-nowrap shadow-xl">{sub.label}</div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: Insights & Filters */}
        <div className="space-y-6">
          {/* Synergy Matrix (مصفوفة الارتباط المتبادل) - RESTORED SECTION */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Link2 className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">مصفوفة الارتباط المتبادل</h3>
                    <p className="text-sm text-slate-500">علاقات الضعف المشتركة بين المواد</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              {stats.topSynergies.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <LucideGitCompareArrows className="mx-auto mb-3" size={32} />
                  <p>لا توجد علاقات ارتباط كافية للتحليل</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.topSynergies.map((synergy, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 text-xs">
                            {index + 1}
                          </div>
                          <h4 className="font-medium text-slate-800">ارتباط مزدوج</h4>
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {synergy.count} حالة
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-sm font-semibold text-slate-800">
                            {SUBJECT_LABELS[synergy.subjects[0]]}
                          </div>
                          <div className="text-xs text-slate-500">المادة الأولى</div>
                        </div>
                        
                        <div className="p-2 bg-indigo-50 rounded-full">
                          <LucideGitCompareArrows className="text-indigo-600" size={16} />
                        </div>
                        
                        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-sm font-semibold text-slate-800">
                            {SUBJECT_LABELS[synergy.subjects[1]]}
                          </div>
                          <div className="text-xs text-slate-500">المادة الثانية</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">نسبة الانتشار</div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, synergy.percentage)}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium text-slate-700 mt-1">
                          {synergy.percentage.toFixed(1)}% من التلاميذ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Filter className="text-slate-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">تصفية الأداء</h3>
                  <p className="text-sm text-slate-500">عرض الفئات المختلفة</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPerformanceFilter('all')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    performanceFilter === 'all'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-medium mb-1">الكل</div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </button>
                
                <button
                  onClick={() => setPerformanceFilter('success')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    performanceFilter === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-medium mb-1">الناجحون</div>
                  <div className="text-2xl font-bold">{stats.successCount}</div>
                </button>
                
                <button
                  onClick={() => setPerformanceFilter('risk')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    performanceFilter === 'risk'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-medium mb-1">المعرضون للخطر</div>
                  <div className="text-2xl font-bold">{stats.riskCount}</div>
                </button>
                
                <button
                  onClick={() => setPerformanceFilter('elite')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    performanceFilter === 'elite'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-medium mb-1">النخبة</div>
                  <div className="text-2xl font-bold">{stats.eliteCount}</div>
                </button>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <UsersRound className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">الخصائص الديموغرافية</h3>
                  <p className="text-sm text-slate-500">توزيع الجنس والحالة</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>الذكور</span>
                      <span className="font-semibold">{getPctVal(stats.males)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPctVal(stats.males)}%` }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>الجدد</span>
                      <span className="font-semibold">{getPctVal(stats.nonRepeaters)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${getPctVal(stats.nonRepeaters)}%` }} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>الإناث</span>
                      <span className="font-semibold">{getPctVal(stats.females)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${getPctVal(stats.females)}%` }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>المعيدون</span>
                      <span className="font-semibold">{getPctVal(stats.repeaters)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${getPctVal(stats.repeaters)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Students Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Star className="text-amber-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">النخبة الأكاديمية</h3>
                <p className="text-sm text-slate-500">
                  {showAllTopStudents 
                    ? `جميع التلاميذ المتميزين (${stats.topStudents.length})` 
                    : 'أفضل 5 تلاميذ حسب المعدل'}
                </p>
              </div>
            </div>
            
            {!showAllTopStudents ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={handleShowAllTopStudents}
              >
                عرض الكل
                <Maximize2 size={16} />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                onClick={handleHideTopStudents}
              >
                إخفاء
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-5">
          {displayedTopStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <UsersRound className="mx-auto mb-3" size={32} />
              <p>لا توجد بيانات للعرض</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {displayedTopStudents.map((student, index) => (
                <div key={student.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-white hover:shadow-sm transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                      {index + 1}
                    </div>
                    <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {student.avg.toFixed(2)}
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-slate-800 mb-1 truncate group-hover:text-slate-900">
                    {student.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">{student.classCode}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${student.avg >= 16 ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                      : student.avg >= 14 && student.avg < 16 ? 'bg-green-50 text-green-600 border border-green-200'
                      : student.avg >= 12 && student.avg < 14 ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : student.avg >= 10 && student.avg < 12 ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : student.avg >= 8 && student.avg < 10 ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>

                      {student.avg >= 16 ? 'ممتاز' 
                      : student.avg >= 14 && student.avg < 16 ? 'جيد جدا'
                      : student.avg >= 12 && student.avg < 14 ? 'جيد'
                      : student.avg >= 10 && student.avg < 12 ? 'متوسط'
                      : student.avg >= 8 && student.avg < 10 ? 'ضعيف' : 'ضعيف جدا'}
                    </span>
                    <button 
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Brain className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">تشبع العلوم</p>
              <h4 className="font-bold text-slate-900">{stats.saturation.toFixed(1)}%</h4>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Network className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">الارتباط المتبادل</p>
                <h4 className="font-bold text-slate-900">
                    {stats.topSynergies && stats.topSynergies.length > 0 
                        ? `${stats.topSynergies[1].count} حالة` 
                        : 'لا يوجد'}
                </h4>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">النمو السنوي</p>
              <h4 className={`font-bold ${stats.yoyGrowth && stats.yoyGrowth > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stats.yoyGrowth ? `${stats.yoyGrowth.toFixed(1)}%` : 'غير متوفر'}
              </h4>
            </div>
          </div>
        </div>
    
      </div>

      {selectedStudentId && (
            <StudentDetailsModal 
                student={students.find(s => s.id === selectedStudentId)!} 
                onClose={() => setSelectedStudentId(null)}
            />
        )}

    </div>
    
  );
};