import React, { useState, useEffect } from 'react';
import { ScreenView, Subject, TaskItem, ScheduleItem, TopicItem, TopicLevel, UserProfile } from './types';
import {
  initialSubjects,
  initialTasks,
  initialSchedule,
  initialTopicsDS,
} from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { DashboardView } from './components/DashboardView';
import { SubjectsView } from './components/SubjectsView';
import { TasksView } from './components/TasksView';
import { ExamReadinessView } from './components/ExamReadinessView';
import { MobilePreviewView } from './components/MobilePreviewView';
import { SyllabusAIView } from './components/SyllabusAIView';
import { PrototypeHub } from './prototype/PrototypeHub';
import { AddSubjectModal } from './components/AddSubjectModal';
import { AddTaskModal } from './components/AddTaskModal';
import { SettingsModal } from './components/SettingsModal';
import {
  getMe,
  logoutUser,
  UserAuthResponse,
  fetchSubjects,
  createSubject,
  deleteSubject,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  submitTopicReview,
} from './lib/api';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ScreenView>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Auth User State (managed via real API)
  const [currentUser, setCurrentUser] = useState<UserAuthResponse | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Core App State
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [topicsDS, setTopicsDS] = useState<TopicItem[]>(initialTopicsDS);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sub_ds');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState<boolean>(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Customizable Student Profile Overrides
  const [profileOverrides, setProfileOverrides] = useState<{
    name?: string;
    college: string;
    semester: string;
    dailyStudyMinutes: number;
    studyReminders: boolean;
  }>({
    college: 'Rajalakshmi Institute of Technology (RIT)',
    semester: 'Semester 4 — Computer Science & Engineering',
    dailyStudyMinutes: 180,
    studyReminders: true,
  });

  // Sync Dark Mode class with body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Check auth session on mount (/api/me) & load real student data
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const userRes = await getMe();
        if (isMounted) {
          if (userRes) {
            setCurrentUser(userRes);
            // Fetch backend subjects and tasks
            const [apiSubs, apiTasks] = await Promise.all([fetchSubjects(), fetchTasks()]);
            if (isMounted && apiSubs.length > 0) {
              setSubjects(apiSubs.map(s => ({
                id: s.id,
                name: s.name,
                code: s.code,
                progress: 0,
                completedTopics: 0,
                totalTopics: s.topics_count || 15,
                semester: s.semester || 'current',
                iconType: 'chip',
                colorTheme: (s.color_theme as any) || 'sky',
              })));
            }
            if (isMounted && apiTasks.length > 0) {
              setTasks(apiTasks.map(t => ({
                id: t.id,
                title: t.title,
                subjectName: t.subject_name || 'General',
                priority: t.priority >= 4 ? 'high' : t.priority >= 3 ? 'medium' : 'low',
                dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible',
                status: t.status as any,
                estimatedMinutes: t.estimated_minutes,
              })));
            }
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers
  const handleToggleSchedule = (id: string) => {
    setSchedule((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleToggleTask = async (id: string) => {
    const current = tasks.find((t) => t.id === id);
    const newStatus = current?.status === 'completed' ? 'todo' : 'completed';
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
            }
          : t
      )
    );
    if (currentUser && id.startsWith('tsk_')) {
      await updateTask(id, { status: newStatus });
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (currentUser && id.startsWith('tsk_')) {
      await deleteTask(id);
    }
  };

  const handleAddTask = async (newTask: Omit<TaskItem, 'id'>) => {
    const tempId = `tsk_${Date.now()}`;
    const task: TaskItem = {
      ...newTask,
      id: tempId,
    };
    setTasks((prev) => [task, ...prev]);

    if (currentUser) {
      const matchedSubject = subjects.find((s) => s.name === newTask.subjectName);
      const apiTask = await createTask({
        title: newTask.title,
        subject_id: matchedSubject?.id.startsWith('sub_') ? matchedSubject.id : undefined,
        priority: newTask.priority === 'high' ? 5 : newTask.priority === 'medium' ? 3 : 1,
        status: newTask.status,
        due_date: newTask.dueDate && newTask.dueDate !== 'Flexible' ? new Date(newTask.dueDate).toISOString() : undefined,
        estimated_minutes: newTask.estimatedMinutes,
      });
      if (apiTask) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: apiTask.id } : t)));
      }
    }
  };

  const handleAddSubject = async (newSub: Omit<Subject, 'id'>) => {
    const tempId = `sub_${Date.now()}`;
    const subject: Subject = {
      ...newSub,
      id: tempId,
    };
    setSubjects((prev) => [...prev, subject]);

    if (currentUser) {
      const apiSub = await createSubject({
        name: newSub.name,
        code: newSub.code,
        semester: newSub.semester,
        color_theme: newSub.colorTheme,
      });
      if (apiSub) {
        setSubjects((prev) => prev.map((s) => (s.id === tempId ? { ...s, id: apiSub.id } : s)));
      }
    }
  };

  const handleRateTopic = async (topicId: string, level: TopicLevel) => {
    setTopicsDS((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              level,
              lastReviewedDaysAgo: 0, // Reset: Reviewed today!
              stabilityDays:
                level === 'strong'
                  ? Math.min(21, t.stabilityDays * 2.5)
                  : level === 'okay'
                  ? t.stabilityDays * 1.5
                  : Math.max(1.0, t.stabilityDays * 0.5),
            }
          : t
      )
    );

    if (currentUser && level !== 'unrated') {
      const ratingMap: Record<'strong' | 'okay' | 'weak', 'easy' | 'good' | 'fail'> = {
        strong: 'easy',
        okay: 'good',
        weak: 'fail',
      };
      await submitTopicReview(topicId, ratingMap[level], level);
    }
  };

  const handleRateAllTopics = (level: TopicLevel) => {
    setTopicsDS((prev) =>
      prev.map((t) => ({
        ...t,
        level,
        lastReviewedDaysAgo: 0,
        stabilityDays:
          level === 'strong'
            ? 21
            : level === 'okay'
            ? 7
            : 2,
      }))
    );
  };

  const handleAddExtractedSubject = (name: string, code: string, _unitsCount: number, topicsCount: number) => {
    const sub: Subject = {
      id: `sub_${Date.now()}`,
      name,
      code,
      progress: 20,
      completedTopics: Math.round(topicsCount * 0.2),
      totalTopics: topicsCount,
      semester: 'current',
      iconType: 'chip',
      colorTheme: 'sky',
    };
    setSubjects((prev) => [sub, ...prev]);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentView('login');
  };

  const handleSaveProfile = (updated: {
    name: string;
    college: string;
    semester: string;
    dailyStudyMinutes: number;
    studyReminders: boolean;
  }) => {
    setProfileOverrides({
      name: updated.name,
      college: updated.college,
      semester: updated.semester,
      dailyStudyMinutes: updated.dailyStudyMinutes,
      studyReminders: updated.studyReminders,
    });
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name: updated.name,
      });
    }
  };

  // Open settings modal if navigate('settings') is triggered
  useEffect(() => {
    if (currentView === 'settings') {
      setIsSettingsOpen(true);
      setCurrentView('dashboard');
    }
  }, [currentView]);

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  const activeUserProfile: UserProfile = {
    id: currentUser?.id || 'usr_guest',
    name: profileOverrides.name || currentUser?.name || 'Muthubalamurugan',
    email: currentUser?.email || 'muthubalamurugan@gmail.com',
    college: profileOverrides.college,
    semester: profileOverrides.semester,
    dailyStudyMinutes: profileOverrides.dailyStudyMinutes,
  };

  if (isAuthChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="clay-card-flat" style={{ padding: '24px 36px', borderRadius: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Loading Student OS...
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Checking secure session
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated and not explicitly on signup, display login
  const isAuthView = currentView === 'login' || currentView === 'signup';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Unauthenticated Auth Views */}
      {(!currentUser && currentView !== 'signup') || currentView === 'login' ? (
        <div style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <LoginPage
            onNavigate={setCurrentView}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setCurrentView('dashboard');
            }}
          />
        </div>
      ) : currentView === 'signup' ? (
        <div style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <SignUpPage
            onNavigate={setCurrentView}
            onSignUpSuccess={(user) => {
              setCurrentUser(user);
              setCurrentView('dashboard');
            }}
          />
        </div>
      ) : (
        /* Protected Authenticated App Shell */
        <div
          style={{
            display: 'flex',
            maxWidth: '1520px',
            margin: '0 auto',
            width: '100%',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Left Desktop Sidebar */}
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            onLogout={handleLogout}
            onOpenSettings={() => setIsSettingsOpen(true)}
            userName={activeUserProfile.name}
          />

          {/* Main Content Area */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Top Bar with Search & Quick Screen Switcher */}
            <Navbar
              currentView={currentView}
              onNavigate={setCurrentView}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
              onLogout={handleLogout}
              onOpenSettings={() => setIsSettingsOpen(true)}
              userName={activeUserProfile.name}
            />

            {/* View Dispatcher */}
            {currentView === 'dashboard' && (
              <DashboardView
                user={activeUserProfile}
                schedule={schedule}
                onToggleSchedule={handleToggleSchedule}
                onNavigate={setCurrentView}
                onOpenAddTask={() => setIsAddTaskOpen(true)}
                onOpenAddSubject={() => setIsAddSubjectOpen(true)}
                pendingTasksCount={pendingTasksCount}
                subjectsCount={subjects.length}
              />
            )}

            {currentView === 'subjects' && (
              <SubjectsView
                subjects={subjects}
                onOpenAddSubject={() => setIsAddSubjectOpen(true)}
                onNavigate={setCurrentView}
                onSelectSubjectForReadiness={(subId) => setSelectedSubjectId(subId)}
              />
            )}

            {currentView === 'tasks' && (
              <TasksView
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onOpenAddTask={() => setIsAddTaskOpen(true)}
              />
            )}

            {currentView === 'readiness' && (
              <ExamReadinessView
                topics={topicsDS}
                onRateTopic={handleRateTopic}
                onRateAllTopics={handleRateAllTopics}
                onNavigate={setCurrentView}
                selectedSubjectId={selectedSubjectId}
              />
            )}

            {currentView === 'syllabus-ai' && (
              <SyllabusAIView
                onNavigate={setCurrentView}
                onAddExtractedSubject={handleAddExtractedSubject}
              />
            )}

            {currentView === 'prototype' && <PrototypeHub onNavigate={setCurrentView} />}

            {currentView === 'mobile-preview' && (
              <MobilePreviewView
                user={activeUserProfile}
                subjects={subjects}
                schedule={schedule}
                pendingTasksCount={pendingTasksCount}
              />
            )}
          </main>
        </div>
      )}

      {/* Modals */}
      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        onAddSubject={handleAddSubject}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAddTask={handleAddTask}
        subjectNames={subjects.map((s) => s.name)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={activeUserProfile}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onSaveProfile={handleSaveProfile}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
