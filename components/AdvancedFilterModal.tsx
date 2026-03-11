import React, { useState } from 'react';
import { X, Plus, Filter, ArrowUpDown, Layers, Trash2, ArrowUp, ArrowDown, RotateCcw, Zap, AlertTriangle, Sparkles, Shuffle } from 'lucide-react';
import { ColumnDefinition, FilterRule, SortRule, GroupRule, FilterOperator, SmartFlagType } from '../types';
import { Button } from './Button';

interface AdvancedFilterModalProps {
  columns: ColumnDefinition[];
  activeSorts: SortRule[];
  activeFilters: FilterRule[];
  activeGroup: GroupRule;
  activeSmartFilter: SmartFlagType | null;
  onApply: (filters: FilterRule[], sorts: SortRule[], group: GroupRule, smartFilter: SmartFlagType | null) => void;
  onClose: () => void;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  columns,
  activeSorts,
  activeFilters,
  activeGroup,
  activeSmartFilter,
  onApply,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'filter' | 'sort' | 'group' | 'smart'>('smart');
  const [filters, setFilters] = useState<FilterRule[]>(activeFilters);
  const [sorts, setSorts] = useState<SortRule[]>(activeSorts);
  const [group, setGroup] = useState<GroupRule>(activeGroup);
  const [smartFilter, setSmartFilter] = useState<SmartFlagType | null>(activeSmartFilter);

  // -- Sort Handlers --
  const addSort = () => {
    setSorts([...sorts, { id: Date.now().toString(), field: columns[0].key, direction: 'asc' }]);
  };
  const removeSort = (id: string) => {
    setSorts(sorts.filter(s => s.id !== id));
  };
  const updateSort = (id: string, key: keyof SortRule, val: any) => {
    setSorts(sorts.map(s => s.id === id ? { ...s, [key]: val } : s));
  };

  // -- Filter Handlers --
  const addFilter = () => {
    setFilters([...filters, { id: Date.now().toString(), field: columns[0].key, operator: 'equals', value: '' }]);
  };
  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };
  const updateFilter = (id: string, key: keyof FilterRule, val: any) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const getOperators = (fieldKey: string): { label: string, value: FilterOperator }[] => {
    const col = columns.find(c => c.key === fieldKey);
    const type = col?.type || 'string';
    
    const common: { label: string, value: FilterOperator }[] = [
        { label: 'يساوي', value: 'equals' },
    ];

    if (type === 'number') {
        return [
            ...common,
            { label: 'أكبر من', value: 'greaterThan' },
            { label: 'أصغر من', value: 'lessThan' },
            { label: 'بين قيمتين', value: 'between' },
            { label: 'أفضل 10', value: 'top10' },
        ];
    }

    if (type === 'string') {
        return [
            ...common,
            { label: 'يحتوي على', value: 'contains' },
            { label: 'يبدأ بـ', value: 'startsWith' },
            { label: 'ينتهي بـ', value: 'endsWith' },
        ];
    }

    return common;
  };

  const handleApply = () => {
    onApply(filters, sorts, group, smartFilter);
    onClose();
  };

  const handleReset = () => {
      setFilters([]);
      setSorts([]);
      setGroup({ field: null });
      setSmartFilter(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Filter size={20} className="text-primary-600"/>
            تصفية وفرز متقدم
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 justify-between overflow-x-auto">
           <button onClick={() => setActiveTab('smart')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'smart' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500'}`}>
              <Zap size={16}/> تصفية ذكية
           </button>
           <button onClick={() => setActiveTab('sort')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'sort' ? 'border-primary-500 text-primary-700 bg-white' : 'border-transparent text-slate-500'}`}>
              <ArrowUpDown size={16}/> الفرز
           </button>
           <button onClick={() => setActiveTab('filter')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'filter' ? 'border-primary-500 text-primary-700 bg-white' : 'border-transparent text-slate-500'}`}>
              <Filter size={16}/> التصفية
           </button>
           <button onClick={() => setActiveTab('group')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'group' ? 'border-primary-500 text-primary-700 bg-white' : 'border-transparent text-slate-500'}`}>
              <Layers size={16}/> التجميع
           </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
            
            {/* --- SMART TAB --- */}
            {activeTab === 'smart' && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <label className="block text-sm font-bold text-slate-700 mb-3">اختر معيار التصفية الذكي:</label>
                        <div className="space-y-3">
                            <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${smartFilter === null ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="smart" className="hidden" checked={smartFilter === null} onChange={() => setSmartFilter(null)} />
                                <div className="flex-1 font-medium text-slate-700">الكل (إلغاء التصفية الذكية)</div>
                            </label>

                            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${smartFilter === 'risk' ? 'bg-red-50 border-red-200 ring-1 ring-red-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="smart" className="hidden" checked={smartFilter === 'risk'} onChange={() => setSmartFilter('risk')} />
                                <div className="p-2 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={18}/></div>
                                <div>
                                    <div className="font-bold text-slate-800">تلاميذ في خطر</div>
                                    <div className="text-xs text-slate-500">عرض التلاميذ الذين معدلاتهم أقل من عتبة الخطر.</div>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${smartFilter === 'mismatch' ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="smart" className="hidden" checked={smartFilter === 'mismatch'} onChange={() => setSmartFilter('mismatch')} />
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><Shuffle size={18}/></div>
                                <div>
                                    <div className="font-bold text-slate-800">اختلال الرغبة والتوجيه</div>
                                    <div className="text-xs text-slate-500">عرض التلاميذ الذين لا تتوافق رغبتهم الأولى مع التوجيه المحسوب.</div>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${smartFilter === 'talent_science' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="smart" className="hidden" checked={smartFilter === 'talent_science'} onChange={() => setSmartFilter('talent_science')} />
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><Sparkles size={18}/></div>
                                <div>
                                    <div className="font-bold text-slate-800">موهبة علمية</div>
                                    <div className="text-xs text-slate-500">عرض التلاميذ المتفوقين في المواد العلمية.</div>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${smartFilter === 'talent_arts' ? 'bg-pink-50 border-pink-200 ring-1 ring-pink-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="smart" className="hidden" checked={smartFilter === 'talent_arts'} onChange={() => setSmartFilter('talent_arts')} />
                                <div className="p-2 bg-pink-100 text-pink-600 rounded-full"><Sparkles size={18}/></div>
                                <div>
                                    <div className="font-bold text-slate-800">موهبة أدبية</div>
                                    <div className="text-xs text-slate-500">عرض التلاميذ المتفوقين في المواد الأدبية.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SORT TAB --- */}
            {activeTab === 'sort' && (
                <div className="space-y-4">
                    {sorts.map((sort, index) => {
                        const fieldInCurrentView = columns.some(c => c.key === sort.field);
                        return (
                            <div key={sort.id} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-slate-400 text-sm w-6">{index + 1}.</span>
                                <select 
                                    value={sort.field} 
                                    onChange={e => updateSort(sort.id, 'field', e.target.value)}
                                    className={`flex-1 p-2 border rounded text-sm outline-none focus:border-primary-500 ${fieldInCurrentView ? 'border-slate-300' : 'border-amber-300 bg-amber-50'}`}
                                >
                                    {!fieldInCurrentView && (
                                        <option value={sort.field} disabled>{sort.field} (خارج العرض الحالي)</option>
                                    )}
                                    {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                </select>
                                <div className="flex bg-slate-100 rounded p-1">
                                    <button 
                                       onClick={() => updateSort(sort.id, 'direction', 'asc')}
                                       className={`p-1 rounded ${sort.direction === 'asc' ? 'bg-white shadow text-primary-600' : 'text-slate-400'}`}
                                    >
                                        <ArrowUp size={16}/>
                                    </button>
                                    <button 
                                       onClick={() => updateSort(sort.id, 'direction', 'desc')}
                                       className={`p-1 rounded ${sort.direction === 'desc' ? 'bg-white shadow text-primary-600' : 'text-slate-400'}`}
                                    >
                                        <ArrowDown size={16}/>
                                    </button>
                                </div>
                                <button onClick={() => removeSort(sort.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                            </div>
                        );
                    })}
                    <Button onClick={addSort} variant="outline" size="sm" className="w-full border-dashed">
                        <Plus size={16} className="ml-1"/> إضافة مستوى فرز
                    </Button>
                </div>
            )}

            {/* --- FILTER TAB --- */}
            {activeTab === 'filter' && (
                <div className="space-y-4">
                    {filters.map((filter) => {
                        const fieldInCurrentView = columns.some(c => c.key === filter.field);
                        return (
                            <div key={filter.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <select 
                                    value={filter.field} 
                                    onChange={e => updateFilter(filter.id, 'field', e.target.value)}
                                    className={`w-full sm:w-1/3 p-2 border rounded text-sm outline-none focus:border-primary-500 ${fieldInCurrentView ? 'border-slate-300' : 'border-amber-300 bg-amber-50'}`}
                                >
                                    {!fieldInCurrentView && (
                                        <option value={filter.field} disabled>{filter.field}</option>
                                    )}
                                    {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                </select>
                                <select 
                                    value={filter.operator} 
                                    onChange={e => updateFilter(filter.id, 'operator', e.target.value)}
                                    className="w-full sm:w-1/4 p-2 border border-slate-300 rounded text-sm outline-none focus:border-primary-500"
                                >
                                    {getOperators(filter.field).map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                                
                                {filter.operator !== 'top10' && (
                                    <input 
                                        type={columns.find(c => c.key === filter.field)?.type === 'number' ? 'number' : 'text'}
                                        value={filter.value}
                                        onChange={e => updateFilter(filter.id, 'value', e.target.value)}
                                        placeholder="القيمة..."
                                        className="flex-1 w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-primary-500"
                                    />
                                )}
                                
                                {filter.operator === 'between' && (
                                    <input 
                                        type="number"
                                        value={filter.value2 || ''}
                                        onChange={e => updateFilter(filter.id, 'value2', e.target.value)}
                                        placeholder="إلى..."
                                        className="w-24 p-2 border border-slate-300 rounded text-sm outline-none focus:border-primary-500"
                                    />
                                )}

                                <button onClick={() => removeFilter(filter.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                            </div>
                        );
                    })}
                    <Button onClick={addFilter} variant="outline" size="sm" className="w-full border-dashed">
                        <Plus size={16} className="ml-1"/> إضافة شرط تصفية
                    </Button>
                </div>
            )}

             {/* --- GROUP TAB --- */}
             {activeTab === 'group' && (
                <div className="space-y-4">
                     <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <label className="block text-sm font-medium text-slate-700 mb-2">تجميع حسب الحقل:</label>
                        <select 
                                value={group.field || ''} 
                                onChange={e => setGroup({ field: e.target.value || null })}
                                className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-primary-500"
                            >
                                <option value="">بدون تجميع</option>
                                <option value="birthDate">تاريخ الميلاد</option>
                                <option value="gender">الجنس</option>
                                <option value="classCode">القسم</option>
                                <option value="orientationS1.preliminaryGuidance">التوجيه الأولي (S1)</option>
                                <option value="orientationS1.choice1">الرغبة 1 (S1)</option>
                                <option value="orientationS1.compatibility">التوافق (S1)</option>
                                <option value="orientationS1.counselorDecision">اقتراح المستشار (S1)</option>
                                <option value="orientationS1.councilDecision">قرار المجلس (S1)</option>
                                <option value="orientationS3.admissionsDecision">قرار مجلس القبول (S3)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                عند تفعيل التجميع، سيتم عرض البيانات مقسمة إلى فئات بناءً على الحقل المختار.
                            </p>
                     </div>
                </div>
             )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <Button type="button" variant="ghost" onClick={handleReset} className="text-slate-500">
             <RotateCcw size={16} className="ml-2" /> إعادة تعيين
          </Button>
          <div className="flex gap-2">
             <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
             <Button type="button" onClick={handleApply}>تطبيق التغييرات</Button>
          </div>
        </div>
      </div>
    </div>
  );
};