
// Subject keys used internally
export type SubjectKey = 
  | 'arabic' 
  | 'french' 
  | 'english' 
  | 'historyGeo' 
  | 'math' 
  | 'nature' // Natural Sciences
  | 'physics'
  | 'avg'; // Semester Average

export interface RawStudentGrade {
  fullName: string;
  birthDate: string; // ISO string or consistent format
  gender: string;
  isRepeater: boolean;
  classCode?: string; // e.g. "4M1"
  bemGrade?: number;
  annualGrade?: number;
  transitionGrade?: number;
  grades: Record<SubjectKey, number>;
  // Orientation raw data from Excel
  orientation?: {
    choice1?: string;
    choice2?: string;
    choice3?: string;
    choice4?: string;
    counselorDecision?: string;
    councilDecision?: string;
    admissionsDecision?: string;
  };
}

export interface FileMetadata {
  directorate: string;
  school: string;
  semesterInfo: string; // The raw string from A5
  year: string;
  level: string;
  classCode: string;
}

export interface ProcessedFile {
  id?: number; // ID for database persistence
  type: 'S1' | 'S2' | 'S3' | 'PAST' | 'BEM';
  metadata: FileMetadata;
  students: RawStudentGrade[];
  fileName: string;
}

export interface OrientationData {
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  counselorDecision: string;
  councilDecision: string;
  admissionsDecision?: string; // Specific to S3 usually
  preliminaryGuidance: 'science' | 'arts' | null; // Calculated based on scores
  compatibility: 'comply' | 'not-comply' | null; // Calculated
}

export type SmartFlagType = 'risk' | 'talent_science' | 'talent_arts' | 'mismatch';

export interface Note {
  id: string;
  date: string;
  content: string;
}

export interface InterviewData {
  status: 'pending' | 'scheduled' | 'completed';
  date: string;
  time?: string; // New field for appointment time
  studentReason: string; // Why they chose X despite grades Y
  parentOpinion: string;
  counselorObservation: string;
  updatedChoice?: string; // If they changed their mind
}

export interface ConsolidatedStudent {
  id: string; // generated from fullName + birthDate
  fullName: string;
  birthDate: string;
  gender: string;
  isRepeater: boolean;
  classCode?: string;
  bemGrade?: number; // BEM Certificate Grade
  annualGrade?: number;
  transitionGrade?: number;
  
  // School Info
  directorate?: string;
  school?: string;
  
  // Data sources
  s1?: Record<SubjectKey, number>;
  s2?: Record<SubjectKey, number>;
  s3?: Record<SubjectKey, number>;
  past?: Record<SubjectKey, number>; // Averaged past year grades
  
  // Analysis Tags
  smartFlags: SmartFlagType[];
  notes?: Note[];
  interview?: InterviewData;

  // Computed Guidance Metrics (S1)
  guidance: {
    scienceScore: number;
    scienceRank: number;
    artsScore: number;
    artsRank: number;
    preliminaryGuidance?: 'science' | 'arts' | null;
  };

  // Computed Guidance Metrics (S2)
  guidanceS2?: {
    scienceScore: number;
    scienceRank: number;
    artsScore: number;
    artsRank: number;
    preliminaryGuidance: 'science' | 'arts' | null;
    compatibility: 'comply' | 'not-comply' | null;
    stability: 'stable' | 'unstable' | null;
  };

  // Computed Guidance Metrics (S3 - Final)
  guidanceS3?: {
    scienceScore: number;
    scienceRank: number;
    artsScore: number;
    artsRank: number;
    preliminaryGuidance: 'science' | 'arts' | null;
    compatibility: 'comply' | 'not-comply' | null;
    stability: 'stable' | 'unstable' | null;
  };

  // Orientation & Preferences per Semester
  orientationS1: OrientationData;
  orientationS2: OrientationData;
  orientationS3: OrientationData;
}

export interface AppState {
  isProcessing: boolean;
  importedFiles: {
    S1: boolean;
    S2: boolean;
    S3: boolean;
    PAST: boolean;
  };
}

// --- Advanced Filtering & Sorting Types ---

export type FilterOperator = 
  | 'equals' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith' 
  | 'greaterThan' 
  | 'lessThan' 
  | 'between'
  | 'top10';

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any; // For 'between'
}

export interface SortRule {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

export interface GroupRule {
  field: string | null;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

// --- Settings Types ---

export interface StreamWeights {
  math: number;
  physics: number;
  nature: number;
  arabic: number;
  french: number;
  english: number;
  historyGeo: number;
}

export interface AppreciationRule {
  id: string;
  min: number;
  label: string;
  color: string; // Tailwind class string
}

export interface FormulaWeights {
  // S1: (Past * w1 + Current * w2) / (w1+w2)
  s1PastWeight: number;
  s1CurrentWeight: number;
  
  // S2/S3: (CumulativeAvg * w1 + Current * w2) / (w1+w2)
  cumulativeWeight: number;
  semesterWeight: number;
}

export interface SmartFlagSettings {
  riskThreshold: number; // GPA below this is Risk
  talentThreshold: number; // Subject grade above this is Talent
}

export interface GuidanceSettings {
  id?: string; // Single record usually
  profileName: string;
  scienceWeights: StreamWeights;
  artsWeights: StreamWeights;
  
  // New Configurations
  passingThreshold: number; // Default 10
  formulaConfig: FormulaWeights;
  appreciations: AppreciationRule[];
  smartFlags: SmartFlagSettings;
}

// --- Auth Types ---

export type UserRole = 'admin' | 'counselor' | 'teacher' | 'director' | 'viewer';

export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  securityQuestion: string;
  securityAnswerHash: string; // Hashed answer
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthLog {
  id?: number;
  username: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAIL' | 'LOGOUT' | 'PASSWORD_RESET';
  timestamp: string;
  details?: string;
}

export interface SessionData {
  userId: number;
  username: string;
  role: UserRole;
  expiry: number;
}
