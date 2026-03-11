
import React from 'react';
import { ConsolidatedStudent, FileMetadata } from '../types';
import { PlacementStats } from './PlacementStats';

interface ReportTemplateProps {
  students: ConsolidatedStudent[];
  type: 'S1' | 'S2' | 'S3';
  metadata: Partial<FileMetadata>;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ students, type, metadata }) => {
  const getTitle = () => {
    if (type === 'S1') return 'الجدول الاستخلاصي لعملية التوجيه التدريجي';
    if (type === 'S2') return 'الجدول الاستخلاصي لعملية التوجيه المسبق';
    return 'الجدول الاستخلاصي لعملية التوجيه النهائي';
  };

  const getAvg = (s: ConsolidatedStudent) => {
    if (type === 'S1') return s.s1?.avg?.toFixed(2) || '-';
    if (type === 'S2') return (((s.s1?.avg || 0) + (s.s2?.avg || 0)) / 2).toFixed(2);
    return (((s.s1?.avg || 0) + (s.s2?.avg || 0) + (s.s3?.avg || 0)) / 3).toFixed(2);
  };

  const getOrient = (s: ConsolidatedStudent) => {
      if (type === 'S1') return s.orientationS1;
      if (type === 'S2') return s.orientationS2;
      return s.orientationS3;
  };
  
  const getGuidance = (s: ConsolidatedStudent) => {
      if (type === 'S1') return s.guidance;
      if (type === 'S2') return s.guidanceS2;
      return s.guidanceS3;
  };

  return (
    <div className="w-full text-black bg-white p-8 hidden print:block print:w-full print:absolute print:top-0 print:left-0 print:z-50 print:m-0">
      <style>{`
         @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; }
         }
      `}</style>
      
      {/* Header */}
      <div className="text-center font-bold mb-4">
         <h2 className="text-sm">الجمهوريــــة الجزائريــــة الديمقراطيـــــة الشعبيـــــــــــة</h2>
         <h3 className="text-sm mb-4">وزارة التربية الوطنية</h3>
         
         <div className="flex justify-between items-start text-xs border-b pb-2 mb-2">
            <div className="text-right">
               <p>مديرية التربية لولاية: {metadata.directorate || '....................'}</p>
               <p>مصلحة التكويـــن والتفتيــــش</p>
               <p>مكتب التوجيـــه والتقويـــــــم</p>
            </div>
            
            <div className="text-left">
               <p>المؤسسة: {metadata.school || '....................'}</p>
               <p>مركز التوجيه</p>
               <p>السنة الدراسية: {metadata.year || '....................'}</p>
            </div>
         </div>
      </div>

      <h1 className="text-lg font-bold text-center underline my-4">{getTitle()}</h1>

      <table className="w-full text-[10px] border-collapse border border-black mb-8">
        <thead>
           <tr className="bg-gray-100">
             <th className="border border-black p-1 w-8">رقم</th>
             <th className="border border-black p-1">الاسم واللقب</th>
             <th className="border border-black p-1 w-8">الجنس</th>
             <th className="border border-black p-1 w-8">الحالة</th>
             <th className="border border-black p-1 w-8">القسم</th>
             {type === 'S3' && <th className="border border-black p-1 w-10">م.شهادة</th>}
             <th className="border border-black p-1 w-10">
               {type === 'S1' ? 'م. ف1' : type === 'S2' ? 'م. ف1+2' : 'م. سنوي'}
             </th>
             <th className="border border-black p-1">رغبة التلميذ</th>
             <th className="border border-black p-1 w-10">مجموعة التوجيه علوم</th>
             <th className="border border-black p-1 w-8">ترتيب</th>
             <th className="border border-black p-1 w-10">مجموعة التوجيه آداب</th>
             <th className="border border-black p-1 w-8">ترتيب</th>
             <th className="border border-black p-1">اقتراح المستشار</th>
             <th className="border border-black p-1">اقتراح المجلس</th>
             {type === 'S3' && <th className="border border-black p-1">قرار القبول</th>}
           </tr>
        </thead>
        <tbody>
           {students.map((s, idx) => {
             const orient = getOrient(s);
             const guid = getGuidance(s);
             
             return (
               <tr key={s.id}>
                 <td className="border border-black p-1 text-center">{idx + 1}</td>
                 <td className="border border-black p-1 text-right font-medium">{s.fullName}</td>
                 <td className="border border-black p-1 text-center">{s.gender === 'ذكر' ? 'ذ' : 'ث'}</td>
                 <td className="border border-black p-1 text-center">{s.isRepeater ? 'م' : 'ج'}</td>
                 <td className="border border-black p-1 text-center">{s.classCode || ''}</td>
                 {type === 'S3' && <td className="border border-black p-1 text-center">{s.bemGrade || '-'}</td>}
                 <td className="border border-black p-1 text-center font-bold">{getAvg(s)}</td>
                 <td className="border border-black p-1 text-center">{orient.choice1 || '-'}</td>
                 <td className="border border-black p-1 text-center">{guid?.scienceScore?.toFixed(2)}</td>
                 <td className="border border-black p-1 text-center">{guid?.scienceRank}</td>
                 <td className="border border-black p-1 text-center">{guid?.artsScore?.toFixed(2)}</td>
                 <td className="border border-black p-1 text-center">{guid?.artsRank}</td>
                 <td className="border border-black p-1 text-center">{orient.counselorDecision || '-'}</td>
                 <td className="border border-black p-1 text-center">{orient.councilDecision || '-'}</td>
                 {type === 'S3' && <td className="border border-black p-1 text-center font-bold">{orient.admissionsDecision || '-'}</td>}
               </tr>
             );
           })}
        </tbody>
      </table>

      {/* Embedded Statistics */}
      <div className="page-break-inside-avoid">
        <PlacementStats students={students} type={type} />
      </div>
    </div>
  );
};
