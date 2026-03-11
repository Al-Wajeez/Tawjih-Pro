
import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, HelpCircle, ShieldCheck } from 'lucide-react';
import { login, resetPassword, verifySecurityQuestion } from '../services/auth';
import { Button } from './Button';

interface LoginPageProps {
    onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // Forgot Flow State
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [resetUserId, setResetUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(username, password, remember);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitiateReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // In a real app we might not want to reveal if user exists, but this is a local app
            // We need to fetch the question to show it.
            // verifySecurityQuestion checks user existence first. 
            // We actually need a way to GET the question first without the answer.
            // Let's modify logic: Try to get user question.
            
            // This logic requires a small tweak in auth service or direct DB access here for UX
            // Since this is a component, let's assume we can fetch the question if user exists
            const { db } = await import('../services/db');
            const user = await db.users.where('username').equals(username).first();
            
            if (!user) throw new Error("اسم المستخدم غير موجود");
            if (user.securityQuestion === 'default') throw new Error("لا يمكن استرجاع هذا الحساب. اتصل بالمسؤول.");

            setSecurityQuestion(user.securityQuestion);
            setMode('reset');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCompleteReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const user = await verifySecurityQuestion(username, securityAnswer);
            await resetPassword(user.id!, newPassword);
            alert("تم تغيير كلمة المرور بنجاح. يمكنك الدخول الآن.");
            setMode('login');
            setPassword('');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
                
                <div className="bg-primary-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <ShieldCheck size={32} className="text-white"/>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Tawjih Pro</h1>
                    <p className="text-primary-100 text-sm mt-1">نظام التوجيه المدرسي الآمن</p>
                </div>

                <div className="p-8 flex-1">
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المستخدم</label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    <input 
                                        required 
                                        type="text" 
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full pr-10 pl-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="Username"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    <input 
                                        required 
                                        type={showPass ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pr-10 pl-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500"/>
                                    تذكرني
                                </label>
                                <button type="button" onClick={() => setMode('forgot')} className="text-primary-600 hover:text-primary-700 font-bold hover:underline">
                                    نسيت كلمة المرور؟
                                </button>
                            </div>

                            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold flex items-center gap-2"><AlertCircleIcon/> {error}</div>}

                            <Button type="submit" className="w-full py-3 text-lg justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" disabled={isLoading}>
                                {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                            </Button>
                        </form>
                    )}

                    {mode === 'forgot' && (
                        <form onSubmit={handleInitiateReset} className="space-y-5 animate-in fade-in">
                            <div className="text-center mb-6">
                                <h2 className="text-lg font-bold text-slate-800">استعادة كلمة المرور</h2>
                                <p className="text-slate-500 text-sm">أدخل اسم المستخدم للبحث عن حسابك</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المستخدم</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>

                            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold">{error}</div>}

                            <Button type="submit" className="w-full justify-center">متابعة</Button>
                            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-slate-500 text-sm mt-4 hover:text-slate-700">العودة لتسجيل الدخول</button>
                        </form>
                    )}

                    {mode === 'reset' && (
                        <form onSubmit={handleCompleteReset} className="space-y-5 animate-in fade-in">
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-4">
                                <div className="text-xs font-bold text-amber-800 uppercase mb-1">سؤال الأمان</div>
                                <div className="font-bold text-slate-800">{securityQuestion}</div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">إجابة سؤال الأمان</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={securityAnswer}
                                    onChange={e => setSecurityAnswer(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="أدخل الإجابة..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                                <input 
                                    required 
                                    type="password" 
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>

                            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold">{error}</div>}

                            <Button type="submit" className="w-full justify-center">تغيير كلمة المرور</Button>
                            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-slate-500 text-sm mt-4 hover:text-slate-700">إلغاء</button>
                        </form>
                    )}
                </div>
                
                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
                     برنامج الوجيز &copy; - سجل المتابعة 2026
                </div>
            </div>
        </div>
    );
};

const AlertCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
