
import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, RefreshCw, ArrowRight, TrendingUp, TrendingDown, Settings2, Sliders, AlertCircle, BarChart3, RotateCcw } from 'lucide-react';
import { ConsolidatedStudent, GuidanceSettings, StreamWeights } from '../types';
import { calculateProgressivePlacement, DEFAULT_SETTINGS } from '../services/guidanceService';
import { Button } from './Button';

interface GlobalSimulatorProps {
  students: ConsolidatedStudent[];
  currentSettings: GuidanceSettings;
}

type SimulationContext = 'S1' | 'S2' | 'S3';

export const GlobalSimulator: React.FC<GlobalSimulatorProps> = ({ students, currentSettings }) => {
  const [context, setContext] = useState<SimulationContext>('S1');
  const [tempSettings, setTempSettings] = useState<GuidanceSettings>(currentSettings);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Initialize temp settings when prop changes
  useEffect(() => {
    setTempSettings(currentSettings);
  }, [currentSettings.id]); // specific dependency to avoid reset on internal updates if id stable

  // --- 1. Run Baseline Calculation (Current State) ---
  const baselineStats = useMemo(() => {
    // We use the passed 'students' array which is already calculated with currentSettings
    return calculateAggregates(students, context);
  }, [students, context]);

  // --- 2. Run Simulation Calculation (Future State) ---
  const simulatedStats = useMemo(() => {
    // 1. Clone Students (Lightweight clone)
    const clones = students.map(s => ({ ...s }));
    // 2. Recalculate with tempSettings
    const processed = calculateProgressivePlacement(clones, tempSettings);
    // 3. Aggregate
    return calculateAggregates(processed, context);
  }, [students, tempSettings, context]);

  // --- Helper to aggregate data ---
  function calculateAggregates(data: ConsolidatedStudent[], ctx: SimulationContext) {
    let scienceCount = 0;
    let artsCount = 0;
    let successCount = 0;
    let total = 0;

    data.forEach(s => {
        // Guidance Check
        let guidance = null;
        if (ctx === 'S1') guidance = s.orientationS1.preliminaryGuidance;
        else if (ctx === 'S2') guidance = s.guidanceS2?.preliminaryGuidance;
        else guidance = s.guidanceS3?.preliminaryGuidance;

        if (guidance === 'science') scienceCount++;
        else if (guidance === 'arts') artsCount++;

        // Success Check (GPA)
        let avg = 0;
        if (ctx === 'S1') avg = s.s1?.avg || 0;
        else if (ctx === 'S2') avg = s.s2?.avg || 0;
        else avg = s.s3?.avg || 0;

        // Use the threshold from the SETTINGS being used for this calculation context
        // Note: For baseline, students are already processed. For Sim, processed uses tempSettings.
        // However, 'calculateProgressivePlacement' updates guidance scores, it doesn't change 'avg'.
        // So we strictly compare avg against the threshold defined in tempSettings for the simulation view?
        // Actually, the pass/fail is distinct from guidance. Let's track it.
        if (avg >= tempSettings.passingThreshold) successCount++;
        
        total++;
    });

    return { scienceCount, artsCount, successCount, total };
  }

  const handleWeightChange = (stream: 'scienceWeights' | 'artsWeights', subject: keyof StreamWeights, val: number) => {
      setTempSettings(prev => ({
          ...prev,
          [stream]: {
              ...prev[stream],
              [subject]: val
          }
      }));
  };

  const handleReset = () => {
      setTempSettings(currentSettings);
  };

  // Delta Helper
  const getDelta = (curr: number, base: number) => {
      const diff = curr - base;
      if (diff === 0) return null;
      return (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${diff > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {diff > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {Math.abs(diff)}
          </span>
      );
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings2 size={24} className="text-primary-600"/>
                    محاكي السيناريوهات 
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    تغيير المعايير البيداغوجية وملاحظة التأثير المباشر على توجيه ونتائج التلاميذ.
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['S1', 'S2', 'S3'] as const).map(c => (
                        <button
                            key={c}
                            onClick={() => setContext(c)}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${context === c ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            نتائج {c}
                        </button>
                    ))}
                </div>
                <Button variant="outline" onClick={handleReset} title="إعادة تعيين المعايير">
                    <RotateCcw size={18}/>
                </Button>
            </div>
        </div>

        <div className=" gap-6 overflow-y-auto">

            {/* 1. KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 m4 px-10">
                {/* Science Impact Card */}
                <div className="group bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    {/* Gradient accent line */}
                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-400"></div>
                    
                    {/* Background pattern */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 opacity-10">
                        <svg className="w-full h-full text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm1.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm1.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                        </svg>
                    </div>
                    
                    {/* Card header with icon */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3 space-x-reverse">
                            <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-slate-700 text-lg font-semibold">التوجيه نحو العلوم</h3>
                                <p className="text-slate-400 text-sm">تخصصات علمية وتكنولوجية</p>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                            علمي
                        </span>
                    </div>
                    
                    {/* Main metric with animation */}
                    <div className="mb-6">
                        <div className="flex items-end space-x-3 space-x-reverse">
                            <span className="text-5xl font-bold text-slate-900 tracking-tight">
                                {simulatedStats.scienceCount}
                            </span>
                            <span className="text-sm text-slate-500 mb-2">تلميذ</span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2 mt-4">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(100, (simulatedStats.scienceCount / 100) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Comparison section */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 space-x-reverse">
                                {getDelta(simulatedStats.scienceCount, baselineStats.scienceCount)}
                                <span className="text-sm text-slate-600">
                                    {simulatedStats.scienceCount > baselineStats.scienceCount ? 'زيادة' : 'انخفاض'}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-1">القيمة السابقة</div>
                                <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">
                                    {baselineStats.scienceCount}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arts Impact Card */}
                <div className="group bg-gradient-to-br from-white to-amber-50 p-6 rounded-2xl border border-amber-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    {/* Gradient accent line */}
                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-400"></div>
                    
                    {/* Background pattern */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 opacity-10">
                        <svg className="w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                            <path d="M12 14l6.16-3.422a12.083 12.083 0 016.16 5.355 11.992 11.992 0 00-6.16-5.355L12 8.226v5.774zM12 14l-6.16-3.422a12.083 12.083 0 00-6.16 5.355 11.992 11.992 0 016.16-5.355L12 8.226v5.774z"/>
                        </svg>
                    </div>
                    
                    {/* Card header with icon */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3 space-x-reverse">
                            <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors duration-300">
                                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-slate-700 text-lg font-semibold">التوجيه نحو الآداب</h3>
                                <p className="text-slate-400 text-sm">تخصصات أدبية واجتماعية</p>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                            أدبي
                        </span>
                    </div>
                    
                    {/* Main metric with animation */}
                    <div className="mb-6">
                        <div className="flex items-end space-x-3 space-x-reverse">
                            <span className="text-5xl font-bold text-slate-900 tracking-tight">
                                {simulatedStats.artsCount}
                            </span>
                            <span className="text-sm text-slate-500 mb-2">تلميذ</span>
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-2 mt-4">
                            <div 
                                className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(100, (simulatedStats.artsCount / 100) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Comparison section */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 space-x-reverse">
                                {getDelta(simulatedStats.artsCount, baselineStats.artsCount)}
                                <span className="text-sm text-slate-600">
                                    {simulatedStats.artsCount > baselineStats.artsCount ? 'زيادة' : 'انخفاض'}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-1">القيمة السابقة</div>
                                <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">
                                    {baselineStats.artsCount}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Impact Card */}
                <div className="group bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    {/* Gradient accent line */}
                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-400"></div>
                    
                    {/* Background pattern */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 opacity-10">
                        <svg className="w-full h-full text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    
                    {/* Card header with icon */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3 space-x-reverse">
                            <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors duration-300">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-slate-700 text-lg font-semibold">الناجحون</h3>
                                <p className="text-slate-400 text-sm">معدل ≥ {tempSettings.passingThreshold}</p>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                            نجاح
                        </span>
                    </div>
                    
                    {/* Main metric with animation */}
                    <div className="mb-6">
                        <div className="flex items-end space-x-3 space-x-reverse">
                            <span className="text-5xl font-bold text-slate-900 tracking-tight">
                                {simulatedStats.successCount}
                            </span>
                            <span className="text-sm text-slate-500 mb-2">تلميذ</span>
                        </div>
                        <div className="w-full bg-emerald-100 rounded-full h-2 mt-4">
                            <div 
                                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(100, (simulatedStats.successCount / 100) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Comparison section */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 space-x-reverse">
                                {getDelta(simulatedStats.successCount, baselineStats.successCount)}
                                <span className="text-sm text-slate-600">
                                    {simulatedStats.successCount > baselineStats.successCount ? 'تحسن' : 'انخفاض'}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-1">القيمة السابقة</div>
                                <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">
                                    {baselineStats.successCount}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
<div className="m-4 px-6">
    <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Controls Panel */}
        <div className="lg:w-1/2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Panel Header */}
            <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <Sliders size={20} className="text-slate-700" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-slate-900">معايير التوجيه</h2>
                        <p className="text-sm text-slate-500">تعديل المعاملات والعتبات</p>
                    </div>
                </div>

            </div>

            {/* Threshold Section */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-slate-800">عتبة القبول</h3>
                        <p className="text-sm text-slate-500">الحد الأدنى للنجاح</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-slate-900 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 min-w-[60px] text-center">
                            {tempSettings.passingThreshold}
                        </div>
                        <span className="text-slate-500">/ 20</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="relative">
                        <input 
                            type="range" 
                            min="8" 
                            max="12" 
                            step="0.5"
                            value={tempSettings.passingThreshold}
                            onChange={(e) => setTempSettings(prev => ({...prev, passingThreshold: parseFloat(e.target.value)}))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
                            <span>8</span>
                            <span>9</span>
                            <span>10</span>
                            <span>11</span>
                            <span>12</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                        <span>زيادة العتبة ترفع معايير النجاح وتقلل عدد الناجحين</span>
                    </div>
                </div>
            </div>

            {/* Weights Grid */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Science Weights */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800">المواد العلمية</h4>
                                <p className="text-sm text-slate-500">معاملات تخصص العلوم</p>
                            </div>
                        </div>
                        
                        <div className="space-y-5">
                            {(['math', 'physics', 'nature'] as const).map((sub, index) => (
                                <div key={sub} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
                                            <span className="font-medium text-slate-700">
                                                {sub === 'math' ? 'الرياضيات' : sub === 'physics' ? 'الفيزياء' : 'العلوم الطبيعية'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-slate-900">{tempSettings.scienceWeights[sub]}</span>
                                            <span className="text-sm text-slate-500">/8</span>
                                        </div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="8" 
                                        step="1"
                                        value={tempSettings.scienceWeights[sub]}
                                        onChange={(e) => handleWeightChange('scienceWeights', sub, parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                                        <span>أقل أهمية</span>
                                        <span>أكثر أهمية</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Arts Weights */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800">المواد الأدبية</h4>
                                <p className="text-sm text-slate-500">معاملات تخصص الآداب</p>
                            </div>
                        </div>
                        
                        <div className="space-y-5">
                            {(['historyGeo', 'french', 'english'] as const).map((sub, index) => (
                                <div key={sub} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-amber-400' : 'bg-amber-300'}`}></div>
                                            <span className="font-medium text-slate-700">
                                                {sub === 'historyGeo' ? 'تاريخ وجغرافيا' : sub === 'french' ? 'الفرنسية' : 'الإنجليزية'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-slate-900">{tempSettings.artsWeights[sub]}</span>
                                            <span className="text-sm text-slate-500">/8</span>
                                        </div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="8" 
                                        step="1"
                                        value={tempSettings.artsWeights[sub]}
                                        onChange={(e) => handleWeightChange('artsWeights', sub, parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                                        <span>أقل أهمية</span>
                                        <span>أكثر أهمية</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Common Subject */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800">مادة مشتركة</h4>
                            <p className="text-sm text-slate-500">تؤثر على كلا التخصصين</p>
                        </div>
                    </div>
                    
                    <div className="space-y-5">
                        {(['arabic'] as const).map((sub) => (
                            <div key={sub} className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <span className="font-medium text-slate-700">
                                            اللغة العربية
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-slate-900">{tempSettings.artsWeights[sub]}</span>
                                        <span className="text-sm text-slate-500">/8</span>
                                    </div>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="8" 
                                    step="1"
                                    value={tempSettings.artsWeights[sub]}
                                    onChange={(e) => handleWeightChange('artsWeights', sub, parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                                    <span>تأثير متوسط</span>
                                    <span>تأثير قوي</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Right: Dashboard Panel */}
        <div className="lg:w-1/2 flex flex-col gap-6">
            {/* Comparative Chart */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 flex-1">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <BarChart3 size={20} className="text-slate-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">مقارنة التوزيع</h3>
                            <p className="text-sm text-slate-500">الوضع الحالي مقابل السيناريو الجديد</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
                            <span className="text-sm text-slate-600">الحالي</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>
                            <span className="text-sm text-slate-600">الجديد</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-center gap-8 h-64 px-8">
                    {/* Science Column */}
                    <div className="flex flex-col items-center gap-4 flex-1 max-w-[120px]">
                        <div className="relative w-full h-48">
                            {/* Current (Background) */}
                            <div 
                                className="absolute bottom-0 w-full bg-blue-100 rounded-t-lg border border-blue-200 transition-all duration-500 group cursor-pointer"
                                style={{height: `${Math.max(20, (baselineStats.scienceCount / baselineStats.total)*100)}%`}}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-sm font-medium whitespace-nowrap">
                                    حالياً: {baselineStats.scienceCount}
                                </div>
                            </div>
                            
                            {/* New (Foreground) */}
                            <div 
                                className="absolute bottom-0 w-3/4 left-1/2 -translate-x-1/2 bg-blue-600 rounded-t-lg border border-blue-700 transition-all duration-700 group cursor-pointer"
                                style={{height: `${Math.max(20, (simulatedStats.scienceCount / simulatedStats.total)*100)}%`}}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-sm font-medium whitespace-nowrap">
                                    جديد: {simulatedStats.scienceCount}
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-slate-900 text-lg">علوم</div>
                            <div className="text-sm text-slate-500">
                                {simulatedStats.scienceCount > baselineStats.scienceCount ? '↑' : '↓'} 
                                {Math.abs(simulatedStats.scienceCount - baselineStats.scienceCount)}
                            </div>
                        </div>
                    </div>

                    {/* Arts Column */}
                    <div className="flex flex-col items-center gap-4 flex-1 max-w-[120px]">
                        <div className="relative w-full h-48">
                            {/* Current (Background) */}
                            <div 
                                className="absolute bottom-0 w-full bg-amber-100 rounded-t-lg border border-amber-200 transition-all duration-500 group cursor-pointer"
                                style={{height: `${Math.max(20, (baselineStats.artsCount / baselineStats.total)*100)}%`}}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-sm font-medium whitespace-nowrap">
                                    حالياً: {baselineStats.artsCount}
                                </div>
                            </div>
                            
                            {/* New (Foreground) */}
                            <div 
                                className="absolute bottom-0 w-3/4 left-1/2 -translate-x-1/2 bg-amber-600 rounded-t-lg border border-amber-700 transition-all duration-700 group cursor-pointer"
                                style={{height: `${Math.max(20, (simulatedStats.artsCount / simulatedStats.total)*100)}%`}}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-sm font-medium whitespace-nowrap">
                                    جديد: {simulatedStats.artsCount}
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-slate-900 text-lg">آداب</div>
                            <div className="text-sm text-slate-500">
                                {simulatedStats.artsCount > baselineStats.artsCount ? '↑' : '↓'} 
                                {Math.abs(simulatedStats.artsCount - baselineStats.artsCount)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="text-sm text-slate-500 mb-1">إجمالي التلاميذ</div>
                        <div className="font-bold text-slate-900 text-xl">{baselineStats.total}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="text-sm text-slate-500 mb-1">التغير الكلي</div>
                        <div className={`font-bold text-xl ${simulatedStats.total !== baselineStats.total ? 'text-blue-600' : 'text-slate-900'}`}>
                            {simulatedStats.total - baselineStats.total}
                        </div>
                    </div>
                </div>
            </div>

            {/* Impact Analysis */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <Calculator size={20} className="text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-slate-900">تحليل الأثر</h4>
                        <p className="text-sm text-slate-500">تأثير تغيير المعايير</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {simulatedStats.scienceCount !== baselineStats.scienceCount && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className={`p-1 rounded ${simulatedStats.scienceCount > baselineStats.scienceCount ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {simulatedStats.scienceCount > baselineStats.scienceCount ? '↑' : '↓'}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 mb-1">التوجيه نحو العلوم</div>
                                <p className="text-sm text-slate-600">
                                    {simulatedStats.scienceCount > baselineStats.scienceCount ? 'زيادة' : 'انخفاض'} عدد الموجهين للعلوم بمقدار{' '}
                                    <span className={`font-bold ${simulatedStats.scienceCount > baselineStats.scienceCount ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {Math.abs(simulatedStats.scienceCount - baselineStats.scienceCount)}
                                    </span>{' '}
                                    تلميذ ({((Math.abs(simulatedStats.scienceCount - baselineStats.scienceCount) / baselineStats.total) * 100).toFixed(1)}%)
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {simulatedStats.artsCount !== baselineStats.artsCount && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className={`p-1 rounded ${simulatedStats.artsCount > baselineStats.artsCount ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {simulatedStats.artsCount > baselineStats.artsCount ? '↑' : '↓'}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 mb-1">التوجيه نحو الآداب</div>
                                <p className="text-sm text-slate-600">
                                    {simulatedStats.artsCount > baselineStats.artsCount ? 'زيادة' : 'انخفاض'} عدد الموجهين للآداب بمقدار{' '}
                                    <span className={`font-bold ${simulatedStats.artsCount > baselineStats.artsCount ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {Math.abs(simulatedStats.artsCount - baselineStats.artsCount)}
                                    </span>{' '}
                                    تلميذ ({((Math.abs(simulatedStats.artsCount - baselineStats.artsCount) / baselineStats.total) * 100).toFixed(1)}%)
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {simulatedStats.successCount !== baselineStats.successCount && (
                        <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className={`p-1 rounded ${simulatedStats.successCount > baselineStats.successCount ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {simulatedStats.successCount > baselineStats.successCount ? '↑' : '↓'}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 mb-1">معدل النجاح</div>
                                <p className="text-sm text-slate-600">
                                    تغير معدل النجاح من{' '}
                                    <span className="font-bold text-slate-700">{((baselineStats.successCount / baselineStats.total) * 100).toFixed(1)}%</span>{' '}
                                    إلى{' '}
                                    <span className={`font-bold ${simulatedStats.successCount > baselineStats.successCount ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {((simulatedStats.successCount / simulatedStats.total) * 100).toFixed(1)}%
                                    </span>
                                    {' '}({simulatedStats.successCount > baselineStats.successCount ? '+' : ''}{simulatedStats.successCount - baselineStats.successCount} تلميذ)
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {simulatedStats.scienceCount === baselineStats.scienceCount && 
                     simulatedStats.artsCount === baselineStats.artsCount && 
                     simulatedStats.successCount === baselineStats.successCount && (
                        <div className="text-center py-4 text-slate-500 italic">
                            لا يوجد تغيير في التوزيع مع المعايير الحالية
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
</div>
        </div>
    </div>
  );
};
