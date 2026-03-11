
import { ConsolidatedStudent, FileMetadata, ColumnDefinition } from "../types";
import { getNestedValue } from "./dataProcessor";

// --- Helpers ---

const formatValueForExport = (key: string, value: any): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (typeof value === 'number') return value.toFixed(2);

    if (key.includes('compatibility')) {
        if (value === 'comply') return 'متوافق';
        if (value === 'not-comply') return 'غير متوافق';
    }
    if (key.includes('stability')) {
        if (value === 'stable') return 'مستقر';
        if (value === 'unstable') return 'متذبذب';
    }
    if (key.includes('preliminaryGuidance')) {
        if (value === 'science') return 'علوم';
        if (value === 'arts') return 'آداب';
    }
    return String(value);
};

const getCommonHeader = (meta: Partial<FileMetadata>) => `
    <div class="header">
        <div class="header-top">
          الجمهوريــــة الجزائريــــة الديمقراطيـــــة الشعبيـــــــــــة<br/>
          وزارة التربية الوطنية
        </div>
        <table style="border: none; width: 100%; margin-bottom: 20px;">
          <tr>
             <td style="border: none; text-align: right; vertical-align: top; width: 33%;">
               <span class="label"> ${meta.directorate || '....................'}</span><br/>
               <span class="label"> ${meta.school || '....................'}</span>
             </td>
             <td style="border: none; width: 33%;"></td>
             <td style="border: none; text-align: left; vertical-align: top; width: 33%;">
               <span class="label">السنة الدراسية:</span> ${meta.year || '....................'}<br/>
               <span class="label">تاريخ الاستخراج:</span> ${new Date().toLocaleDateString('ar-DZ')}
             </td>
          </tr>
        </table>
    </div>
`;

// Professional CSS for Word
const getWordStyles = (isLandscape: boolean) => `
    <style>
        @page Section1 {
            size: ${isLandscape ? '841.9pt 595.3pt' : '595.3pt 841.9pt'};
            mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
            margin: 1.5cm;
        }
        div.Section1 {
            page: Section1;
        }
        body { font-family: 'Times New Roman', serif; direction: rtl; font-size: 11pt; color: #1f2937; }
        
        /* Headers */
        .header { margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        .header-top { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 15px; color: #1e3a8a; }
        .label { font-weight: bold; color: #4b5563; font-size: 11pt; }
        
        .title { 
            text-align: center; font-weight: bold; font-size: 18pt; 
            margin: 20px 0; padding: 10px; 
            background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 8px;
        }
        
        /* Tables */
        table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 15px; }
        th { 
            border: 1px solid #94a3b8; 
            background-color: #f1f5f9; 
            color: #334155;
            padding: 8px; 
            text-align: center; 
            font-weight: bold; 
        }
        td { 
            border: 1px solid #cbd5e1; 
            padding: 6px; 
            text-align: center; 
            vertical-align: middle;
        }
        
        /* Specific Table Styles */
        .thead-dark th { background-color: #1e293b; color: white; border-color: #0f172a; }
        .thead-blue th { background-color: #dbeafe; color: #1e40af; border-color: #93c5fd; }
        .thead-amber th { background-color: #fef3c7; color: #92400e; border-color: #fcd34d; }
        
        /* Utility Colors */
        .text-success { color: #15803d; font-weight: bold; }
        .text-danger { color: #b91c1c; font-weight: bold; }
        .bg-success-light { background-color: #dcfce7; }
        .bg-danger-light { background-color: #fee2e2; }
        .bg-blue-light { background-color: #eff6ff; }
        .bg-amber-light { background-color: #fffbeb; }
        
        /* Section Titles */
        .section-header {
            font-size: 14pt; font-weight: bold; color: #374151;
            border-bottom: 1px solid #e5e7eb; margin-top: 20px; margin-bottom: 10px; padding-bottom: 5px;
        }
        
        /* Boxes */
        .box { border: 1px solid #e2e8f0; padding: 10px; background-color: #f8fafc; border-radius: 4px; }
        .box-warning { background-color: #fffbeb; border-color: #fcd34d; }
    </style>
`;

// Helper to wrap content for Word
const wrapHtml = (content: string, title: string, isLandscape: boolean) => `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        ${getWordStyles(isLandscape)}
    </head>
    <body>
        <div class="Section1">
            ${content}
        </div>
    </body>
    </html>
`;

// Helper to download blob
const downloadDoc = (html: string, filename: string) => {
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- Export Functions ---

export const exportVirtualGuidanceToWord = (
    data: { top: ConsolidatedStudent[], science: ConsolidatedStudent[], arts: ConsolidatedStudent[] },
    meta: Partial<FileMetadata>
) => {
    const renderTable = (
        list: ConsolidatedStudent[], 
        title: string, 
        headerClass: string,
        columns: { science: boolean, arts: boolean }
    ) => {
        if (list.length === 0) return '';
        
        // Calculate average helper (similar to component logic)
        const getAvg = (s: ConsolidatedStudent) => {
             // BEM > Annual > S3 > S2 > S1
             if (s.bemGrade && s.bemGrade >= 10) return s.bemGrade;
             const s1 = s.s1?.avg || 0;
             const s2 = s.s2?.avg || 0;
             const s3 = s.s3?.avg || 0;
             if (s.s3?.avg) return (s1 + s2 + s3) / 3;
             if (s.s2?.avg) return (s1 + s2) / 2;
             return s1;
        };

        const rows = list.map((s, idx) => {
            const avg = getAvg(s);
            const sciScore = s.guidanceS3?.scienceScore || s.guidanceS2?.scienceScore || s.guidance?.scienceScore || 0;
            const artsScore = s.guidanceS3?.artsScore || s.guidanceS2?.artsScore || s.guidance?.artsScore || 0;

            return `
            <tr>
                <td>${idx + 1}</td>
                <td style="text-align: right; font-weight: bold;">${s.fullName}</td>
                <td>${s.classCode || '-'}</td>
                <td style="font-weight: bold;">${avg.toFixed(2)}</td>
                ${columns.science ? `<td dir="ltr" style="background-color: #eff6ff; font-weight: bold; color: #1e40af;">${sciScore.toFixed(2)}</td>` : ''}
                ${columns.arts ? `<td dir="ltr" style="background-color: #fffbeb; font-weight: bold; color: #92400e;">${artsScore.toFixed(2)}</td>` : ''}
                <td>${s.orientationS3.choice1 || s.orientationS2.choice1 || '-'}</td>
                <td style="font-weight: bold; color: #15803d;">${(s as any).virtualDecision || '-'}</td>
            </tr>
        `}).join('');

        return `
            <div class="section-header" style="margin-top: 25px;">${title} <span style="font-size:10pt; font-weight:normal;">(العدد: ${list.length})</span></div>
            <table>
                <thead class="${headerClass}">
                    <tr>
                        <th width="5%">#</th>
                        <th width="20%">الاسم واللقب</th>
                        <th width="10%">القسم</th>
                        <th width="10%">المعدل</th>
                        ${columns.science ? '<th width="10%">معدل العلوم</th>' : ''}
                        ${columns.arts ? '<th width="10%">معدل الآداب</th>' : ''}
                        <th width="15%">الرغبة</th>
                        <th width="15%">القرار الافتراضي</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    };

    const pageBreak = '<br clear="all" style="page-break-before:always" />';
    
    // 1. Top List (Science + Arts Scores)
    let content = `
        ${getCommonHeader(meta)}
        <div class="title">نتائج التوجيه الافتراضي (نظام الكوتا)</div>
        ${renderTable(data.top, 'قائمة الامتياز (النخبة)', 'thead-amber', { science: true, arts: true })}
        <div style="margin-top: 10px; font-size: 10pt; color: #666; font-style: italic;">
            * ملاحظة: التلاميذ في هذه القائمة يتم توجيههم حسب رغبتهم الأولى بفضل معدلاتهم المرتفعة.
        </div>
    `;

    // 2. Science List (Science Score Only)
    if (data.science.length > 0) {
        content += pageBreak;
        content += `
            ${getCommonHeader(meta)}
            <div class="title">نتائج التوجيه الافتراضي (كوتا العلوم)</div>
            ${renderTable(data.science, 'قائمة كوتا العلوم', 'thead-blue', { science: true, arts: false })}
        `;
    }

    // 3. Arts List (Arts Score Only)
    if (data.arts.length > 0) {
        content += pageBreak;
        content += `
            ${getCommonHeader(meta)}
            <div class="title">نتائج التوجيه الافتراضي (كوتا الآداب)</div>
            ${renderTable(data.arts, 'قائمة الآداب (البقية)', 'thead-dark', { science: false, arts: true })}
        `;
    }

    downloadDoc(wrapHtml(content, 'Virtual Guidance', true), `التوجيه_الافتراضي_${new Date().toISOString().slice(0,10)}.doc`);
};


export const printAppointmentSchedule = (students: ConsolidatedStudent[], dateContext: string | null, meta: Partial<FileMetadata>) => {
    // 1. Get all scheduled students
    let appointments = students.filter(s => s.interview?.status === 'scheduled');

    // 2. Sort by Date ascending, then Time ascending
    appointments.sort((a, b) => {
        const dateA = a.interview?.date || '9999-99-99';
        const dateB = b.interview?.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.interview?.time || '00:00').localeCompare(b.interview?.time || '00:00');
    });

    if (appointments.length === 0) {
        // Fallback if empty
        const content = `
            ${getCommonHeader(meta)}
            <div class="title">جدول المقابلات الفردية</div>
            <p style="text-align:center; padding: 20px;">لا توجد مواعيد مبرمجة.</p>
        `;
        downloadDoc(wrapHtml(content, 'Appointments', false), `جدول_المقابلات.doc`);
        return;
    }

    // 3. Group by Date
    const grouped: Record<string, ConsolidatedStudent[]> = {};
    appointments.forEach(s => {
        const d = s.interview?.date || 'غير محدد';
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(s);
    });

    // 4. Generate content for all dates (separated by page breaks)
    const content = Object.keys(grouped).sort().map((dateKey, index) => {
        const group = grouped[dateKey];
        const dateLabel = dateKey === 'غير محدد' 
            ? 'تاريخ غير محدد' 
            : new Date(dateKey).toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const rows = group.map((s, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td style="font-weight: bold; color: #2563eb;">${s.interview?.time || '--:--'}</td>
                <td style="text-align: right; font-weight: bold;">${s.fullName}</td>
                <td>${s.classCode || '-'}</td>
                <td>${s.orientationS3.choice1 || s.orientationS2.choice1 || s.orientationS1.choice1 || '-'}</td>
                <td>.............................</td>
            </tr>
        `).join('');

        const pageBreak = index < Object.keys(grouped).length - 1 ? '<br clear="all" style="page-break-before:always" />' : '';

        return `
            ${getCommonHeader(meta)}
            <div class="title">جدول المقابلات الفردية</div>
            
            <div style="text-align: center; margin-bottom: 20px; font-size: 14pt; background-color: #f8fafc; padding: 10px; border-radius: 8px;">
                ليوم: <strong>${dateLabel}</strong>
            </div>

            <table>
                <thead class="thead-dark">
                    <tr>
                        <th width="5%">#</th>
                        <th width="15%">التوقيت</th>
                        <th>الاسم واللقب</th>
                        <th width="10%">القسم</th>
                        <th width="20%">الرغبة</th>
                        <th width="20%">التوقيع</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div style="margin-top: 50px;">
                <table style="border: none;">
                    <tr>
                        <td style="border: none; width: 50%;"></td>
                        <td style="border: none; width: 50%; text-align: center;">
                            <strong>مستشار التوجيه والإرشاد المدرسي والمهني:</strong>
                        </td>
                    </tr>
                </table>
            </div>
            ${pageBreak}
        `;
    }).join('');

    downloadDoc(wrapHtml(content, 'Appointments', false), `جدول_المقابلات_الشامل.doc`);
};

export const exportRemedialPlanToWord = (
    student: ConsolidatedStudent, 
    analysis: { 
        weaknesses: string[], 
        strengths: string[], 
        observations: string[], 
        stats: { sciAvg: number, litAvg: number }
    },
    meta: Partial<FileMetadata>,
    semester: 's1' | 's2' | 's3'
) => {
    const s = student[semester];
    const avg = s?.avg?.toFixed(2) || '-';
    const semLabel = semester === 's1' ? 'الفصل الأول' : semester === 's2' ? 'الفصل الثاني' : 'الفصل الثالث';
    const getGrade = (key: string) => (s as any)?.[key]?.toFixed(2) || '-';

    const content = `
        ${getCommonHeader(meta)}
        <div class="title" style="background-color: #fee2e2; border-color: #fca5a5; color: #991b1b;">
            بطاقة التشخيص والمعالجة البيداغوجية
            <div style="font-size: 12pt; margin-top: 5px; font-weight: normal;">${semLabel}</div>
        </div>
  
        <div class="section-header">1. معلومات التلميذ</div>
        <table style="border: none; margin-bottom: 10px;">
            <tr>
                <td style="border: none; text-align: right;"><span class="label">اللقب و الاسم:</span> <strong>${student.fullName}</strong></td>
                <td style="border: none; text-align: right;"><span class="label">تاريخ الميلاد:</span> ${student.birthDate}</td>
            </tr>
            <tr>
                <td style="border: none; text-align: right;"><span class="label">القسم:</span> ${student.classCode || '-'}</td>
                <td style="border: none; text-align: right;"><span class="label">المعدل العام:</span> <strong style="font-size: 14pt; color: ${Number(avg) < 10 ? '#dc2626' : '#16a34a'}">${avg}</strong></td>
            </tr>
        </table>
  
        <div class="section-header">2. نتائج المواد الأساسية</div>
        <table style="margin-bottom: 15px;">
            <thead class="thead-blue">
                <tr>
                    <th colspan="3">المواد العلمية (معدل التوجيه: ${analysis.stats.sciAvg.toFixed(2)})</th>
                    <th colspan="4" style="background-color: #fef3c7; border-color: #fcd34d; color: #92400e;">المواد الأدبية (معدل التوجيه: ${analysis.stats.litAvg.toFixed(2)})</th>
                </tr>
            </thead>
            <tr style="background-color: #f8fafc; font-weight: bold;">
                <td>رياضيات</td><td>فيزياء</td><td>علوم</td>
                <td>عربية</td><td>فرنسية</td><td>إنجليزية</td><td>اجتماعيات</td>
            </tr>
            <tr>
                <td>${getGrade('math')}</td>
                <td>${getGrade('physics')}</td>
                <td>${getGrade('nature')}</td>
                <td>${getGrade('arabic')}</td>
                <td>${getGrade('french')}</td>
                <td>${getGrade('english')}</td>
                <td>${getGrade('historyGeo')}</td>
            </tr>
        </table>

        <div class="section-header">3. تحليل النتائج</div>
        <table style="margin-bottom: 20px;">
            <tr>
                <th style="width: 50%; background-color: #dcfce7; color: #166534;">نقاط القوة (مواد > 14)</th>
                <th style="width: 50%; background-color: #fee2e2; color: #991b1b;">نقاط الضعف (مواد < 09)</th>
            </tr>
            <tr>
                <td style="vertical-align: top; text-align: right; padding: 10px; height: 60px;">
                    ${analysis.strengths.length > 0 ? analysis.strengths.join('، ') : 'لا توجد نقاط قوة بارزة.'}
                </td>
                <td style="vertical-align: top; text-align: right; padding: 10px; height: 60px;">
                    ${analysis.weaknesses.length > 0 ? analysis.weaknesses.join('، ') : 'لا توجد نقاط ضعف حرجة.'}
                </td>
            </tr>
        </table>

        <div class="section-header">4. التشخيص البيداغوجي</div>
        <div class="box-warning">
            <ul style="margin: 0; padding-right: 20px;">
                ${analysis.observations.map(adv => `<li>${adv}</li>`).join('')}
            </ul>
        </div>

        <div class="section-header">5. خطة العمل والإجراءات العلاجية المقترحة</div>
        
        <table style="border: 1px solid #cbd5e1; width: 100%; margin-bottom: 20px;">
            <tr>
                <td style="width: 50%; vertical-align: top; text-align: right; padding: 10px; border-left: 1px solid #cbd5e1; background-color: #f8fafc;">
                    <div style="font-weight: bold; color: #1e40af; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">أ. المعالجة البيداغوجية (مع التلميذ):</div>
                    <div style="line-height: 1.8;">
                        □ تكثيف التمارين المنزلية<br/>
                        □ المراجعة ضمن أفواج صغيرة<br/>
                        □ التركيز على منهجية الإجابة<br/>
                        □ دروس دعم في مادة: .............................<br/>
                        □ أخرى: ...........................................................
                    </div>
                </td>
                <td style="width: 50%; vertical-align: top; text-align: right; padding: 10px; background-color: #fcfcfc;">
                    <div style="font-weight: bold; color: #92400e; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">ب. المتابعة النفسية والتحفيز:</div>
                    <div style="line-height: 1.8;">
                        □ مقابلة فردية لتعزيز الثقة<br/>
                        □ تنظيم وقت المراجعة (جدول منزلي)<br/>
                        □ تغيير مكان الجلوس<br/>
                        □ عقد نجاعة / التزام<br/>
                        □ أخرى: ...........................................................
                    </div>
                </td>
            </tr>
            <tr>
                <td style="vertical-align: top; text-align: right; padding: 10px; border-left: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1;">
                    <div style="font-weight: bold; color: #166534; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">ج. دور الولي والأسرة:</div>
                    <div style="line-height: 1.8;">
                        □ المراقبة اليومية للكراس<br/>
                        □ توفير جو ملائم للمراجعة<br/>
                        □ زيارة دورية للمؤسسة<br/>
                        □ أخرى: ...........................................................
                    </div>
                </td>
                <td style="vertical-align: top; text-align: right; padding: 10px; border-top: 1px solid #cbd5e1;">
                    <div style="font-weight: bold; color: #374151; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">د. قرارات المجلس / الإدارة:</div>
                    <div style="line-height: 1.8;">
                        □ توجيه إنذار / توبيخ<br/>
                        □ إحالة على خلية الإصغاء<br/>
                        □ ملاحظات: ......................................................<br/>
                        .........................................................................
                    </div>
                </td>
            </tr>
        </table>

        <div style="border: 2px solid #94a3b8; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px;">التزام التلميذ / الولي:</div>
            <div style="border-bottom: 1px dotted #94a3b8; margin-bottom: 15px; height: 20px;"></div>
            <div style="border-bottom: 1px dotted #94a3b8; margin-bottom: 15px; height: 20px;"></div>
            <div style="border-bottom: 1px dotted #94a3b8; height: 20px;"></div>
        </div>
  
        <div style="margin-top: 50px;">
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="width: 33%; border: none; text-align: center;"><strong>إمضاء الولي:</strong></td>
                    <td style="width: 33%; border: none; text-align: center;"><strong>مستشار التوجيه:</strong></td>
                    <td style="width: 33%; border: none; text-align: center;"><strong>مدير المتوسطة:</strong></td>
                </tr>
            </table>
        </div>
    `;
  
    downloadDoc(wrapHtml(content, 'Remedial Plan', false), `معالجة_بيداغوجية_${semester}_${student.fullName.replace(/\s+/g, '_')}.doc`);
};

export const generateCustomListWord = (
    students: ConsolidatedStudent[], 
    columns: ColumnDefinition[], 
    selectedKeys: string[],
    title: string,
    meta: Partial<FileMetadata>
) => {
    const isLandscape = selectedKeys.length > 7;
    const orderedColumns = selectedKeys
        .map(key => columns.find(c => c.key === key))
        .filter(Boolean) as ColumnDefinition[];

    const finalHeaders = [{ label: 'الرقم', key: 'index_gen' }, ...orderedColumns];

    const rowsHtml = students.map((student, index) => {
        const cells = finalHeaders.map(col => {
            if (col.key === 'index_gen') return `<td style="width: 40px; font-weight: bold;">${index + 1}</td>`;
            const rawVal = getNestedValue(student, col.key);
            return `<td>${formatValueForExport(col.key, rawVal)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    const content = `
        ${getCommonHeader(meta)}
        <div class="title">${title}</div>
        
        <table>
            <thead class="thead-dark">
                <tr>
                    ${finalHeaders.map(h => `<th>${h.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
        
        <div style="margin-top: 20px; font-size: 11pt; font-weight: bold;">
            العدد الإجمالي: ${students.length} تلميذ
        </div>
    `;

    downloadDoc(wrapHtml(content, title, isLandscape), `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.doc`);
};

export const exportInterviewToWord = (student: ConsolidatedStudent, meta: Partial<FileMetadata>) => {
    const content = `
        ${getCommonHeader(meta)}
        <div class="title">محضر مقابلة فردية</div>
  
        <div class="section-header">1. معلومات التلميذ</div>
        <table style="border: none; background-color: #f8fafc; border-radius: 8px;">
            <tr>
                <td style="border: none; text-align: right; padding: 8px;"><span class="label">الاسم واللقب:</span> <strong>${student.fullName}</strong></td>
                <td style="border: none; text-align: right; padding: 8px;"><span class="label">تاريخ الميلاد:</span> ${student.birthDate}</td>
            </tr>
            <tr>
                <td style="border: none; text-align: right; padding: 8px;"><span class="label">القسم:</span> ${student.classCode || '-'}</td>
                <td style="border: none; text-align: right; padding: 8px;"><span class="label">الحالة:</span> ${student.isRepeater ? 'معيد' : 'جديد'}</td>
            </tr>
        </table>
  
        <div class="section-header">2. المسار الدراسي والتوجيه</div>
        <table>
            <thead class="thead-blue">
                <tr>
                    <th>الفصل</th>
                    <th>المعدل الفصلي</th>
                    <th>رغبة التلميذ</th>
                    <th>التوجيه المحسوب</th>
                    <th>حالة التوافق</th>
                </tr>
            </thead>
            <tbody>
                ${['S1', 'S2', 'S3'].map(sem => {
                    const s = student[sem.toLowerCase() as 's1' | 's2' | 's3'];
                    const orient = student[`orientation${sem}` as 'orientationS1' | 'orientationS2' | 'orientationS3'];
                    const guid = student[sem === 'S1' ? 'guidance' : `guidance${sem}` as 'guidance' | 'guidanceS2' | 'guidanceS3'];
                    
                    const guidanceLabel = guid?.preliminaryGuidance === 'science' ? 'علوم وتكنولوجيا' : guid?.preliminaryGuidance === 'arts' ? 'آداب' : '-';
                    const compat = orient.compatibility === 'comply' ? '<span class="text-success">متوافق</span>' : orient.compatibility === 'not-comply' ? '<span class="text-danger">غير متوافق</span>' : '-';

                    return `
                        <tr>
                            <td style="font-weight: bold;">${sem}</td>
                            <td>${s?.avg?.toFixed(2) || '-'}</td>
                            <td>${orient.choice1 || '-'}</td>
                            <td>${guidanceLabel}</td>
                            <td>${compat}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
  
        <div class="section-header">3. مجريات المقابلة</div>
        
        <p><span class="label">تاريخ المقابلة:</span> ${student.interview?.date || '........................'}</p>
        
        <p class="label">أسباب اختيار التلميذ (مبررات الرغبة):</p>
        <div class="box">${student.interview?.studentReason || ''}</div>
  
        <p class="label">رأي الولي:</p>
        <div class="box">${student.interview?.parentOpinion || ''}</div>
  
        <p class="label">ملاحظة واقتراح مستشار التوجيه:</p>
        <div class="box box-warning">${student.interview?.counselorObservation || ''}</div>
  
        <div style="margin-top: 50px;">
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="width: 50%; border: none; text-align: center;"><strong>إمضاء التلميذ (الولي):</strong></td>
                    <td style="width: 50%; border: none; text-align: center;"><strong>مستشار التوجيه:</strong></td>
                </tr>
            </table>
        </div>
    `;
  
    downloadDoc(wrapHtml(content, 'Interview', false), `محضر_مقابلة_${student.fullName.replace(/\s+/g, '_')}.doc`);
};

export const exportToWord = (students: ConsolidatedStudent[], type: 'S1' | 'S2' | 'S3', meta: Partial<FileMetadata>) => {
  const content = generateHTML(students, type, meta);
  downloadDoc(wrapHtml(content, 'Consolidated Report', true), `تقرير_شامل_${type}_${new Date().toISOString().slice(0,10)}.doc`);
};

export const exportNoticesToWord = (students: ConsolidatedStudent[], type: 'S1' | 'S2' | 'S3', meta: Partial<FileMetadata>) => {
  const content = generateNoticesHTML(students, type, meta);
  downloadDoc(wrapHtml(content, 'Notices', false), `اشعارات_التوجيه_${type}_${new Date().toISOString().slice(0,10)}.doc`);
};

const generateHTML = (students: ConsolidatedStudent[], type: 'S1' | 'S2' | 'S3', meta: Partial<FileMetadata>) => {
  const getHeaderTitle = () => {
    if (type === 'S1') return 'الجدول الاستخلاصي لعملية التوجيه التدريجي (الفصل الأول)';
    if (type === 'S2') return 'الجدول الاستخلاصي لعملية التوجيه المسبق (الفصل الثاني)';
    return 'الجدول الاستخلاصي لعملية التوجيه النهائي (آخر السنة)';
  };

  const headers = [
    { label: 'الرقم', width: '4%' },
    { label: 'الاسم واللقب', width: '15%' },
    { label: 'تاريخ الميلاد', width: '8%' },
    { label: 'الجنس', width: '5%' },
    { label: 'الإعادة', width: '5%' },
    { label: 'القسم', width: '5%' },
    type === 'S3' ? { label: 'معدل الشهادة', width: '5%' } : null,
    { label: 'المعدل', width: '6%' },
    { label: 'الرغبة الأولى', width: '10%' },
    { label: 'مجموعة التوجيه علوم', width: '6%' },
    { label: 'الترتيب', width: '4%' },
    { label: 'مجموعة التوجيه آداب', width: '6%' },
    { label: 'الترتيب', width: '4%' },
    { label: 'اقتراح مستشار التوجيه', width: '10%' },
    { label: 'اقتراح مجلس القسم', width: '10%' },
    type === 'S3' ? { label: 'قرار مجلس القبول', width: '10%' } : null
  ].filter(Boolean) as { label: string; width: string }[];

  const rows = students.map((s, idx) => {
    const orient = type === 'S1' ? s.orientationS1 : type === 'S2' ? s.orientationS2 : s.orientationS3;
    const guidance = type === 'S1' ? s.guidance : type === 'S2' ? s.guidanceS2 : s.guidanceS3;
    
    let avg = 0;
    if (type === 'S1') avg = s.s1?.avg || 0;
    else if (type === 'S2') avg = ((s.s1?.avg || 0) + (s.s2?.avg || 0)) / 2;
    else avg = ((s.s1?.avg || 0) + (s.s2?.avg || 0) + (s.s3?.avg || 0)) / 3;

    return `
      <tr>
        <td>${idx + 1}</td>
        <td style="text-align: right; font-weight: bold;">${s.fullName}</td>
        <td style="background-color: #eff6ff;">${s.birthDate}</td>
        <td>${s.gender === 'ذكر' ? 'ذ' : 'أ'}</td>
        <td>${s.isRepeater ? 'نعم' : 'لا'}</td>
        <td>${s.classCode || ''}</td>
        ${type === 'S3' ? `<td>${s.bemGrade || '-'}</td>` : ''}
        <td style="font-weight: bold; color: ${avg >= 10 ? '#166534' : '#b91c1c'};">${avg.toFixed(2)}</td>
        <td>${orient.choice1 || ''}</td>
        <td style="background-color: #eff6ff;">${guidance?.scienceScore?.toFixed(2) || ''}</td>
        <td style="background-color: #eff6ff;">${guidance?.scienceRank || ''}</td>
        <td style="background-color: #fffbeb;">${guidance?.artsScore?.toFixed(2) || ''}</td>
        <td style="background-color: #fffbeb;">${guidance?.artsRank || ''}</td>
        <td>${orient.counselorDecision || ''}</td>
        <td>${orient.councilDecision || ''}</td>
        ${type === 'S3' ? `<td style="font-weight: bold;">${orient.admissionsDecision || ''}</td>` : ''}
      </tr>
    `;
  }).join('');

  return `
      ${getCommonHeader(meta)}
      <div class="title">${getHeaderTitle()}</div>
      <table>
        <thead class="thead-dark">
          <tr>
            ${headers.map(h => `<th style="width: ${h.width}">${h.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
  `;
};

const generateNoticesHTML = (students: ConsolidatedStudent[], type: 'S1' | 'S2' | 'S3', meta: Partial<FileMetadata>) => {
  const getNoticeTitle = () => {
    if (type === 'S1') return 'بطاقة المتابعة والتوجيه (الفصل الأول)';
    if (type === 'S2') return 'بطاقة المتابعة والتوجيه (الفصل الثاني)';
    return 'بطاقة التوجيه النهائي (الفصل الثالث)';
  };

  const content = students.map(s => {
    const orient = type === 'S1' ? s.orientationS1 : type === 'S2' ? s.orientationS2 : s.orientationS3;
    const guidance = type === 'S1' ? s.guidance : type === 'S2' ? s.guidanceS2 : s.guidanceS3;

    let avg = 0;
    if (type === 'S1') avg = s.s1?.avg || 0;
    else if (type === 'S2') avg = ((s.s1?.avg || 0) + (s.s2?.avg || 0)) / 2;
    else avg = ((s.s1?.avg || 0) + (s.s2?.avg || 0) + (s.s3?.avg || 0)) / 3;
    
    let notesSection = '';
    if (s.notes && s.notes.length > 0) {
        notesSection = `
            <div class="section-header">رابعا: ملاحظات ومقابلات</div>
            <table>
                <thead class="thead-dark"><tr><th width="20%">التاريخ</th><th>الملاحظة</th></tr></thead>
                ${s.notes.map(n => `<tr><td>${new Date(n.date).toLocaleDateString('ar-DZ')}</td><td>${n.content}</td></tr>`).join('')}
            </table>
        `;
    }

    return `
      <div style="padding: 20px; margin-bottom: 20px;">
        ${getCommonHeader(meta)}

        <div style="text-align: center; font-weight: bold; font-size: 18pt; text-decoration: underline; margin: 15px 0;">${getNoticeTitle()}</div>

        <table style="margin-bottom: 15px; border: 2px solid #e2e8f0;">
            <tr>
                <td style="width: 25%; background-color: #f8fafc; font-weight: bold;">الاسم واللقب</td>
                <td style="font-weight: bold;">${s.fullName}</td>
                <td style="background-color: #f8fafc; font-weight: bold;">تاريخ الميلاد</td>
                <td>${s.birthDate || '-'} </td>
            </tr>
            <tr>
                <td style="background-color: #f8fafc; font-weight: bold;">الجنس</td>
                <td>${s.gender || '-'}</td>
                <td style="background-color: #f8fafc; font-weight: bold;">الإعادة</td>
                <td>${s.isRepeater ? 'نعم' : 'لا'}</td>
            </tr>
            <tr>
                <td style="background-color: #f8fafc; font-weight: bold;">القسم (الفوج)</td>
                <td>${s.classCode || '-'}</td>
                <td style="background-color: #f8fafc; font-weight: bold;">ملاحظة</td>
                <td>${(s.smartFlags.includes('talent_science') || s.smartFlags.includes('talent_arts')) && (
                        'من التلاميذ الأوائل'
                    )}</td>
            </tr>
        </table>

        <div class="section-header">أولا: النتائج الدراسية ومعدلات التوجيه</div>
        <table>
            <thead class="thead-blue">
                <tr>
                    <th>المعدل الفصلي/السنوي</th>
                    ${type === 'S3' ? '<th>معدل شهادة (BEM)</th>' : ''}
                    <th>معدل التوجيه (علوم)</th>
                    <th>معدل التوجيه (آداب)</th>
                </tr>
            </thead>
            <tr>
                <td style="font-weight: bold; font-size: 14pt; color: ${avg >= 10 ? '#166534' : '#b91c1c'};">${avg.toFixed(2)}</td>
                ${type === 'S3' ? `<td>${s.bemGrade || '-'}</td>` : ''}
                <td style="font-weight: bold; font-size: 14pt;">${guidance?.scienceScore?.toFixed(2) || '-'}</td>
                <td style="font-weight: bold; font-size: 14pt;">${guidance?.artsScore?.toFixed(2) || '-'}</td>
            </tr>
        </table>

        <div class="section-header">ثانيا: رغبات التلميذ(ة)</div>
        <table>
            <tr>
                <td width="25%" style="background-color: #eff6ff; font-weight: bold;">الرغبة الأولى</td>
                <td style="font-weight: bold;">${orient.choice1 || '-'}</td>
            </tr>
            <tr>
                <td style="background-color: #f8fafc;">الرغبة الثانية</td>
                <td>${orient.choice2 || '-'}</td>
            </tr>
        </table>

        <div class="section-header">ثالثا: قرارات التوجيه</div>
        <table>
            <tr>
                <td width="30%" style="background-color: #f0fdf4; font-weight: bold;">اقتراح المستشار</td>
                <td style="font-weight: bold;">${orient.counselorDecision || '-'}</td>
            </tr>
            <tr>
                <td style="background-color: #f0fdf4; font-weight: bold;">قرار مجلس القسم</td>
                <td style="font-weight: bold;">${orient.councilDecision || '-'}</td>
            </tr>
            ${type === 'S3' ? `
            <tr>
                <td style="background-color: #1e293b; color: white; font-weight: bold;">قرار مجلس القبول (النهائي)</td>
                <td style="font-weight: bold; font-size: 14pt;">${orient.admissionsDecision || '-'}</td>
            </tr>
            ` : ''}
        </table>
        
        ${notesSection}
         <div class="section-header">-</div
        <table>
            <tr>
                <td style=" text-align: center;font-weight: bold;">إمضاء الولي:</td>
                <td style="text-align: center; font-weight: bold;">مستشار(ة) التوجيه:</td>
                <td style="text-align: center; font-weight: bold;">المدير(ة)</td>
            </tr>
        </table>

        <br/><br/>
      </div>
    `;
  }).join('<br clear="all" style="page-break-before:always" />');

  return content;
};
