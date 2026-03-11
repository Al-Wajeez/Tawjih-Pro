
import React, { useState, useRef } from 'react';
import { Save, RotateCcw, AlertCircle, Settings, Calculator, Award, Sliders, Plus, Trash2, Zap, Download, UploadCloud, FileJson, HardDrive } from 'lucide-react';
import { GuidanceSettings, StreamWeights, AppreciationRule } from '../types';
import { Button } from './Button';
import { DEFAULT_SETTINGS } from '../services/guidanceService';
import { exportDatabase, importDatabase, BackupData } from '../services/db';

interface SettingsPanelProps {
  settings: GuidanceSettings;
  onSave: (newSettings: GuidanceSettings) => void;
  onDataRestore: () => void;
}

const SUBJECT_LABELS: Record<keyof StreamWeights, string> = {
  arabic: 'اللغة العربية',
  french: 'اللغة الفرنسية',
  english: 'اللغة الإنجليزية',
  historyGeo: 'التاريخ والجغرافيا',
  math: 'الرياضيات',
  nature: 'العلوم الطبيعية',
  physics: 'الفيزياء',
};

const ORDERED_KEYS: (keyof StreamWeights)[] = ['math', 'physics', 'nature', 'arabic', 'french', 'english', 'historyGeo'];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave, onDataRestore }) => {
  const [formData, setFormData] = useState<GuidanceSettings>(settings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWeightChange = (
    stream: 'scienceWeights' | 'artsWeights',
    subject: keyof StreamWeights,
    value: string
  ) => {
    const num = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [stream]: {
        ...prev[stream],
        [subject]: Math.max(0, num)
      }
    }));
  };

  const handleFormulaChange = (key: keyof GuidanceSettings['formulaConfig'], value: string) => {
    const num = parseFloat(value) || 0;
    setFormData(prev => ({
       ...prev,
       formulaConfig: {
          ...prev.formulaConfig,
          [key]: Math.max(0, num)
       }
    }));
  };

  const handleAppreciationChange = (id: string, field: keyof AppreciationRule, value: any) => {
      setFormData(prev => ({
          ...prev,
          appreciations: prev.appreciations.map(a => a.id === id ? { ...a, [field]: value } : a)
      }));
  };

  const addAppreciation = () => {
      const newId = Date.now().toString();
      setFormData(prev => ({
          ...prev,
          appreciations: [
              ...prev.appreciations, 
              { id: newId, min: 0, label: 'جديد', color: 'text-slate-700 bg-slate-100' }
          ].sort((a, b) => b.min - a.min)
      }));
  };

  const removeAppreciation = (id: string) => {
     setFormData(prev => ({
         ...prev,
         appreciations: prev.appreciations.filter(a => a.id !== id)
     }));
  };
  
  const handleSmartFlagChange = (field: 'riskThreshold' | 'talentThreshold', value: string) => {
      const num = parseFloat(value) || 0;
      setFormData(prev => ({
          ...prev,
          smartFlags: {
              ...prev.smartFlags,
              [field]: num
          }
      }));
  };

  const calculateTotal = (weights: StreamWeights) => {
    return Object.values(weights).reduce((a, b) => a + b, 0);
  };

  const handleSave = () => {
    // Ensure appreciations are sorted descending by min value
    const sortedAppreciations = [...formData.appreciations].sort((a, b) => b.min - a.min);
    const finalData = { ...formData, appreciations: sortedAppreciations };
    
    onSave(finalData);
    setFormData(finalData); // Update local state with sorted
    setMessage("تم حفظ الإعدادات بنجاح. سيتم إعادة حساب المعدلات تلقائياً.");
    setError(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReset = () => {
    if (window.confirm("هل أنت متأكد من استعادة القيم الافتراضية؟")) {
       setFormData({ ...DEFAULT_SETTINGS, id: formData.id });
    }
  };

  // --- Backup & Restore Handlers ---
  const handleBackup = async () => {
    try {
      const backupData = await exportDatabase();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `TawjihPro_Backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage("تم إنشاء نسخة احتياطية بنجاح.");
      setError(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError("فشل إنشاء النسخة الاحتياطية.");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("تحذير: استعادة النسخة الاحتياطية سيؤدي إلى مسح جميع البيانات الحالية واستبدالها. هل أنت متأكد؟")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const backupData: BackupData = JSON.parse(jsonStr);
        
        await importDatabase(backupData);
        onDataRestore(); // Refresh app state
        
        // Update local form state if settings were restored
        if (backupData.data.settings) {
          setFormData(backupData.data.settings);
        }

        setMessage("تم استعادة البيانات بنجاح.");
        setError(null);
      } catch (err) {
        console.error(err);
        setError("فشل استعادة النسخة الاحتياطية. تأكد من سلامة الملف.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8 pb-10">
        
        <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="text-primary-600"/>
                إعدادات النظام
            </h2>
            <p className="text-slate-500">
                تحكم كامل في معاملات المواد، صيغ الحساب، وسلالم التقدير.
            </p>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in slide-in-from-top-2">
            <CheckCircleIcon size={16}/> {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={16}/> {error}
          </div>
        )}

        {/* 1. Backup & Restore Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                 <HardDrive size={20} className="text-slate-500"/>
                 <h3 className="font-bold text-slate-800">النسخ الاحتياطي والاستعادة </h3>
             </div>
             <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-emerald-700">
                            <div className="p-2 bg-emerald-100 rounded-lg"><Download size={20}/></div>
                            <h4 className="font-bold">تصدير قاعدة البيانات</h4>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            قم بتحميل نسخة كاملة من جميع بيانات التلاميذ والإعدادات في ملف (JSON). احتفظ بهذا الملف في مكان آمن.
                        </p>
                        <Button variant="outline" onClick={handleBackup} className="mt-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                             تحميل النسخة الاحتياطية
                        </Button>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-blue-700">
                            <div className="p-2 bg-blue-100 rounded-lg"><UploadCloud size={20}/></div>
                            <h4 className="font-bold">استعادة قاعدة البيانات</h4>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            استرجع بياناتك من ملف (JSON) سابق. <span className="text-red-500 font-bold">تنبيه: سيتم استبدال جميع البيانات الحالية.</span>
                        </p>
                        <div className="mt-auto">
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleRestore}
                                className="hidden"
                                accept=".json"
                            />
                            <Button 
                                variant="outline" 
                                onClick={() => fileInputRef.current?.click()} 
                                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                اختيار ملف للاستعادة
                            </Button>
                        </div>
                    </div>
                 </div>
             </div>
        </section>

        {/* 2. Formula Configuration */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                 <Calculator size={20} className="text-slate-500"/>
                 <h3 className="font-bold text-slate-800">صيغ الحساب العامة (Guidance Formulas)</h3>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                     <h4 className="font-bold text-slate-700 text-sm border-b pb-2">الفصل الأول </h4>
                     <p className="text-xs text-slate-400">
                        الصيغة: (الماضي الدراسي × المعامل) + (معدل الفصل 1 × المعامل) / المجموع
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">معامل الماضي الدراسي </label>
                           <input type="number" min="0" step="0.5" value={formData.formulaConfig.s1PastWeight} onChange={e => handleFormulaChange('s1PastWeight', e.target.value)} className="w-full border rounded p-2 text-center font-bold"/>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">معامل الفصل الحالي </label>
                           <input type="number" min="0" step="0.5" value={formData.formulaConfig.s1CurrentWeight} onChange={e => handleFormulaChange('s1CurrentWeight', e.target.value)} className="w-full border rounded p-2 text-center font-bold"/>
                        </div>
                     </div>
                 </div>

                 <div className="space-y-4">
                     <h4 className="font-bold text-slate-700 text-sm border-b pb-2">الفصل الثاني والثالث </h4>
                     <p className="text-xs text-slate-400">
                        الصيغة: (المعدل السنوي المؤقت × المعامل) + (معدل الفصل الحالي × المعامل) / المجموع
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">معامل المعدل السنوي </label>
                           <input type="number" min="0" step="0.5" value={formData.formulaConfig.cumulativeWeight} onChange={e => handleFormulaChange('cumulativeWeight', e.target.value)} className="w-full border rounded p-2 text-center font-bold"/>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">معامل الفصل الحالي </label>
                           <input type="number" min="0" step="0.5" value={formData.formulaConfig.semesterWeight} onChange={e => handleFormulaChange('semesterWeight', e.target.value)} className="w-full border rounded p-2 text-center font-bold"/>
                        </div>
                     </div>
                 </div>
                 
                 <div className="md:col-span-2 pt-4 border-t border-slate-100 flex items-center gap-4">
                    <Sliders size={20} className="text-slate-400"/>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1">عتبة القبول</label>
                        <p className="text-xs text-slate-400">المعدل الذي يعتبر فيه التلميذ ناجحاً أو مقبولاً (يؤثر على لون المعدلات).</p>
                    </div>
                    <input 
                        type="number" 
                        min="0" 
                        max="20" 
                        step="0.5"
                        value={formData.passingThreshold} 
                        onChange={e => setFormData(prev => ({ ...prev, passingThreshold: parseFloat(e.target.value) || 10 }))} 
                        className="w-24 border rounded-lg p-2 text-center font-bold text-lg text-emerald-700 bg-emerald-50 border-emerald-200"
                    />
                 </div>
             </div>
        </section>

        {/* Smart Flags Configuration */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                 <Zap size={20} className="text-slate-500"/>
                 <h3 className="font-bold text-slate-800">إعدادات المؤشرات الذكية </h3>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                     <label className="block text-sm font-bold text-slate-700">عتبة الخطر </label>
                     <p className="text-xs text-slate-500">يعتبر التلميذ في وضعية "خطر" إذا كان معدله الفصلي أقل من هذه القيمة.</p>
                     <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="0" 
                            max="20" 
                            step="0.5"
                            value={formData.smartFlags?.riskThreshold ?? 9}
                            onChange={e => handleSmartFlagChange('riskThreshold', e.target.value)}
                            className="w-24 border rounded p-2 text-center font-bold text-red-600 bg-red-50 border-red-200"
                        />
                        <span className="text-xs font-bold text-slate-400">/ 20</span>
                     </div>
                 </div>

                 <div className="space-y-2">
                     <label className="block text-sm font-bold text-slate-700">عتبة التفوق والموهبة </label>
                     <p className="text-xs text-slate-500">يمنح التلميذ وسام "موهبة" إذا تجاوزت علامته في المواد الأساسية هذه القيمة.</p>
                     <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="0" 
                            max="20" 
                            step="0.5"
                            value={formData.smartFlags?.talentThreshold ?? 18}
                            onChange={e => handleSmartFlagChange('talentThreshold', e.target.value)}
                            className="w-24 border rounded p-2 text-center font-bold text-purple-600 bg-purple-50 border-purple-200"
                        />
                        <span className="text-xs font-bold text-slate-400">/ 20</span>
                     </div>
                 </div>
             </div>
        </section>

        {/* 3. Appreciation Configuration */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Award size={20} className="text-slate-500"/>
                    <h3 className="font-bold text-slate-800">سلم التقديرات </h3>
                 </div>
                 <Button size="sm" variant="outline" onClick={addAppreciation} className="bg-white">
                    <Plus size={16} className="ml-1"/> إضافة مستوى
                 </Button>
             </div>
             <div className="p-6">
                <div className="grid grid-cols-12 gap-4 mb-2 text-xs font-bold text-slate-500 border-b pb-2">
                    <div className="col-span-3 text-center">الحد الأدنى </div>
                    <div className="col-span-5">التسمية </div>
                    <div className="col-span-3">تنسيق اللون </div>
                    <div className="col-span-1"></div>
                </div>
                <div className="space-y-2">
                    {formData.appreciations.map((rule) => (
                        <div key={rule.id} className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3 relative">
                                <input 
                                    type="number" 
                                    step="0.5" 
                                    min="0" max="20" 
                                    value={rule.min} 
                                    onChange={e => handleAppreciationChange(rule.id, 'min', parseFloat(e.target.value))}
                                    className="w-full border rounded p-2 text-center font-mono font-bold"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">/20</span>
                            </div>
                            <div className="col-span-5">
                                <input 
                                    type="text" 
                                    value={rule.label} 
                                    onChange={e => handleAppreciationChange(rule.id, 'label', e.target.value)}
                                    className="w-full border rounded p-2"
                                />
                            </div>
                            <div className="col-span-3">
                                <input 
                                    type="text" 
                                    value={rule.color} 
                                    onChange={e => handleAppreciationChange(rule.id, 'color', e.target.value)}
                                    className="w-full border rounded p-2 text-xs font-mono text-slate-500"
                                    title="Tailwind CSS classes"
                                />
                            </div>
                            <div className="col-span-1 text-center">
                                <button onClick={() => removeAppreciation(rule.id)} className="text-slate-400 hover:text-red-500 p-2">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </section>

        {/* 4. Stream Weights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                    <h3 className="font-bold text-blue-900">معاملات جذع مشترك علوم</h3>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold">
                        مجموع: {calculateTotal(formData.scienceWeights)}
                    </span>
                </div>
                <div className="p-6 space-y-4">
                    {ORDERED_KEYS.map(key => (
                        <div key={`sci-${key}`} className="flex items-center justify-between">
                            <label className="text-slate-700 font-medium text-sm">{SUBJECT_LABELS[key]}</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={formData.scienceWeights[key]} 
                                onChange={e => handleWeightChange('scienceWeights', key, e.target.value)}
                                className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
                    <h3 className="font-bold text-amber-900">معاملات جذع مشترك آداب</h3>
                    <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full font-bold">
                        مجموع: {calculateTotal(formData.artsWeights)}
                    </span>
                </div>
                <div className="p-6 space-y-4">
                    {ORDERED_KEYS.map(key => (
                        <div key={`arts-${key}`} className="flex items-center justify-between">
                            <label className="text-slate-700 font-medium text-sm">{SUBJECT_LABELS[key]}</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={formData.artsWeights[key]} 
                                onChange={e => handleWeightChange('artsWeights', key, e.target.value)}
                                className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-4 shadow-lg z-10">
            <div className="text-sm text-slate-500 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                <p>تنبيه: حفظ الإعدادات سيؤدي إلى إعادة حساب جميع المعدلات والترتيب لجميع التلاميذ فوراً.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <Button variant="ghost" onClick={handleReset} className="text-slate-600 hover:text-slate-800">
                    <RotateCcw size={18} className="ml-2"/> استعادة الافتراضي
                </Button>
                <Button onClick={handleSave} className="flex-1 md:flex-none justify-center min-w-[150px]">
                    <Save size={18} className="ml-2"/> حفظ وتطبيق
                </Button>
            </div>
        </div>

      </div>
    </div>
  );
};

// Helper Icon
const CheckCircleIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
