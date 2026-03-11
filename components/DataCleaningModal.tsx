
import React, { useState } from 'react';
import { DataConflict } from '../services/guidanceService';
import { AlertTriangle, Check, X, ArrowRight, Merge, ShieldAlert, SplitSquareHorizontal, FileSpreadsheet, Layers, Award } from 'lucide-react';
import { Button } from './Button';

interface DataCleaningModalProps {
    conflicts: DataConflict[];
    onResolve: (resolutions: Record<string, string>) => void;
    onCancel: () => void;
}

export const DataCleaningModal: React.FC<DataCleaningModalProps> = ({ conflicts, onResolve, onCancel }) => {
    // Map of IncomingID -> TargetID (Merge) or "NEW" (Keep Separate)
    const [decisions, setDecisions] = useState<Record<string, string>>({});
    
    // Default all to "Merge" initially? No, safer to force user decision or default to null?
    // Let's default to "Merge" if similarity is very high (>95%), else null
    // Actually, prompt says "Prompts the user".
    
    const handleDecision = (conflictId: string, incomingId: string, targetId: string) => {
        setDecisions(prev => ({ ...prev, [conflictId]: targetId }));
    };

    const handleApply = () => {
        // Convert decision map to the format expected by consolidateData
        // We only care about MERGE decisions. 
        // If decision is "NEW" (Keep Separate), we do nothing (no resolution map entry needed).
        // If decision is "MERGE" (TargetID), we map IncomingID -> TargetID
        
        const resolutionMap: Record<string, string> = {};
        
        conflicts.forEach(c => {
            const decision = decisions[c.id];
            // ID generation logic must match services/guidanceService
            const incomingRawId = `${c.incoming.fullName.trim().replace(/\s+/g, '_')}_${c.incoming.birthDate.trim()}`;
            // If normalized in service, we should probably pass the raw IDs in the Conflict object to be safe.
            // But let's assume the ID used in conflict object is unique enough for the list key
            
            if (decision && decision !== 'NEW') {
                resolutionMap[incomingRawId] = decision;
            }
        });

        onResolve(resolutionMap);
    };

    const resolvedCount = Object.keys(decisions).length;
    const totalCount = conflicts.length;
    const allResolved = resolvedCount === totalCount;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <ShieldAlert size={24} className="text-amber-500"/>
                            معالجة البيانات وحل التعارضات
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            تم اكتشاف <span className="font-bold text-slate-800">{totalCount}</span> حالة تشابه. يرجى تحديد ما إذا كانت هذه الأسماء تعود لنفس التلميذ.
                        </p>
                    </div>
                    <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-md text-xs font-bold">
                        {resolvedCount} / {totalCount} تم الحل
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 space-y-4">
                    {conflicts.map((c) => {
                        const decision = decisions[c.id];
                        const isMerge = decision === c.existing.id;
                        const isNew = decision === 'NEW';
                        
                        // Helpers for display
                        const existingSemesters = [];
                        if (c.existing.student.s1 && Object.keys(c.existing.student.s1).length > 0) existingSemesters.push('S1');
                        if (c.existing.student.s2 && Object.keys(c.existing.student.s2).length > 0) existingSemesters.push('S2');
                        if (c.existing.student.s3 && Object.keys(c.existing.student.s3).length > 0) existingSemesters.push('S3');
                        if (c.existing.student.past && Object.keys(c.existing.student.past).length > 0) existingSemesters.push('Past');

                        const incomingAvg = c.incoming.raw.grades?.avg;

                        return (
                            <div key={c.id} className={`bg-white rounded-xl border shadow-sm transition-all overflow-hidden ${decision ? 'border-l-4 border-l-emerald-500 opacity-60 hover:opacity-100' : 'border-l-4 border-l-amber-500'}`}>
                                <div className="p-4 flex flex-col md:flex-row items-stretch gap-4">
                                    
                                    {/* Existing (Target) */}
                                    <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-200 w-full relative group hover:border-slate-300 transition-colors">
                                        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                                            <Layers size={12}/> الملف الأصلي (موجود)
                                        </div>
                                        <div className="font-bold text-slate-800 text-lg">{c.existing.fullName}</div>
                                        <div className="text-sm text-slate-500 font-mono mb-2">{c.existing.birthDate}</div>
                                        
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 font-medium">
                                                القسم: {c.existing.student.classCode || 'غير محدد'}
                                            </span>
                                            {existingSemesters.map(sem => (
                                                <span key={sem} className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold">
                                                    {sem}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    <div className="flex flex-col items-center justify-center gap-2 px-2">
                                        <div className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${c.similarity > 0.9 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                            تطابق {(c.similarity * 100).toFixed(0)}%
                                        </div>
                                        <ArrowRight size={24} className="text-slate-300 rtl:rotate-180 hidden md:block"/>
                                        <div className="md:hidden text-slate-300 rotate-90"><ArrowRight size={24}/></div>
                                    </div>

                                    {/* Incoming (Source) */}
                                    <div className="flex-1 bg-blue-50/50 p-4 rounded-lg border border-blue-100 w-full relative group hover:border-blue-200 transition-colors">
                                        <div className="absolute top-3 left-3 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200 flex items-center gap-1">
                                            <FileSpreadsheet size={10}/>
                                            ملف {c.incoming.sourceFile}
                                        </div>
                                        <div className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                                            <Layers size={12}/> بيانات واردة (جديدة)
                                        </div>
                                        <div className="font-bold text-blue-900 text-lg">{c.incoming.fullName}</div>
                                        <div className="text-sm text-blue-700 font-mono mb-2">{c.incoming.birthDate}</div>
                                        
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="bg-white border border-blue-200 px-2 py-1 rounded text-blue-700 font-medium">
                                                القسم: {c.incoming.raw.classCode || 'غير محدد'}
                                            </span>
                                            {incomingAvg !== undefined && (
                                                <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-bold flex items-center gap-1">
                                                    <Award size={10}/>
                                                    المعدل: {incomingAvg}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                {/* Decision Toolbar */}
                                <div className="bg-slate-50 p-3 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
                                    <button 
                                        onClick={() => handleDecision(c.id, '', c.existing.id)}
                                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all border ${isMerge ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                                    >
                                        <Merge size={16}/>
                                        نعم، هو نفس التلميذ (دمج)
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleDecision(c.id, '', 'NEW')}
                                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all border ${isNew ? 'bg-slate-700 text-white border-slate-800 shadow-md ring-2 ring-slate-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300'}`}
                                    >
                                        <SplitSquareHorizontal size={16}/>
                                        لا، تلميذ مختلف (فصل)
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onCancel}>إلغاء العملية</Button>
                    <Button onClick={handleApply} disabled={!allResolved}>
                        <Check size={18} className="ml-2"/>
                        تأكيد ومتابعة المعالجة
                    </Button>
                </div>

            </div>
        </div>
    );
};
