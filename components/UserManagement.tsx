
import React, { useState, useEffect } from 'react';
import { User, UserRole, AuthLog } from '../types';
import { db } from '../services/db';
import { createUser, updateUser, getLogs, SECURITY_QUESTIONS, getSession } from '../services/auth';
import { Users, UserPlus, Shield, Trash2, Key, History, Activity, Lock, AlertCircle, X, Edit, ShieldAlert, AlertTriangleIcon } from 'lucide-react';
import { Button } from './Button';

export const UserManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<AuthLog[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentUserSession, setCurrentUserSession] = useState<number | null>(null);
    const [resetSecurity, setResetSecurity] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        id: 0,
        username: '',
        fullName: '',
        role: 'viewer' as UserRole,
        password: '',
        securityQuestion: SECURITY_QUESTIONS[0],
        securityAnswer: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
        const session = getSession();
        if (session) setCurrentUserSession(session.userId);
    }, [activeTab]);

    const loadData = async () => {
        const u = await db.users.toArray();
        setUsers(u);
        if (activeTab === 'logs') {
            const l = await getLogs();
            setLogs(l);
        }
    };

    const handleOpenAdd = () => {
        setIsEditMode(false);
        setResetSecurity(false);
        setFormData({ id: 0, username: '', fullName: '', role: 'viewer', password: '', securityQuestion: SECURITY_QUESTIONS[0], securityAnswer: '' });
        setError('');
        setShowModal(true);
    };

    const handleOpenEdit = (user: User) => {
        setIsEditMode(true);
        setResetSecurity(false);
        setFormData({
            id: user.id!,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            password: '', // Empty means don't change
            securityQuestion: user.securityQuestion || SECURITY_QUESTIONS[0],
            securityAnswer: ''
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isEditMode) {
                // Edit Logic
                
                // Prevent self-demotion
                if (currentUserSession === formData.id && formData.role !== 'admin') {
                    throw new Error("لا يمكنك حذف صلاحية المدير عن حسابك الحالي.");
                }

                if (resetSecurity && !formData.securityAnswer) {
                    throw new Error("يجب إدخال إجابة سؤال الأمان الجديدة.");
                }

                await updateUser(
                    formData.id, 
                    {
                        fullName: formData.fullName,
                        role: formData.role,
                        ...(resetSecurity ? { securityQuestion: formData.securityQuestion } : {})
                    }, 
                    formData.password, // Pass new password if provided
                    resetSecurity ? formData.securityAnswer : undefined // Pass new security answer if reset
                );
            } else {
                // Create Logic
                if (!formData.password) throw new Error("كلمة المرور مطلوبة.");
                if (!formData.securityAnswer) throw new Error("إجابة سؤال الأمان مطلوبة.");

                await createUser(
                    {
                        username: formData.username,
                        fullName: formData.fullName,
                        role: formData.role,
                        securityQuestion: formData.securityQuestion,
                        isActive: true
                    },
                    formData.password,
                    formData.securityAnswer
                );
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (id === currentUserSession) {
            alert("لا يمكنك حذف حسابك الحالي.");
            return;
        }
        if(window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            await db.users.delete(id);
            loadData();
        }
    };

    const handleToggleActive = async (user: User) => {
        if (user.id === currentUserSession) return; // Prevent disabling self
        await db.users.update(user.id!, { isActive: !user.isActive });
        loadData();
    };

    const RoleBadge = ({ role }: { role: UserRole }) => {
        const colors = {
            admin: 'bg-purple-100 text-purple-700',
            counselor: 'bg-emerald-100 text-emerald-700',
            teacher: 'bg-blue-100 text-blue-700',
            director: 'bg-indigo-100 text-indigo-700',
            viewer: 'bg-slate-100 text-slate-700'
        };
        const labels = {
            admin: 'مدير نظام',
            counselor: 'مستشار توجيه',
            teacher: 'أستاذ',
            director: 'المدير',
            viewer: 'زائر'
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[role]}`}>{labels[role]}</span>;
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 h-full">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield size={24} className="text-primary-600"/>
                        إدارة المستخدمين والصلاحيات
                    </h2>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-bold rounded transition-colors ${activeTab === 'users' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`}>
                            <Users size={16} className="inline ml-2"/> المستخدمين
                        </button>
                        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-bold rounded transition-colors ${activeTab === 'logs' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`}>
                            <History size={16} className="inline ml-2"/> سجل الدخول
                        </button>
                    </div>
                </div>

                <div className="flex mb-6 rounded-xl boreder bg-yellow-100 m-6 p-6">
                    <p className="text-sm text-justify text-yellow-700">تُعدّ صفحة إدارة المستخدمين والصلاحيات فضاءً مخصصًا لتنظيم حسابات المستخدمين داخل النظام، حيث تُمكّن من إضافة المستخدمين وتعديل بياناتهم وحذفهم عند الاقتضاء، مع ضبط الصلاحيات المخوّلة لكل مستخدم حسب مهامه ومسؤولياته. وتهدف هذه الصفحة إلى ضمان حسن توزيع الأدوار، تعزيز أمن المعطيات، وضمان الاستعمال المنظّم والفعّال للنظام.</p>
                </div>

                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">قائمة الحسابات ({users.length})</h3>
                            <Button size="md" onClick={handleOpenAdd}>
                                <UserPlus size={16} className="ml-2 text-center"/> إضافة مستخدم
                            </Button>
                        </div>
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-4 text-center">#</th>
                                    <th className="p-4 text-center">اسم المستخدم</th>
                                    <th className="p-4 text-center">الاسم الكامل</th>
                                    <th className="p-4 text-center">الدور</th>
                                    <th className="p-4 text-center">آخر دخول</th>
                                    <th className="p-4 text-center">الحالة</th>
                                    <th className="p-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-center font-mono font-bold">{u.id}</td>
                                        <td className="p-4 text-center font-mono font-bold">{u.username}</td>
                                        <td className="p-4 text-center">{u.fullName}</td>
                                        <td className="p-4 text-center"><RoleBadge role={u.role}/></td>
                                        <td className="p-4 text-center text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('ar-DZ') : '-'}</td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => handleToggleActive(u)} 
                                                disabled={u.id === currentUserSession}
                                                className={`text-xs px-2 py-1 rounded font-bold disabled:opacity-50 ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {u.isActive ? 'نشط' : 'معطل'}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="تعديل المعلومات"><Edit size={16}/></button>
                                                {u.username !== 'admin' && u.id !== currentUserSession && (
                                                    <button onClick={() => handleDeleteUser(u.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 size={16}/></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-700">سجل الأحداث (آخر 100 عملية)</h3>
                        </div>
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-4 text-center">#</th>
                                    <th className="p-4 text-center">الوقت</th>
                                    <th className="p-4 text-center">المستخدم</th>
                                    <th className="p-4 text-center">الحدث</th>
                                    <th className="p-4 text-center">تفاصيل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-center text-slate-500" dir="rtl">{log.id}</td>
                                        <td className="p-4 text-center text-slate-500" dir="rtl">{new Date(log.timestamp).toLocaleString('ar-DZ')}</td>
                                        <td className="p-4 text-center font-bold">{log.username}</td>
                                        <td className="p-4 text-center">
                                            {log.action === 'LOGIN_SUCCESS' && <span className="text-emerald-600 text-center font-bold flex items-center gap-1"><Activity size={14}/> دخول ناجح</span>}
                                            {log.action === 'LOGIN_FAIL' && <span className="text-red-600 text-center font-bold flex items-center gap-1"><AlertCircle size={14}/> فشل الدخول</span>}
                                            {log.action === 'LOGOUT' && <span className="text-slate-500 text-center font-bold">تسجيل خروج</span>}
                                            {log.action === 'PASSWORD_RESET' && <span className="text-amber-600 text-center font-bold">تغيير كلمة المرور</span>}
                                        </td>
                                        <td className="p-4 text-center text-slate-500">{log.details || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal (Add / Edit) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0">
                            <h3 className="font-bold text-lg">{isEditMode ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2">
                            <div>
                                <label className="block text-sm font-bold mb-1">اسم المستخدم {isEditMode && <span className="text-xs text-slate-400 font-normal">(غير قابل للتغيير)</span>}</label>
                                <input 
                                    required 
                                    disabled={isEditMode}
                                    className="w-full border p-2 rounded bg-slate-50 disabled:text-slate-500" 
                                    value={formData.username} 
                                    onChange={e => setFormData({...formData, username: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">الاسم الكامل</label>
                                <input required className="w-full border p-2 rounded" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">الدور (الصلاحيات)</label>
                                <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                    <option value="admin">مدير نظام (Admin)</option>
                                    <option value="counselor">مستشار توجيه (Counselor)</option>
                                    <option value="teacher">أستاذ (Teacher)</option>
                                    <option value="director">المدير (Director)</option>
                                    <option value="viewer">زائر (Viewer)</option>
                                </select>
                            </div>
                            
                            <div className={`p-3 rounded border ${isEditMode ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}`}>
                                <label className="block text-sm font-bold mb-1">
                                    {isEditMode ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور'}
                                </label>
                                <input 
                                    type="password" 
                                    required={!isEditMode}
                                    placeholder={isEditMode ? 'اتركه فارغاً للإبقاء على الحالية' : ''}
                                    className="w-full border p-2 rounded" 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                />
                            </div>
                            
                            {/* Security Section Toggle for Edit Mode */}
                            {isEditMode && (
                                <div className="flex items-center gap-2 mb-2">
                                    <input 
                                        type="checkbox" 
                                        id="resetSecurity" 
                                        checked={resetSecurity} 
                                        onChange={e => setResetSecurity(e.target.checked)}
                                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                    />
                                    <label htmlFor="resetSecurity" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                        تغيير إعدادات الأمان والاسترجاع
                                    </label>
                                </div>
                            )}

                            {/* Security Questions - Shown if creating OR if reset toggle is active */}
                            {(!isEditMode || resetSecurity) && (
                                <div className="bg-amber-50 p-3 rounded border border-amber-200 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                                        <ShieldAlert size={12}/>
                                        إعدادات الأمان واسترجاع الحساب
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold mb-1">سؤال الأمان</label>
                                            <select 
                                                className="w-full border p-2 rounded text-sm" 
                                                value={formData.securityQuestion} 
                                                onChange={e => setFormData({...formData, securityQuestion: e.target.value})}
                                            >
                                                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1">إجابة سؤال الأمان</label>
                                            <input 
                                                required={!isEditMode || resetSecurity} 
                                                type="text" 
                                                className="w-full border p-2 rounded text-sm" 
                                                value={formData.securityAnswer} 
                                                onChange={e => setFormData({...formData, securityAnswer: e.target.value})} 
                                                placeholder="إجابة سرية..." 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && <div className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded">{error}</div>}
                            
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4 shrink-0">
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
                                <Button type="submit">{isEditMode ? 'حفظ التعديلات' : 'إنشاء المستخدم'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
