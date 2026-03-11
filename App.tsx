
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Calculator, GraduationCap, Trash2, FileText, BarChart, ChevronRight, ChevronDown, ChevronLeft, Menu, PieChart, AlertCircle, X, Settings as SettingsIcon, Layout, Presentation, Settings2, ClipboardList, HeartHandshake, Info, Trophy, LogOut, User, Shield } from 'lucide-react';
import { ConsolidatedStudent, ProcessedFile, FileMetadata, GuidanceSettings, User as AuthUser } from './types';
import { FileUploadCard } from './components/FileUploadCard';
import { Button } from './components/Button';
import { StudentTable, ViewMode } from './components/StudentTable';
import { PlacementStats } from './components/PlacementStats';
import { StudentFormModal } from './components/StudentFormModal';
import { StudentDetailsModal } from './components/StudentDetailsModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SettingsPanel } from './components/SettingsPanel';
import { GlobalSimulator } from './components/GlobalSimulator';
import { InterviewManager } from './components/InterviewManager';
import { RemedialPlanManager } from './components/RemedialPlanManager';
import { VirtualGuidancePanel } from './components/VirtualGuidancePanel';
import { AboutPage } from './components/AboutPage';
import { DataCleaningModal } from './components/DataCleaningModal';
import { UserManagement } from './components/UserManagement';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage'; 
import { FeaturesPage } from './components/FeaturesPage';
import { SystemDashboard } from './components/SystemDashboard';
import { consolidateData, calculateProgressivePlacement, rankStudents, DEFAULT_SETTINGS, detectConflicts, DataConflict } from './services/guidanceService';
import { saveStudents, getStudents, clearDatabase, getSettings, saveSettings, saveFileRecord, deleteFileRecord, getFileRecords, clearFiles } from './services/db';
import { initAuth, getSession, logout } from './services/auth';
import favicon from '/favicon.ico'

type FileState = {
  S1: ProcessedFile[];
  S2: ProcessedFile[];
  S3: ProcessedFile[];
  PAST: ProcessedFile[];
  BEM: ProcessedFile[];
};

type ViewState = 'landing' | 'login' | 'features' | 'app';

function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('landing');

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState<'import' | 'dashboard' | 'data' | 'settings' | 'about' | 'users'>('import');
  const [currentView, setCurrentView] = useState<string>('grades_s1');
  const [students, setStudents] = useState<ConsolidatedStudent[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<ConsolidatedStudent | undefined>(undefined);
  const [selectedStudent, setSelectedStudent] = useState<ConsolidatedStudent | null>(null);
  const [showCleaningModal, setShowCleaningModal] = useState(false);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [appSettings, setAppSettings] = useState<GuidanceSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
     isOpen: boolean;
     type: 'delete_single' | 'delete_all' | null;
     payload?: any;
  }>({ isOpen: false, type: null });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    s1: false, s2: false, s3: false, past: false, analysis: false
  });
  const [files, setFiles] = useState<FileState>({ S1: [], S2: [], S3: [], PAST: [], BEM: [] });

  // --- AUTH INIT ---
  useEffect(() => {
    const bootstrap = async () => {
      await initAuth(); // Ensure DB has admin
      const session = getSession();
      if (session) {
        setCurrentUser({ 
            id: session.userId, 
            username: session.username, 
            role: session.role, 
            fullName: session.username, 
            isActive: true, 
            passwordHash: '', 
            securityAnswerHash: '', 
            securityQuestion: '', 
            createdAt: '' 
        });
        setViewState('app'); 
        loadDataFromDb();
      }
      setIsAuthLoading(false);
    };
    bootstrap();
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
      setCurrentUser(user);
      setViewState('app');
      loadDataFromDb();
  };

  const handleLogout = () => {
      logout();
      setCurrentUser(null);
      setViewState('landing');
      setStudents([]); // Clear sensitivity from memory
  };

  // --- PERMISSIONS HELPERS ---
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'counselor' || currentUser?.role === 'director';
  const canAdmin = currentUser?.role === 'admin';
  const canViewAnalysis = currentUser?.role !== 'viewer'; // Maybe viewers can't see deep analysis? Or they can.

  const loadDataFromDb = async () => {
      try {
          const [loadedStudents, loadedSettings, loadedFiles] = await Promise.all([
              getStudents(),
              getSettings(),
              getFileRecords()
          ]);
          setStudents(loadedStudents);
          if (loadedSettings) {
              setAppSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
          }
          
          // Reconstruct FileState from DB
          const newFiles: FileState = { S1: [], S2: [], S3: [], PAST: [], BEM: [] };
          loadedFiles.forEach(f => {
              if (newFiles[f.type]) {
                  newFiles[f.type].push(f);
              }
          });
          setFiles(newFiles);

      } catch (err) {
          console.error("Failed to load data", err);
          setError("فشل في تحميل البيانات المحفوظة.");
      }
  };

  // Auto-dismiss error
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Accordion Logic: When opening one, close others
  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => {
        const isOpening = !prev[key];
        if (isOpening) {
            // Close all others and open current
            return {
                s1: false, s2: false, s3: false, past: false, analysis: false,
                [key]: true
            };
        } else {
            // Just close current
            return { ...prev, [key]: false };
        }
    });
  };

  const handleFile = async (file: ProcessedFile) => {
    if (!canEdit) { setError("ليس لديك صلاحية الاستيراد"); return; }
    try {
        const id = await saveFileRecord(file);
        const fileWithId = { ...file, id };
        setFiles(prev => ({ ...prev, [file.type]: [...prev[file.type], fileWithId] }));
    } catch (e) {
        console.error(e);
        setError("فشل حفظ الملف في قاعدة البيانات");
    }
  };

  const removeFile = async (type: keyof FileState, index: number) => {
    const file = files[type][index];
    if (file.id) {
        await deleteFileRecord(file.id);
    }
    setFiles(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const processAll = async (resolutionMap?: Record<string, string>) => {
    if (!canEdit) return;
    const allFiles: ProcessedFile[] = [...files.S1, ...files.S2, ...files.S3, ...files.PAST, ...files.BEM];
    if (allFiles.length === 0) { setError("الرجاء رفع ملف واحد على الأقل"); return; }

    try {
        if (resolutionMap === undefined) {
            const detectedConflicts = detectConflicts(allFiles, students);
            if (detectedConflicts.length > 0) {
                setConflicts(detectedConflicts);
                setShowCleaningModal(true);
                return;
            }
            resolutionMap = {};
        }
        let data = consolidateData(allFiles, students, resolutionMap);
        data = recalculateAndRank(data, appSettings);
        await saveStudents(data);
        setStudents(data);
        setActiveTab('dashboard');
        setShowCleaningModal(false);
    } catch (err) {
        console.error("Processing error:", err);
        setError("حدث خطأ أثناء معالجة البيانات.");
    }
  };

  const handleResolution = (resolutions: Record<string, string>) => processAll(resolutions);

  const recalculateAndRank = (data: ConsolidatedStudent[], settings: GuidanceSettings) => {
    let processed = calculateProgressivePlacement(data, settings);
    processed = rankStudents(processed);
    return processed;
  };

  const handleSettingsUpdate = async (newSettings: GuidanceSettings) => {
      if (!canEdit) { setError("ليس لديك صلاحية تعديل الإعدادات"); return; }
      try {
          await saveSettings(newSettings);
          setAppSettings(newSettings);
          if (students.length > 0) {
              const updatedStudents = recalculateAndRank(students, newSettings);
              setStudents(updatedStudents);
              await saveStudents(updatedStudents);
          }
      } catch (err) {
          setError("فشل في حفظ الإعدادات.");
      }
  };

  const initiateClearData = () => {
     if (!canAdmin) { setError("صلاحية الحذف الكامل للمدير فقط"); return; }
     setConfirmState({ isOpen: true, type: 'delete_all' });
  };

  const executeClearData = async () => {
      try {
        await clearDatabase();
        setStudents([]);
        setFiles({ S1: [], S2: [], S3: [], PAST: [], BEM: [] });
        setActiveTab('import');
        setConfirmState({ isOpen: false, type: null });
      } catch (err) {
          setError("فشل في مسح قاعدة البيانات.");
      }
  };

  const handleAddStudent = () => {
    if (!canEdit) return;
    setStudentToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEditStudent = (student: ConsolidatedStudent) => {
    if (!canEdit) return;
    setStudentToEdit(student);
    setIsFormOpen(true);
  };

  const getStudentIndex = (id: string) => students.findIndex(s => s.id === id);
  const handleNextStudent = () => { if (!selectedStudent) return; const idx = getStudentIndex(selectedStudent.id); if (idx >= 0 && idx < students.length - 1) setSelectedStudent(students[idx + 1]); };
  const handlePrevStudent = () => { if (!selectedStudent) return; const idx = getStudentIndex(selectedStudent.id); if (idx > 0) setSelectedStudent(students[idx - 1]); };
  const currentStudentIndex = selectedStudent ? getStudentIndex(selectedStudent.id) + 1 : 0;

  const initiateDeleteStudent = (id: string) => {
     if (!canEdit) return;
     setConfirmState({ isOpen: true, type: 'delete_single', payload: id });
  };

  const executeDeleteStudent = async () => {
    try {
        const id = confirmState.payload;
        if (!id) return;
        const updated = students.filter(s => s.id !== id);
        const reRanked = recalculateAndRank(updated, appSettings);
        setStudents(reRanked);
        await saveStudents(reRanked);
        setConfirmState({ isOpen: false, type: null });
    } catch (err) {
        setError("حدث خطأ أثناء حذف التلميذ.");
    }
  };

  const handleDeleteMany = async (ids: string[]) => {
    if (!canEdit) return;
    try {
        const updated = students.filter(s => !ids.includes(s.id));
        const reRanked = recalculateAndRank(updated, appSettings);
        setStudents(reRanked);
        await saveStudents(reRanked);
    } catch (err) {
        setError("حدث خطأ أثناء الحذف المتعدد.");
    }
  };

  const handleSaveStudent = async (student: ConsolidatedStudent) => {
    if (!canEdit) return;
    try {
        let updatedList = [...students];
        // Use studentToEdit.id only if we are currently in the form modal context
        const targetId = (isFormOpen && studentToEdit) ? studentToEdit.id : student.id;
        const index = updatedList.findIndex(s => s.id === targetId);
        
        if (index >= 0) updatedList[index] = student; 
        else updatedList.push(student);
        
        const reRanked = recalculateAndRank(updatedList, appSettings);
        setStudents(reRanked);
        await saveStudents(reRanked);
        
        if (isFormOpen) {
            setIsFormOpen(false);
            setStudentToEdit(undefined);
        }
        
        if (selectedStudent && selectedStudent.id === student.id) {
           const updatedRef = reRanked.find(s => s.id === student.id);
           if (updatedRef) setSelectedStudent(updatedRef);
        }
    } catch (err) {
        console.error("Save error:", err);
        setError("حدث خطأ أثناء حفظ بيانات التلميذ.");
    }
  };

  const handleVirtualGuidanceUpdate = async (updatedStudents: ConsolidatedStudent[]) => {
      if (!canEdit) return;
      try {
          const updatedMap = new Map(updatedStudents.map(s => [s.id, s]));
          const newStudentList = students.map(s => updatedMap.has(s.id) ? updatedMap.get(s.id)! : s);
          const reRanked = recalculateAndRank(newStudentList, appSettings);
          setStudents(reRanked);
          await saveStudents(reRanked);
      } catch (err) {
          setError("فشل تحديث بيانات التوجيه الافتراضي.");
      }
  };

  const handleBulkUpdate = async (ids: string[], field: string, value: any) => {
    if (!canEdit) return;
    try {
      let orientationKey: 'orientationS1' | 'orientationS2' | 'orientationS3' = 'orientationS1';
      if (currentView.includes('s2')) orientationKey = 'orientationS2';
      if (currentView.includes('s3')) orientationKey = 'orientationS3';
      const updatedStudents = students.map(student => {
        if (ids.includes(student.id)) {
          return { ...student, [orientationKey]: { ...student[orientationKey], [field]: value } };
        }
        return student;
      });
      const reRanked = recalculateAndRank(updatedStudents, appSettings);
      setStudents(reRanked);
      await saveStudents(reRanked);
    } catch (err) {
      setError("فشل في تطبيق التعديل الجماعي.");
    }
  };

  const hasFiles = files.S1.length > 0 || files.S2.length > 0 || files.S3.length > 0 || files.PAST.length > 0 || files.BEM.length > 0;
  const activeMetadata: Partial<FileMetadata> = React.useMemo(() => {
     const allFiles = [...files.S1, ...files.S2, ...files.S3];
     if (allFiles.length > 0) return allFiles[0].metadata;
     return {};
  }, [files]);

  const NavItem = ({ label, view, icon: Icon }: any) => (
    <button onClick={() => { setActiveTab('data'); setCurrentView(view); }} className={`w-full flex items-center gap-3 px-8 py-2 text-sm font-medium transition-colors ${activeTab === 'data' && currentView === view ? 'text-primary-600 bg-primary-50 border-r-2 border-primary-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'} ${isSidebarCollapsed ? 'justify-center px-0 py-3' : ''}`} title={isSidebarCollapsed ? label : ''}>
      <Icon size={16} className="shrink-0" />
      {!isSidebarCollapsed && <span>{label}</span>}
    </button>
  );

  const SectionHeader = ({ id, label, shortLabel }: { id: string, label: string, shortLabel: string }) => (
    <button onClick={() => toggleMenu(id)} className={`w-full flex items-center justify-between px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? label : ''}>
      <div className="flex items-center gap-3">
         <span className="bg-slate-100 text-slate-500 text-xs font-bold px-1.5 py-1 rounded">{shortLabel}</span>
         {!isSidebarCollapsed && <span>{label}</span>}
      </div>
      {!isSidebarCollapsed && (expandedMenus[id] ? <ChevronDown size={14}/> : <ChevronLeft size={14}/>)}
    </button>
  );

  // --- RENDERING ---

  if (isAuthLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-bold">جاري تحميل النظام...</div>;
  }

  if (!currentUser) {
      if (viewState === 'login') {
          return <LoginPage onLoginSuccess={handleLoginSuccess} />;
      }
      if (viewState === 'features') {
          return <FeaturesPage onBack={() => setViewState('landing')} />;
      }
      // Default: Landing
      return <LandingPage onGetStarted={() => setViewState('login')} onShowFeatures={() => setViewState('features')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-4 fade-in duration-300">
           <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 shadow-lg flex items-start gap-3">
              <AlertCircle className="shrink-0 text-red-500" size={24} />
              <div className="flex-1 pt-0.5"><h3 className="font-bold text-sm mb-1">تنبيه</h3><p className="text-sm opacity-90 leading-relaxed">{error}</p></div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors"><X size={20} /></button>
           </div>
        </div>
      )}

      {showCleaningModal && <DataCleaningModal conflicts={conflicts} onResolve={handleResolution} onCancel={() => setShowCleaningModal(false)} />}
      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.type === 'delete_all' ? 'حذف جميع البيانات' : 'حذف تلميذ'} message={confirmState.type === 'delete_all' ? 'هل أنت متأكد من حذف قاعدة البيانات بالكامل؟ لا يمكن التراجع عنها.' : 'هل أنت متأكد من حذف هذا التلميذ؟'} isDestructive onConfirm={confirmState.type === 'delete_all' ? executeClearData : executeDeleteStudent} onCancel={() => setConfirmState({ isOpen: false, type: null })} confirmLabel="حذف" />

      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-l border-slate-200 shadow-sm z-20 flex flex-col transition-all duration-300`}>
        <div className={`p-2 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-100 flex-shrink-0 h-16`}>
          <div className="flex items-center gap-1 overflow-hidden">
            <div className="w-8 h-10 rounded-lg flex items-center justify-center text-white shrink-0">
              <img
                src={favicon} // Use the imported image
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                alt="Al Wajeez Logo"
                className="w-8 h-8 transition-transform duration-500" style={{zIndex:11}}
              />
              </div>
            {!isSidebarCollapsed && <h1 className="font-bold text-xl text-slate-800 whitespace-nowrap">سجل المتابعة</h1>}
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-slate-400 hover:text-primary-600 hidden md:block">{isSidebarCollapsed ? <GraduationCap size={0} /> : <Menu size={20} />}</button>
        </div>
        
        {/* User Info - Clickable for Menu */}
        <div className="border-b border-slate-100 bg-slate-50 relative">
            <button 
                onClick={() => {
                    if (isSidebarCollapsed) {
                        setIsSidebarCollapsed(false);
                    }
                    setIsUserMenuOpen(!isUserMenuOpen);
                }}
                className={`w-full p-3 flex items-center gap-3 transition-colors hover:bg-slate-100 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                title="إعدادات المستخدم"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                        {currentUser.username[0].toUpperCase()}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="overflow-hidden text-right">
                            <div className="font-bold text-sm text-slate-800 truncate">{currentUser.fullName}</div>
                            <div className="text-xs text-slate-500">{currentUser.role === 'admin' ? 'مدير نظام' : currentUser.role}</div>
                        </div>
                    )}
                </div>
                {!isSidebarCollapsed && (
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}/>
                )}
            </button>

            {/* User Dropdown Content (Expandable) */}
            <div className={`overflow-hidden transition-all duration-300 bg-slate-100 ${isUserMenuOpen && !isSidebarCollapsed ? 'max-h-40 border-t border-slate-200' : 'max-h-0'}`}>
                {canAdmin && (
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-slate-200 text-slate-600`}>
                        <Shield size={16} className="text-primary-600"/> <span>إدارة المستخدمين</span>
                    </button>
                )}
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-red-50 text-red-600">
                    <LogOut size={16}/> <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 space-y-1 no-scrollbar">
          {canEdit && (
             <>
              <button onClick={() => setActiveTab('import')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-colors ${activeTab === 'import' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'الاستيراد' : ''}>
                <LayoutDashboard size={20} className="shrink-0" />{!isSidebarCollapsed && <span>الاستيراد</span>}
              </button>
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'لوحة القيادة' : ''}>
                <Layout size={20} className="shrink-0" />{!isSidebarCollapsed && <span>لوحة القيادة</span>}
              </button>
              </>
          )}

          {/* Analysis Group */}
          <div>
            <SectionHeader id="analysis" label="التحليلات ولوحات القيادة" shortLabel="AN" />
            {(expandedMenus.analysis) && (
               <div className="bg-slate-50/50 py-1">
                  <NavItem label="تحليل الأقسام" view="analytics_classes" icon={Presentation} />
                  <NavItem label="محاكي السيناريوهات" view="global_simulator" icon={Settings2} />
                  <NavItem label="التوجيه الافتراضي" view="virtual_guidance" icon={Trophy} />
                  <NavItem label="نظام المقابلات" view="interviews" icon={ClipboardList} />
                  <NavItem label="المعالجة البيداغوجية" view="remedial_plans" icon={HeartHandshake} />
               </div>
            )}
          </div>

          <div><SectionHeader id="s1" label="الفصل الأول" shortLabel="S1" />{(expandedMenus.s1) && (<div className="bg-slate-50/50 py-1"><NavItem label="كشف النقاط" view="grades_s1" icon={FileText} /><NavItem label="رغبات التلاميذ" view="choices_s1" icon={Users} /><NavItem label="التوجيه التدريجي" view="guidance_s1" icon={BarChart} /><NavItem label="إحصائيات" view="statistics_s1" icon={PieChart} /></div>)}</div>
          <div><SectionHeader id="s2" label="الفصل الثاني" shortLabel="S2" />{(expandedMenus.s2) && (<div className="bg-slate-50/50 py-1"><NavItem label="كشف النقاط" view="grades_s2" icon={FileText} /><NavItem label="نتائج الفصلين" view="grades_s1_s2" icon={FileText} /><NavItem label="رغبات التلاميذ" view="choices_s2" icon={Users} /><NavItem label="التوجيه المسبق" view="guidance_s2" icon={BarChart} /><NavItem label="إحصائيات" view="statistics_s2" icon={PieChart} /></div>)}</div>
          <div><SectionHeader id="s3" label="الفصل الثالث" shortLabel="S3" />{(expandedMenus.s3) && (<div className="bg-slate-50/50 py-1"><NavItem label="كشف النقاط" view="grades_s3" icon={FileText} /><NavItem label="النتائج سنوية" view="grades_s1_s2_s3" icon={FileText} /><NavItem label="رغبات التلاميذ" view="choices_s3" icon={Users} /><NavItem label="التوجيه النهائي" view="guidance_s3" icon={BarChart} /><NavItem label="إحصائيات" view="statistics_s3" icon={PieChart} /></div>)}</div>
          <div><SectionHeader id="past" label="المسار الدراسي" shortLabel="PS" />{(expandedMenus.past) && (<div className="bg-slate-50/50 py-1"><NavItem label="كشف النقاط" view="grades_past" icon={FileText} /></div>)}</div>

          <div className="border-t border-slate-100 mt-2 pt-2">
            {canEdit && (
                <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-colors ${activeTab === 'settings' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'الإعدادات' : ''}>
                    <SettingsIcon size={20} className="shrink-0" />{!isSidebarCollapsed && <span>الإعدادات</span>}
                </button>
            )}
            <button onClick={() => setActiveTab('about')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-colors ${activeTab === 'about' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'حول البرنامج' : ''}>
                <Info size={20} className="shrink-0" />{!isSidebarCollapsed && <span>حول البرنامج</span>}
            </button>
          </div>
        </nav>

        {/* Footer - Only Delete Data if Admin */}
        {canAdmin && (
            <div className="py-4 border-t border-slate-100 flex-shrink-0">
                <button onClick={initiateClearData} className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700  ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title={isSidebarCollapsed ? 'حذف البيانات' : ''}>
                    <Trash2 size={20} className="shrink-0" />{!isSidebarCollapsed && <span>حذف البيانات</span>}
                </button>
            </div>
        )}
      </aside>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden flex flex-col bg-slate-100/50" dir="rtl">
        {activeTab === 'import' && (
          <div className="flex-1">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800">استيراد البيانات</h2>
                <p className="text-slate-500">قم برفع ملفات الحجز <strong>(ملفات الرقمنة)</strong> لجميع الأقسام.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploadCard label="الفصل الدراسي الأول" type="S1" files={files.S1} onFileProcessed={handleFile} onRemoveFile={(idx) => removeFile('S1', idx)} />
                <FileUploadCard label="الفصل الدراسي الثاني" type="S2" files={files.S2} onFileProcessed={handleFile} onRemoveFile={(idx) => removeFile('S2', idx)} />
                <FileUploadCard label="الفصل الدراسي الثالث" type="S3" files={files.S3} onFileProcessed={handleFile} onRemoveFile={(idx) => removeFile('S3', idx)} />
                <FileUploadCard label="المسار الدراسي السابق" type="PAST" files={files.PAST} onFileProcessed={handleFile} onRemoveFile={(idx) => removeFile('PAST', idx)} />
                <FileUploadCard label="شهادة التعليم المتوسط (BEM)" type="BEM" files={files.BEM} onFileProcessed={handleFile} onRemoveFile={(idx) => removeFile('BEM', idx)} />
              </div>
              <div className="bg-white border border-blue-100 rounded-xl p-6 flex flex-col md:flex-row grid grid-cols-[auto_16rem] items-center justify-stretch gap-12 shadow-sm">
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">معالجة التوجيه</h3>
                  <p className="text-sm text-slate-500">سيعمل النظام على دمج بيانات التلاميذ الواردة من مختلف الملفات، مع توحيد تواريخ الميلاد، ثم إجراء عمليات حساب المعدلات وفق المعايير المعتمدة.</p>
                </div>
                <Button size="lg" onClick={() => processAll()} disabled={!hasFiles}><Calculator size={20} className="ml-2" />معالجة البيانات</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <SystemDashboard students={students} />}

        {activeTab === 'data' && (
          <div className="flex-1 overflow-hidden flex flex-col animate-in fade-in duration-300 print:overflow-visible print:block">
             {currentView === 'analytics_classes' ? (
                <div className="flex-1 overflow-hidden print:overflow-visible">
                    <PlacementStats students={students} type="S3" mode="classes" />
                </div>
             ) : currentView === 'global_simulator' ? (
                <GlobalSimulator students={students} currentSettings={appSettings} />
             ) : currentView === 'virtual_guidance' ? (
                <VirtualGuidancePanel students={students} onUpdate={handleVirtualGuidanceUpdate} meta={activeMetadata} />
             ) : currentView === 'interviews' ? (
                <InterviewManager students={students} onUpdate={handleSaveStudent} meta={activeMetadata} />
             ) : currentView === 'remedial_plans' ? (
                <RemedialPlanManager students={students} meta={activeMetadata} />
             ) : currentView.startsWith('statistics') ? (
                <div className="flex-1 overflow-hidden print:overflow-visible">
                    <PlacementStats students={students} type={currentView === 'statistics_s2' ? 'S2' : currentView === 'statistics_s3' ? 'S3' : 'S1'} />
                </div>
             ) : (
                <StudentTable 
                  students={students} 
                  viewMode={currentView as ViewMode}
                  onEdit={handleEditStudent}
                  onDelete={initiateDeleteStudent}
                  onDeleteMany={handleDeleteMany}
                  onBulkUpdate={handleBulkUpdate}
                  onAdd={handleAddStudent}
                  onView={setSelectedStudent}
                  onUpdate={handleSaveStudent}
                  meta={activeMetadata}
                  settings={appSettings}
                />
             )}
          </div>
        )}

        {activeTab === 'settings' && canEdit && <SettingsPanel settings={appSettings} onSave={handleSettingsUpdate} onDataRestore={loadDataFromDb} />}
        {activeTab === 'about' && <AboutPage />}
        {activeTab === 'users' && canAdmin && <UserManagement />}

      </main>

      {isFormOpen && <StudentFormModal initialData={studentToEdit} meta={activeMetadata} onClose={() => setIsFormOpen(false)} onSave={handleSaveStudent} />}
      {selectedStudent && <StudentDetailsModal student={selectedStudent} studentsContext={students} settings={appSettings} onClose={() => setSelectedStudent(null)} onNext={handleNextStudent} onPrev={handlePrevStudent} currentIndex={currentStudentIndex} totalCount={students.length} onSave={handleSaveStudent} />}
    </div>
  );
}

export default App;
