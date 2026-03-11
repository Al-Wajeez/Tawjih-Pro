
import { ConsolidatedStudent, ProcessedFile, RawStudentGrade, SubjectKey, OrientationData, GuidanceSettings, StreamWeights, SmartFlagType, Note, InterviewData } from "../types";
import { calculateSimilarity, normalizeArabic } from "./utils";

/**
 * Generates a unique ID for student matching
 * We use a normalized version for the ID to catch simple spacing/case issues automatically
 */
const generateId = (fullName: string, birthDate: string) => {
  // Normalize ID generation: standardizes arabic letters for ID purposes
  const cleanName = normalizeArabic(fullName).replace(/\s+/g, '_');
  const cleanDate = birthDate.trim();
  return `${cleanName}_${cleanDate}`;
};

const createEmptyOrientation = (): OrientationData => ({
  choice1: '',
  choice2: '',
  choice3: '',
  choice4: '',
  counselorDecision: '',
  councilDecision: '',
  admissionsDecision: '',
  preliminaryGuidance: null,
  compatibility: null
});

export const DEFAULT_SETTINGS: GuidanceSettings = {
  profileName: 'المعايير الافتراضية',
  scienceWeights: {
    math: 4,
    physics: 4,
    nature: 4,
    arabic: 2,
    french: 0,
    english: 0,
    historyGeo: 0
  },
  artsWeights: {
    math: 0,
    physics: 0,
    nature: 0,
    arabic: 5,
    french: 4,
    english: 3,
    historyGeo: 2
  },
  passingThreshold: 10,
  formulaConfig: {
    s1PastWeight: 1,      // (Past * 1 + S1 * 2) / 3
    s1CurrentWeight: 2,
    cumulativeWeight: 1,  // (Avg(S1,S2) * 1 + S2 * 2) / 3
    semesterWeight: 2
  },
  appreciations: [
    { id: '1', min: 18, label: 'ممتاز', color: 'text-purple-700 bg-purple-100' },
    { id: '2', min: 16, label: 'جيد جداً', color: 'text-emerald-700 bg-emerald-100' },
    { id: '3', min: 14, label: 'جيد', color: 'text-blue-700 bg-blue-100' },
    { id: '4', min: 12, label: 'قريب من الجيد', color: 'text-cyan-700 bg-cyan-100' },
    { id: '5', min: 10, label: 'متوسط', color: 'text-amber-700 bg-amber-100' },
    { id: '6', min: 8, label: 'ضعيف', color: 'text-orange-700 bg-orange-100' },
    { id: '7', min: 0, label: 'ضعيف جداً', color: 'text-red-700 bg-red-100' }
  ],
  smartFlags: {
    riskThreshold: 9,
    talentThreshold: 18
  }
};

// Conflict Type Definition
export interface DataConflict {
    id: string;
    incoming: {
        fullName: string;
        birthDate: string;
        sourceFile: string;
        raw: RawStudentGrade;
    };
    existing: {
        id: string;
        fullName: string;
        birthDate: string;
        student: ConsolidatedStudent;
    };
    similarity: number;
}

/**
 * Detects potential conflicts (duplicates) between new files and existing data
 */
export const detectConflicts = (
    files: ProcessedFile[], 
    existingData: ConsolidatedStudent[]
): DataConflict[] => {
    const conflicts: DataConflict[] = [];
    
    // Create a temporary master list that grows as we process files
    // This allows detecting conflicts between two NEW files (e.g. S1 and S2)
    const tempMaster = [...existingData];
    
    // Map to check for exact ID matches quickly
    const idMap = new Set(tempMaster.map(s => s.id));
    
    let conflictCounter = 0; // Ensure unique IDs for conflicts

    files.forEach(file => {
        file.students.forEach(raw => {
            const rawId = generateId(raw.fullName, raw.birthDate);
            
            // 1. If exact ID exists, it's an automatic merge, not a conflict.
            if (idMap.has(rawId)) {
                return; 
            }

            // 2. Fuzzy Search in Master List
            // We look for high similarity in Name AND same/similar BirthDate
            // Or very high similarity in Name with slight BirthDate typo?
            // For safety, let's stick to Name Similarity > 85%
            
            let potentialMatch: ConsolidatedStudent | null = null;
            let bestSimilarity = 0;

            for (const existing of tempMaster) {
                // Similarity Check
                const sim = calculateSimilarity(raw.fullName, existing.fullName);
                
                // Logic:
                // If Similarity > 0.9 (Very high), likely same person regardless of minor DOB diff?
                // If Similarity > 0.8 AND DOB match exactly?
                
                const dobMatch = raw.birthDate === existing.birthDate;
                
                if (dobMatch && sim > 0.8) {
                    if (sim > bestSimilarity) {
                        bestSimilarity = sim;
                        potentialMatch = existing;
                    }
                } else if (!dobMatch && sim > 0.95) {
                    // Very high name match but different DOB (typo in DOB?)
                    if (sim > bestSimilarity) {
                        bestSimilarity = sim;
                        potentialMatch = existing;
                    }
                }
            }

            if (potentialMatch) {
                conflicts.push({
                    id: `${rawId}_vs_${potentialMatch.id}_${conflictCounter++}`,
                    incoming: {
                        fullName: raw.fullName,
                        birthDate: raw.birthDate,
                        sourceFile: file.type,
                        raw: raw
                    },
                    existing: {
                        id: potentialMatch.id,
                        fullName: potentialMatch.fullName,
                        birthDate: potentialMatch.birthDate,
                        student: potentialMatch
                    },
                    similarity: bestSimilarity
                });
            } else {
                // No match found, assume this is a new unique student
                // Add to tempMaster so subsequent files can match against it
                const newStudent: ConsolidatedStudent = {
                    id: rawId,
                    fullName: raw.fullName,
                    birthDate: raw.birthDate,
                    gender: raw.gender,
                    isRepeater: raw.isRepeater,
                    classCode: raw.classCode,
                    smartFlags: [],
                    guidance: { artsRank: 0, artsScore: 0, scienceRank: 0, scienceScore: 0 },
                    orientationS1: createEmptyOrientation(),
                    orientationS2: createEmptyOrientation(),
                    orientationS3: createEmptyOrientation(),
                };
                tempMaster.push(newStudent);
                idMap.add(rawId);
            }
        });
    });

    return conflicts;
};

/**
 * Consolidates multiple file sources into a single list of students
 * Accepts an optional resolution map to merge IDs
 */
export const consolidateData = (
    files: ProcessedFile[], 
    existingData: ConsolidatedStudent[] = [],
    resolutionMap: Record<string, string> = {} // Map<IncomingID, TargetID>
): ConsolidatedStudent[] => {
  const studentMap = new Map<string, ConsolidatedStudent>();

  // Preserve notes AND interviews from existing data
  const notesMap = new Map<string, Note[]>();
  const interviewMap = new Map<string, InterviewData>();
  
  existingData.forEach(s => {
    studentMap.set(s.id, s); // Initialize map with existing data
    if (s.notes && s.notes.length > 0) {
        notesMap.set(s.id, s.notes);
    }
    if (s.interview) {
        interviewMap.set(s.id, s.interview);
    }
  });

  files.forEach(file => {
    file.students.forEach(raw => {
      let id = generateId(raw.fullName, raw.birthDate);
      
      // Apply Resolution if exists
      // The resolutionMap keys are generated using the same generateId logic for the raw student
      if (resolutionMap[id]) {
          id = resolutionMap[id]; // Redirect to the target ID
      }
      
      let existing = studentMap.get(id);
      if (!existing) {
        existing = {
          id,
          fullName: raw.fullName,
          birthDate: raw.birthDate,
          gender: raw.gender,
          isRepeater: raw.isRepeater,
          classCode: raw.classCode,
          smartFlags: [],
          notes: notesMap.get(id) || [], // Inject preserved notes
          interview: interviewMap.get(id), // Inject preserved interview
          guidance: { artsRank: 0, artsScore: 0, scienceRank: 0, scienceScore: 0, preliminaryGuidance: null },
          orientationS1: createEmptyOrientation(),
          orientationS2: createEmptyOrientation(),
          orientationS3: createEmptyOrientation(),
        };
      } else {
        // If class code was missing and this file has it
        if (!existing.classCode && raw.classCode) {
            existing.classCode = raw.classCode;
        }
        // If name in existing was less complete or different, maybe update?
        // We usually keep the "Master" name, but could update if incoming is longer?
        // For now, keep existing.
      }

      // Merge data based on file type
      if (file.type === 'S1') {
        existing.s1 = raw.grades;
        if (raw.orientation) mergeOrientation(existing.orientationS1, raw.orientation);
      }
      if (file.type === 'S2') {
        existing.s2 = raw.grades;
        if (raw.orientation) mergeOrientation(existing.orientationS2, raw.orientation);
      }
      if (file.type === 'S3') {
        existing.s3 = raw.grades;
        if (raw.orientation) mergeOrientation(existing.orientationS3, raw.orientation);
      }
      if (file.type === 'PAST') {
        existing.past = raw.grades;
      }
      if (file.type === 'BEM') {
        existing.bemGrade = raw.bemGrade;
        existing.annualGrade = raw.annualGrade;
        existing.transitionGrade = raw.transitionGrade;
      }


      studentMap.set(id, existing);
    });
  });

  return Array.from(studentMap.values());
};

const mergeOrientation = (target: OrientationData, source: RawStudentGrade['orientation']) => {
  if (!source) return;
  if (source.choice1) target.choice1 = source.choice1;
  if (source.choice2) target.choice2 = source.choice2;
  if (source.choice3) target.choice3 = source.choice3;
  if (source.choice4) target.choice4 = source.choice4;
  if (source.counselorDecision) target.counselorDecision = source.counselorDecision;
  if (source.councilDecision) target.councilDecision = source.councilDecision;
  if (source.admissionsDecision) target.admissionsDecision = source.admissionsDecision;
};

/**
 * Normalizes choice strings to 'science' or 'arts' for comparison
 */
const normalizeChoice = (choice: string): 'science' | 'arts' | 'other' => {
  if (!choice) return 'other';
  const c = choice.trim().toLowerCase();
  if (c.includes('علوم') || c.includes('science') || c.includes('تكنولوجيا')) return 'science';
  if (c.includes('آداب') || c.includes('liter') || c.includes('lettre')) return 'arts';
  return 'other';
};

/**
 * Calculates progressive placement scores and determines compatibility for a single student
 */
export const calculateStudentPlacement = (student: ConsolidatedStudent, settings: GuidanceSettings = DEFAULT_SETTINGS): ConsolidatedStudent => {
  // Calculate Divisors based on settings (Sum of weights)
  const scienceDivisor = Object.values(settings.scienceWeights).reduce((sum, w) => sum + w, 0) || 1;
  const artsDivisor = Object.values(settings.artsWeights).reduce((sum, w) => sum + w, 0) || 1;

  // Formula Weights
  const { s1PastWeight, s1CurrentWeight, cumulativeWeight, semesterWeight } = settings.formulaConfig;
  const s1TotalWeight = s1PastWeight + s1CurrentWeight || 1;
  const sxTotalWeight = cumulativeWeight + semesterWeight || 1; // For S2/S3

  // Smart Flags Thresholds (with fallbacks)
  const riskThreshold = settings.smartFlags?.riskThreshold ?? 9;
  const talentThreshold = settings.smartFlags?.talentThreshold ?? 18;

  // Helper to calculate score for a specific stream
  const calculateScore = (
    weights: StreamWeights, 
    divisor: number, 
    componentCalc: (key: SubjectKey) => number
  ) => {
    let total = 0;
    (Object.keys(weights) as SubjectKey[]).forEach(key => {
        const weight = (weights as any)[key] || 0;
        if (weight > 0) {
            total += componentCalc(key) * weight;
        }
    });
    return total / divisor;
  };

  // Helper to safely get grade
  const getGrade = (source: Record<SubjectKey, number> | undefined, key: SubjectKey): number => {
    return source?.[key] || 0;
  };

  // Sources
  const prev = student.past;
  const s1 = student.s1;
  const s2 = student.s2;
  const s3 = student.s3;

  // --- S1: Progressive Guidance Calculation ---
  // Formula: (Past * w1 + S1 * w2) / (w1+w2)
  const calcS1Component = (key: SubjectKey) => {
      return ((getGrade(prev, key) * s1PastWeight) + (getGrade(s1, key) * s1CurrentWeight)) / s1TotalWeight;
  };

  const scienceScoreS1 = calculateScore(settings.scienceWeights, scienceDivisor, calcS1Component);
  const artsScoreS1 = calculateScore(settings.artsWeights, artsDivisor, calcS1Component);
  
  const preliminaryGuidanceS1: 'science' | 'arts' = scienceScoreS1 >= artsScoreS1 ? 'science' : 'arts';

  // S1 Compatibility
  const choice1S1 = normalizeChoice(student.orientationS1.choice1);
  let compatibilityS1: 'comply' | 'not-comply' | null = null;
  if (student.orientationS1.choice1) {
    if (choice1S1 === 'other') compatibilityS1 = 'not-comply'; 
    else compatibilityS1 = choice1S1 === preliminaryGuidanceS1 ? 'comply' : 'not-comply';
  }


  // --- S2: Progressive Guidance Calculation ---
  // Formula: (Avg(s1, s2) * w1 + s2 * w2) / (w1+w2)
  const calcS2Component = (key: SubjectKey) => {
     const g1 = getGrade(s1, key);
     const g2 = getGrade(s2, key);
     const avg = (g1 + g2) / 2;
     return ((avg * cumulativeWeight) + (g2 * semesterWeight)) / sxTotalWeight;
  };

  const scienceScoreS2 = calculateScore(settings.scienceWeights, scienceDivisor, calcS2Component);
  const artsScoreS2 = calculateScore(settings.artsWeights, artsDivisor, calcS2Component);

  const preliminaryGuidanceS2: 'science' | 'arts' = scienceScoreS2 >= artsScoreS2 ? 'science' : 'arts';

  // S2 Compatibility
  const choice1S2 = normalizeChoice(student.orientationS2.choice1);
  let compatibilityS2: 'comply' | 'not-comply' | null = null;
  if (student.orientationS2.choice1) {
    if (choice1S2 === 'other') compatibilityS2 = 'not-comply';
    else compatibilityS2 = choice1S2 === preliminaryGuidanceS2 ? 'comply' : 'not-comply';
  }

  // S2 Stability
  let stabilityS2: 'stable' | 'unstable' | null = null;
  if (student.orientationS1.choice1 && student.orientationS2.choice1) {
      stabilityS2 = student.orientationS1.choice1.trim() === student.orientationS2.choice1.trim() 
         ? 'stable' 
         : 'unstable';
  }


  // --- S3: Final Guidance Calculation ---
  // Formula: (Avg(s1, s2, s3) * w1 + s3 * w2) / (w1+w2)
  const calcS3Component = (key: SubjectKey) => {
     const g1 = getGrade(s1, key);
     const g2 = getGrade(s2, key);
     const g3 = getGrade(s3, key);
     const avg = (g1 + g2 + g3) / 3;
     return ((avg * cumulativeWeight) + (g3 * semesterWeight)) / sxTotalWeight;
  };

  const scienceScoreS3 = calculateScore(settings.scienceWeights, scienceDivisor, calcS3Component);
  const artsScoreS3 = calculateScore(settings.artsWeights, artsDivisor, calcS3Component);

  const preliminaryGuidanceS3: 'science' | 'arts' = scienceScoreS3 >= artsScoreS3 ? 'science' : 'arts';

  // S3 Compatibility
  const choice1S3 = normalizeChoice(student.orientationS3.choice1);
  let compatibilityS3: 'comply' | 'not-comply' | null = null;
  if (student.orientationS3.choice1) {
    if (choice1S3 === 'other') compatibilityS3 = 'not-comply';
    else compatibilityS3 = choice1S3 === preliminaryGuidanceS3 ? 'comply' : 'not-comply';
  }

  // S3 Stability
  let stabilityS3: 'stable' | 'unstable' | null = null;
  if (student.orientationS2.choice1 && student.orientationS3.choice1) {
      stabilityS3 = student.orientationS2.choice1.trim() === student.orientationS3.choice1.trim() 
         ? 'stable' 
         : 'unstable';
  }

  // --- Smart Flag Calculation ---
  const flags: SmartFlagType[] = [];
  
  // Determine the latest/most relevant data source for flags
  // We prioritize S3, then S2, then S1
  const latestData = s3 ? s3 : s2 ? s2 : s1;
  const latestCompatibility = compatibilityS3 || compatibilityS2 || compatibilityS1;

  if (latestData) {
      // 1. Risk Flag (GPA < Threshold)
      // Check latest available average
      const avg = latestData.avg;
      if (avg !== undefined && avg < riskThreshold) {
          flags.push('risk');
      }

      // 2. Talent Flags (> Threshold in core subjects)
      if (latestData.math >= talentThreshold || latestData.physics >= talentThreshold || latestData.nature >= talentThreshold) {
          flags.push('talent_science');
      }
      if (latestData.arabic >= talentThreshold || latestData.french >= talentThreshold || latestData.english >= talentThreshold) {
          flags.push('talent_arts');
      }
  }

  // 3. Mismatch Flag
  // Definition: User chose Science/Arts but calculation disagrees (not-comply)
  if (latestCompatibility === 'not-comply') {
      flags.push('mismatch');
  }

  return {
    ...student,
    smartFlags: flags,
    guidance: {
      scienceScore: parseFloat(scienceScoreS1.toFixed(2)),
      scienceRank: student.guidance.scienceRank, // Preserve existing rank or set to 0
      artsScore: parseFloat(artsScoreS1.toFixed(2)),
      artsRank: student.guidance.artsRank,
      preliminaryGuidance: preliminaryGuidanceS1,
    },
    guidanceS2: {
      scienceScore: parseFloat(scienceScoreS2.toFixed(2)),
      scienceRank: student.guidanceS2?.scienceRank || 0,
      artsScore: parseFloat(artsScoreS2.toFixed(2)),
      artsRank: student.guidanceS2?.artsRank || 0,
      preliminaryGuidance: preliminaryGuidanceS2,
      compatibility: compatibilityS2,
      stability: stabilityS2
    },
    guidanceS3: {
      scienceScore: parseFloat(scienceScoreS3.toFixed(2)),
      scienceRank: student.guidanceS3?.scienceRank || 0,
      artsScore: parseFloat(artsScoreS3.toFixed(2)),
      artsRank: student.guidanceS3?.artsRank || 0,
      preliminaryGuidance: preliminaryGuidanceS3,
      compatibility: compatibilityS3,
      stability: stabilityS3
    },
    orientationS1: {
      ...student.orientationS1,
      preliminaryGuidance: preliminaryGuidanceS1,
      compatibility: compatibilityS1
    },
    orientationS2: {
       ...student.orientationS2,
       preliminaryGuidance: preliminaryGuidanceS2,
       compatibility: compatibilityS2
    },
    orientationS3: {
       ...student.orientationS3,
       preliminaryGuidance: preliminaryGuidanceS3,
       compatibility: compatibilityS3
    }
  };
};

/**
 * Calculates progressive placement scores and determines compatibility
 */
export const calculateProgressivePlacement = (students: ConsolidatedStudent[], settings: GuidanceSettings = DEFAULT_SETTINGS): ConsolidatedStudent[] => {
  return students.map(student => calculateStudentPlacement(student, settings));
};

/**
 * Ranks students within the calculation context
 */
export const rankStudents = (students: ConsolidatedStudent[]): ConsolidatedStudent[] => {
  // --- Rank S1 ---
  const sortedByScienceS1 = [...students].sort((a, b) => b.guidance.scienceScore - a.guidance.scienceScore);
  const scienceMapS1 = new Map<string, number>();
  sortedByScienceS1.forEach((s, idx) => scienceMapS1.set(s.id, idx + 1));

  const sortedByArtsS1 = [...students].sort((a, b) => b.guidance.artsScore - a.guidance.artsScore);
  const artsMapS1 = new Map<string, number>();
  sortedByArtsS1.forEach((s, idx) => artsMapS1.set(s.id, idx + 1));

  // --- Rank S2 ---
  const sortedByScienceS2 = [...students].sort((a, b) => (b.guidanceS2?.scienceScore || 0) - (a.guidanceS2?.scienceScore || 0));
  const scienceMapS2 = new Map<string, number>();
  sortedByScienceS2.forEach((s, idx) => scienceMapS2.set(s.id, idx + 1));

  const sortedByArtsS2 = [...students].sort((a, b) => (b.guidanceS2?.artsScore || 0) - (a.guidanceS2?.artsScore || 0));
  const artsMapS2 = new Map<string, number>();
  sortedByArtsS2.forEach((s, idx) => artsMapS2.set(s.id, idx + 1));

  // --- Rank S3 ---
  const sortedByScienceS3 = [...students].sort((a, b) => (b.guidanceS3?.scienceScore || 0) - (a.guidanceS3?.scienceScore || 0));
  const scienceMapS3 = new Map<string, number>();
  sortedByScienceS3.forEach((s, idx) => scienceMapS3.set(s.id, idx + 1));

  const sortedByArtsS3 = [...students].sort((a, b) => (b.guidanceS3?.artsScore || 0) - (a.guidanceS3?.artsScore || 0));
  const artsMapS3 = new Map<string, number>();
  sortedByArtsS3.forEach((s, idx) => artsMapS3.set(s.id, idx + 1));

  return students.map(s => ({
    ...s,
    guidance: {
      ...s.guidance,
      scienceRank: scienceMapS1.get(s.id) || 0,
      artsRank: artsMapS1.get(s.id) || 0
    },
    guidanceS2: s.guidanceS2 ? {
      ...s.guidanceS2,
      scienceRank: scienceMapS2.get(s.id) || 0,
      artsRank: artsMapS2.get(s.id) || 0
    } : undefined,
    guidanceS3: s.guidanceS3 ? {
      ...s.guidanceS3,
      scienceRank: scienceMapS3.get(s.id) || 0,
      artsRank: artsMapS3.get(s.id) || 0
    } : undefined
  }));
};
