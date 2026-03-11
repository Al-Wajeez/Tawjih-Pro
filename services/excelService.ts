
import * as XLSX from 'xlsx';
import { FileMetadata, ProcessedFile, RawStudentGrade, SubjectKey } from '../types';

// Column mappings based on prompt requirements
const ARABIC_TO_KEY: Record<string, SubjectKey> = {
  // S1
  'اللغة العربية': 'arabic',
  'اللغة الفرنسية': 'french',
  'اللغة الإنجليزية': 'english',
  'التاريخ والجغرافيا': 'historyGeo',
  'الرياضيات': 'math',
  'ع الطبيعة و الحياة': 'nature',
  'ع الفيزيائية والتكنولوجيا': 'physics',
  'معدل الفصل 1': 'avg',
  
  // S2
  'اللغة العربية ف 2': 'arabic',
  'اللغة الفرنسية ف 2': 'french',
  'اللغة الإنجليزية ف 2': 'english',
  'التاريخ والجغرافيا ف 2': 'historyGeo',
  'الرياضيات ف 2': 'math',
  'ع الطبيعة و الحياة ف 2': 'nature',
  'ع الفيزيائية والتكنولوجيا ف 2': 'physics',
  'معدل الفصل 2': 'avg',

  // S3
  'اللغة العربية ف 3': 'arabic',
  'اللغة الفرنسية ف 3': 'french',
  'اللغة الإنجليزية ف 3': 'english',
  'التاريخ والجغرافيا ف 3': 'historyGeo',
  'الرياضيات ف 3': 'math',
  'ع الطبيعة و الحياة ف 3': 'nature',
  'ع الفيزيائية والتكنولوجيا ف 3': 'physics',
  'معدل الفصل 3': 'avg',
};

// Map base subject names for Past Academic records
const PAST_SUBJECTS_BASE: Record<string, SubjectKey> = {
  'اللغة العربية': 'arabic',
  'اللغة الفرنسية': 'french',
  'اللغة الإنجليزية': 'english',
  'التاريخ والجغرافيا': 'historyGeo',
  'الرياضيات': 'math',
  'ع الطبيعة و الحياة': 'nature',
  'ع الفيزيائية والتكنولوجيا': 'physics',
};

const normalizeDate = (value: any): string => {
  if (!value) return '';
  
  // Handle Excel Serial Date
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  
  // Handle String formats
  const strVal = String(value).trim();
  
  // Check for DD/MM/YYYY
  if (strVal.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = strVal.split('/');
    // parts[0] = day, parts[1] = month, parts[2] = year
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  
  // Check for YYYY-MM-DD (already correct)
  if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return strVal;
  }

  // Fallback: return as is
  return strVal;
};

// Helper to safely parse grades from excel (handles strings with commas, etc)
const parseGrade = (val: any): number | null => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    // Replace comma with dot for locales like fr-FR/ar-DZ
    const normalized = val.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const readExcelFile = async (file: File, type: ProcessedFile['type']): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const metadata: FileMetadata = {
            directorate: worksheet['A3']?.v || '',
            school: worksheet['A4']?.v || '',
            semesterInfo: worksheet['A5']?.v || '',
            year: '',
            level: '',
            classCode: ''
        };
        
        if (metadata.semesterInfo) {
            const metaParts = metadata.semesterInfo.split(' ');
            const yearIndex = metaParts.findIndex(p => p.includes('-'));
            if (yearIndex > -1) metadata.year = metaParts[yearIndex];
            metadata.classCode = metaParts[metaParts.length - 1]; 
        }
        metadata.level = "الرابعة متوسط";

        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        
        if (type === 'BEM') {
            const students: RawStudentGrade[] = jsonData.map((row) => {
                if (!row || row.length < 5) return null;
                const fullName = String(row[0] || '').trim();
                const birthDate = normalizeDate(row[1]);
                const annualGrade = parseGrade(row[2]);
                const bemGradeVal = parseGrade(row[3]);
                const transitionGrade = parseGrade(row[4]);

                // Validation: not empty and not negative
                if (!fullName || !birthDate) return null;
                if (annualGrade === null || annualGrade < 0) return null;
                if (bemGradeVal === null || bemGradeVal < 0) return null;
                if (transitionGrade === null || transitionGrade < 0) return null;

                return {
                    fullName,
                    birthDate,
                    gender: '',
                    isRepeater: false,
                    annualGrade,
                    bemGrade: bemGradeVal,
                    transitionGrade,
                    grades: {} as any,
                    orientation: {}
                };
            }).filter((s): s is RawStudentGrade => s !== null);

            resolve({
                type,
                metadata: {
                    directorate: '',
                    school: '',
                    semesterInfo: 'BEM Results',
                    year: '',
                    level: 'الرابعة متوسط',
                    classCode: 'BEM'
                },
                students,
                fileName: file.name
            });
            return;
        }

        let headerRowIndex = -1;
        
        for(let i = 0; i < 20; i++) {
            if(jsonData[i] && jsonData[i].includes('اللقب و الاسم')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) throw new Error("Could not find header row ('اللقب و الاسم')");

        const headers = jsonData[headerRowIndex] as string[];
        const rows = jsonData.slice(headerRowIndex + 1);

        const students: RawStudentGrade[] = rows.map((row) => {
            const student: RawStudentGrade = { 
              fullName: '', 
              birthDate: '', 
              gender: '', 
              isRepeater: false,
              classCode: metadata.classCode,
              grades: {} as any,
              orientation: {} 
            };
            
            headers.forEach((header, index) => {
                const value = row[index];
                const strValue = String(value || '').trim();
                
                if (header === 'اللقب و الاسم') student.fullName = strValue;
                else if (header === 'تاريخ الميلاد') {
                     student.birthDate = normalizeDate(value);
                }
                else if (header === 'الجنس') student.gender = strValue;
                else if (header === 'الإعادة') student.isRepeater = value === 'نعم' || value === true;
                
                // --- Orientation Data Parsing ---
                // Looks for headers like "الرغبة 1", "الرغبة الاولى", etc.
                if (header.includes('الرغبة') && header.includes('1')) student.orientation!.choice1 = strValue;
                else if (header.includes('الرغبة') && header.includes('2')) student.orientation!.choice2 = strValue;
                else if (header.includes('الرغبة') && header.includes('3')) student.orientation!.choice3 = strValue;
                else if (header.includes('الرغبة') && header.includes('4')) student.orientation!.choice4 = strValue;
                
                else if (header.includes('اقتراح') && header.includes('المستشار')) student.orientation!.counselorDecision = strValue;
                else if (header.includes('قرار') && header.includes('المجلس') && !header.includes('القبول')) student.orientation!.councilDecision = strValue;
                else if (header.includes('قرار') && header.includes('القبول')) student.orientation!.admissionsDecision = strValue;
                
                // --- Grade Parsing ---
                if (type === 'PAST') {
                    // Logic handled in the next block
                } else {
                    const key = ARABIC_TO_KEY[header];
                    if (key) {
                        const grade = parseGrade(value);
                        student.grades[key] = grade !== null ? grade : 0;
                    }
                }
            });

            if (type === 'PAST') {
                // Calculate average of subjects
                Object.keys(PAST_SUBJECTS_BASE).forEach(baseName => {
                    const key = PAST_SUBJECTS_BASE[baseName];
                    let sum = 0;
                    let count = 0;
                    
                    headers.forEach((h, i) => {
                        if (h.includes(baseName)) {
                            const isSemesterColumn = 
                                (h.includes('ف1') || h.includes('ف 1')) ||
                                (h.includes('ف2') || h.includes('ف 2')) ||
                                (h.includes('ف3') || h.includes('ف 3'));
                            
                            if (isSemesterColumn) {
                                const v = parseGrade(row[i]);
                                if (v !== null) {
                                    sum += v;
                                    count++;
                                }
                            }
                        }
                    });
                    // Sum (S1+S2+S3) / 3 (Assuming 3 semesters usually, or count based)
                    // If count is 0, grade is 0
                    student.grades[key] = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
                });

                // Calculate or extract General Average
                // Try to find an explicit "Moyenne" or "معدل" column that isn't a specific subject
                let avgSum = 0;
                let avgCount = 0;
                let foundExplicitAvg = false;

                headers.forEach((h, i) => {
                    // Look for general average columns like "معدل سنوي" or just "المعدل" if singular
                    if ((h.includes('معدل') || h.toLowerCase().includes('moyenne')) && !foundExplicitAvg) {
                        // Exclude subject specific averages if header names are specific like "معدل الرياضيات"
                        // But typically PAST files have "Moy S1", "Moy S2"...
                        
                        const isSemesterAvg = 
                            (h.includes('ف1') || h.includes('ف 1') || h.includes('S1')) ||
                            (h.includes('ف2') || h.includes('ف 2') || h.includes('S2')) ||
                            (h.includes('الفصل 1') || h.includes('معدل')) ||
                            (h.includes('الفصل 2') || h.includes('معدل')) ||
                            (h.includes('الفصل 3') || h.includes('معدل')) ||
                            (h.includes('ف3') || h.includes('ف 3') || h.includes('S3'));
                        
                        // If it's a semester average column
                        if (isSemesterAvg) {
                             const v = parseGrade(row[i]);
                             if (v !== null) {
                                 avgSum += v;
                                 avgCount++;
                             }
                        } else if (h.includes('سنوي') || h.includes('Annuel')) {
                             // Found explicit annual average
                             const v = parseGrade(row[i]);
                             if (v !== null) {
                                 student.grades['avg'] = v;
                                 foundExplicitAvg = true;
                             }
                        }
                    }
                });

                // If explicit annual average wasn't found, calculate mean of semester averages
                if (!foundExplicitAvg && avgCount > 0) {
                    student.grades['avg'] = parseFloat((avgSum / avgCount).toFixed(2));
                }
            }

            return student;
        }).filter(s => s.fullName && s.birthDate);

        resolve({
            type,
            metadata,
            students,
            fileName: file.name
        });

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};
