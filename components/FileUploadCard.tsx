import React, { useRef, useState } from 'react';
import { RotateCw, FileSpreadsheet, AlertCircle, X, Plus } from 'lucide-react';
import { ProcessedFile } from '../types';
import { readExcelFile } from '../services/excelService';

interface FileUploadCardProps {
  label: string;
  type: ProcessedFile['type'];
  files: ProcessedFile[];
  onFileProcessed: (data: ProcessedFile) => void; // Note: this accepts a single file, not array
  onRemoveFile: (index: number) => void;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({ 
  label, 
  type, 
  files, 
  onFileProcessed,
  onRemoveFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files; // Rename to avoid confusion with props.files
    if (!selectedFiles || selectedFiles.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Small timeout to allow UI to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Process files one by one since onFileProcessed accepts a single file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const processed = await readExcelFile(file, type);
        onFileProcessed(processed); // Call parent for each file
      }
      
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setError("خطأ في قراءة الملف. تأكد من الصيغة.");
    } finally {
      setLoading(false);
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header / Upload Area */}
      <div 
        className={`p-6 border-b border-slate-100 transition-colors cursor-pointer text-center
          ${loading ? 'bg-slate-50' : 'hover:bg-primary-50'}
        `}
        onClick={() => !loading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".xlsx,.xls"
          multiple
        />
        
        <div className="flex flex-col items-center gap-3">
          {loading ? (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center animate-spin text-blue-600">
              <RotateCw size={24} />
            </div>
          ) : (
             <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
               ${hasFiles ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}
             `}>
                {hasFiles ? <Plus size={24} /> : <FileSpreadsheet size={24} />}
             </div>
          )}
          
          <div>
            <h3 className="font-bold text-lg text-slate-800">{label}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {loading ? 'جاري المعالجة...' : 'اضغط لإضافة ملف'}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-3 flex items-center justify-center gap-1 bg-red-50 py-1 px-2 rounded">
            <AlertCircle size={12}/> {error}
          </p>
        )}
      </div>

      {/* File List */}
      <div className="bg-slate-50 flex-1 p-3 min-h-[100px]">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            لم يتم رفع أي ملفات
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li key={idx} className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-slate-700 truncate" title={file.fileName}>
                      {file.fileName}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {file.students.length} تلميذ •  قسم السنة الرابعة متوسط {file.metadata.classCode || 'بدون فوج'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(idx); }}
                  className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Footer Info */}
      {hasFiles && (
        <div className="p-3 bg-white border-t border-slate-100 text-center">
          <span className="text-xs font-bold text-slate-600">
             المجموع: {files.reduce((acc, f) => acc + f.students.length, 0)} تلميذ
          </span>
        </div>
      )}
    </div>
  );
};