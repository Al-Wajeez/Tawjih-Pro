
import Dexie, { Table } from 'dexie';
import { ConsolidatedStudent, GuidanceSettings, User, AuthLog, ProcessedFile } from '../types';

class GuidanceDatabase extends Dexie {
  students!: Table<ConsolidatedStudent, string>; 
  settings!: Table<GuidanceSettings, string>;
  users!: Table<User, number>;
  authLogs!: Table<AuthLog, number>;
  files!: Table<ProcessedFile, number>;

  constructor() {
    super('TawjihProDB');
    
    // Version 4: Files Table for persistence
    (this as any).version(4).stores({
      students: 'id, fullName, birthDate, guidance.scienceScore, guidance.artsScore',
      settings: '++id, profileName',
      users: '++id, username, role',
      authLogs: '++id, username, timestamp',
      files: '++id, type, fileName'
    });

    // Version 3: Auth Tables
    (this as any).version(3).stores({
      students: 'id, fullName, birthDate, guidance.scienceScore, guidance.artsScore',
      settings: '++id, profileName',
      users: '++id, username, role',
      authLogs: '++id, username, timestamp'
    });

    // Version 2 adds settings. We keep 'students' schema.
    (this as any).version(2).stores({
      students: 'id, fullName, birthDate, guidance.scienceScore, guidance.artsScore',
      settings: '++id, profileName'
    });
    // Fallback for older versions if browser has cached V1
    (this as any).version(1).stores({
      students: 'id, fullName, birthDate, guidance.scienceScore, guidance.artsScore'
    });
  }
}

export const db = new GuidanceDatabase();

export const saveStudents = async (students: ConsolidatedStudent[]) => {
  await (db as any).transaction('rw', db.students, async () => {
    await db.students.clear();
    await db.students.bulkAdd(students);
  });
};

export const getStudents = async (): Promise<ConsolidatedStudent[]> => {
  return await db.students.toArray();
};

export const clearDatabase = async () => {
  await db.students.clear();
  await db.files.clear();
  // We optionally don't clear settings or users so configuration persists
};

// --- File Operations ---

export const saveFileRecord = async (file: ProcessedFile) => {
  return await db.files.add(file);
};

export const getFileRecords = async (): Promise<ProcessedFile[]> => {
  return await db.files.toArray();
};

export const deleteFileRecord = async (id: number) => {
  await db.files.delete(id);
};

export const clearFiles = async () => {
  await db.files.clear();
};

// --- Settings Operations ---

export const getSettings = async (): Promise<GuidanceSettings | undefined> => {
  return await db.settings.toCollection().first();
};

export const saveSettings = async (settings: GuidanceSettings) => {
  await db.settings.clear(); // Only store one active profile for now
  await db.settings.add(settings);
};

// --- Backup & Restore ---

export interface BackupData {
  meta: {
    version: number;
    appName: string;
    timestamp: string;
  };
  data: {
    students: ConsolidatedStudent[];
    settings?: GuidanceSettings;
    files?: ProcessedFile[];
  };
}

export const exportDatabase = async (): Promise<BackupData> => {
  const students = await db.students.toArray();
  const settings = await db.settings.toCollection().first();
  const files = await db.files.toArray();

  return {
    meta: {
      version: 1,
      appName: 'TawjihPro',
      timestamp: new Date().toISOString()
    },
    data: {
      students,
      settings,
      files
    }
  };
};

export const importDatabase = async (backup: BackupData): Promise<void> => {
  if (backup.meta?.appName !== 'TawjihPro') {
    throw new Error('Invalid backup file format.');
  }

  await (db as any).transaction('rw', db.students, db.settings, db.files, async () => {
    // 1. Clear existing
    await db.students.clear();
    await db.settings.clear();
    await db.files.clear();

    // 2. Import Students
    if (Array.isArray(backup.data.students)) {
      await db.students.bulkAdd(backup.data.students);
    }

    // 3. Import Settings
    if (backup.data.settings) {
      await db.settings.add(backup.data.settings);
    }

    // 4. Import Files
    if (Array.isArray(backup.data.files)) {
      await db.files.bulkAdd(backup.data.files);
    }
  });
};
