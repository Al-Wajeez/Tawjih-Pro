
import React, { useState, useEffect } from 'react';
import { X, FileText, CheckSquare, Square, Download, Type } from 'lucide-react';
import { ColumnDefinition } from '../types';
import { Button } from './Button';

interface CustomListModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalStudents: number;
  allColumns: ColumnDefinition[];
  visibleColumnKeys: Set<string>; // To default selections
  onGenerate: (title: string, selectedColKeys: string[]) => void;
}

export const CustomListModal: React.FC<CustomListModalProps> = ({
  isOpen,
  onClose,
  totalStudents,
  allColumns,
  visibleColumnKeys,
  onGenerate
}) => {
  const [title, setTitle] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Initialize selected keys based on what's currently visible in the table
  useEffect(() => {
    if (isOpen) {
        // Filter out index, we generate numbering automatically
        const initialKeys = allColumns
            .filter(c => c.key !== 'index' && !visibleColumnKeys.has(c.key)) // visibleColumnKeys in StudentTable means HIDDEN keys (logic inversion in parent)
            .map(c => c.key);
        
        // Actually, let's just select all relevant columns by default excluding internal IDs
        const relevantKeys = allColumns
            .filter(c => c.key !== 'index')
            .map(c => c.key);
            
        setSelectedKeys(new Set(relevantKeys));
        setTitle('قائمة اسمية مخصصة');
    }
  }, [isOpen, allColumns]);

  const toggleColumn = (key: string) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedKeys(newSet);
  };

  const toggleAll = () => {
      if (selectedKeys.size === allColumns.length - 1) { // -1 for index
          setSelectedKeys(new Set(['fullName'])); // Keep full name at minimum
      } else {
          setSelectedKeys(new Set(allColumns.filter(c => c.key !== 'index').map(c => c.key)));
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText size={24} className="text-primary-600"/>
              منشئ القوائم المخصصة
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              سيتم إنشاء وثيقة لـ <span className="font-bold text-slate-800">{totalStudents}</span> تلميذ بناءً على التصفية الحالية.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Title Input */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Type size={16}/> عنوان القائمة / الوثيقة
                </label>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-lg"
                    placeholder="مثال: قائمة التلاميذ المولودين سنة 2008..."
                />
            </div>

            {/* Columns Selection */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">الأعمدة التي ستظهر في الجدول</label>
                    <button onClick={toggleAll} className="text-xs text-primary-600 hover:underline">
                        تحديد الكل / إلغاء
                    </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allColumns.filter(c => c.key !== 'index').map(col => {
                        const isSelected = selectedKeys.has(col.key);
                        return (
                            <div 
                                key={col.key}
                                onClick={() => toggleColumn(col.key)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className={`text-primary-600 ${isSelected ? 'opacity-100' : 'opacity-30'}`}>
                                    {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                                </div>
                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>
                                    {col.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
            <Button size='md' variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button size='md' onClick={() => onGenerate(title, Array.from(selectedKeys))} disabled={!title.trim() || selectedKeys.size === 0}>
                <Download size={18} className="ml-2"/> تحميل الوثيقة (Word)
            </Button>
        </div>

      </div>
    </div>
  );
};
