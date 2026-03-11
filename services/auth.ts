
import * as bcrypt from 'bcryptjs';
import { db } from './db';
import { User, UserRole, AuthLog, SessionData } from '../types';

const SESSION_KEY = 'tawjih_session';
const SALT_ROUNDS = 10;

// Security Questions List
export const SECURITY_QUESTIONS = [
    "ما هو اسم حيوانك الأليف الأول؟",
    "ما هو اسم مدرستك الابتدائية؟",
    "ما هي مدينتك المفضلة؟",
    "ما هو اسم صديق طفولتك المقرب؟",
    "ما هو الكتاب المفضل لديك؟"
];

// --- Hashing Helpers ---

export const hashValue = async (val: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(val, SALT_ROUNDS, (err, hash) => {
            if (err) reject(err);
            else resolve(hash);
        });
    });
};

export const compareValue = async (val: string, hash: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(val, hash, (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
    });
};

// --- Initialization ---

export const initAuth = async () => {
    const count = await db.users.count();
    if (count === 0) {
        // Seed Admin
        const hash = await hashValue('admin123');
        const answerHash = await hashValue('admin');
        const admin: User = {
            username: 'admin',
            passwordHash: hash,
            role: 'admin',
            fullName: 'مدير النظام',
            securityQuestion: 'default', // Hidden question
            securityAnswerHash: answerHash, // Answer: admin
            createdAt: new Date().toISOString(),
            isActive: true
        };
        await db.users.add(admin);
        console.log("Default admin created: admin / admin123");
    }
};

// --- Session Management ---

export const getSession = (): SessionData | null => {
    // Check Local Storage (Remember Me)
    let json = localStorage.getItem(SESSION_KEY);
    if (!json) {
        // Check Session Storage
        json = sessionStorage.getItem(SESSION_KEY);
    }

    if (!json) return null;

    try {
        const session: SessionData = JSON.parse(atob(json));
        if (Date.now() > session.expiry) {
            logout();
            return null;
        }
        return session;
    } catch (e) {
        return null;
    }
};

export const setSession = (user: User, rememberMe: boolean) => {
    // 24 hours for normal, 30 days for remember me
    const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    const session: SessionData = {
        userId: user.id!,
        username: user.username,
        role: user.role,
        expiry: Date.now() + duration
    };

    const str = btoa(JSON.stringify(session));
    if (rememberMe) {
        localStorage.setItem(SESSION_KEY, str);
    } else {
        sessionStorage.setItem(SESSION_KEY, str);
    }
};

export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    // Log logout
    const s = getSession();
    if (s) {
        logAction(s.username, 'LOGOUT');
    }
};

// --- User Operations ---

export const login = async (username: string, password: string, rememberMe: boolean): Promise<User> => {
    const user = await db.users.where('username').equals(username).first();
    
    if (!user) {
        await logAction(username, 'LOGIN_FAIL', 'User not found');
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    }

    if (!user.isActive) {
        await logAction(username, 'LOGIN_FAIL', 'User disabled');
        throw new Error("هذا الحساب معطل. يرجى الاتصال بالمسؤول.");
    }

    const match = await compareValue(password, user.passwordHash);
    if (!match) {
        await logAction(username, 'LOGIN_FAIL', 'Incorrect password');
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    }

    // Success
    setSession(user, rememberMe);
    await db.users.update(user.id!, { lastLogin: new Date().toISOString() });
    await logAction(username, 'LOGIN_SUCCESS');
    return user;
};

export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'passwordHash' | 'securityAnswerHash'>, password: string, securityAnswer: string) => {
    // Check uniqueness
    const exists = await db.users.where('username').equals(userData.username).count();
    if (exists > 0) throw new Error("اسم المستخدم مستعمل من قبل");

    const passwordHash = await hashValue(password);
    const securityAnswerHash = await hashValue(securityAnswer);

    const newUser: User = {
        ...userData,
        passwordHash,
        securityAnswerHash,
        createdAt: new Date().toISOString(),
        isActive: true
    };

    await db.users.add(newUser);
};

export const updateUser = async (
    id: number, 
    updates: Partial<User>, 
    newPassword?: string,
    newSecurityAnswer?: string
) => {
    const user = await db.users.get(id);
    if (!user) throw new Error("المستخدم غير موجود");

    const payload: any = { ...updates };
    
    // Handle Password Update
    if (newPassword && newPassword.trim() !== "") {
        payload.passwordHash = await hashValue(newPassword);
    }

    // Handle Security Answer Update
    if (newSecurityAnswer && newSecurityAnswer.trim() !== "") {
        payload.securityAnswerHash = await hashValue(newSecurityAnswer);
    }

    await db.users.update(id, payload);
    
    // Log if role or active status changed
    if (updates.role && updates.role !== user.role) {
        await logAction('system', 'LOGIN_SUCCESS', `Changed role of ${user.username} to ${updates.role}`);
    }
};

export const verifySecurityQuestion = async (username: string, answer: string): Promise<User> => {
    const user = await db.users.where('username').equals(username).first();
    if (!user) throw new Error("المستخدم غير موجود");

    const match = await compareValue(answer, user.securityAnswerHash);
    if (!match) throw new Error("إجابة سؤال الأمان غير صحيحة");

    return user;
};

export const resetPassword = async (userId: number, newPassword: string) => {
    const hash = await hashValue(newPassword);
    await db.users.update(userId, { passwordHash: hash });
    const user = await db.users.get(userId);
    if(user) await logAction(user.username, 'PASSWORD_RESET');
};

// --- Logging ---

export const logAction = async (username: string, action: AuthLog['action'], details?: string) => {
    await db.authLogs.add({
        username,
        action,
        details,
        timestamp: new Date().toISOString()
    });
};

export const getLogs = async () => {
    return await db.authLogs.reverse().limit(100).toArray();
};
