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
import { SyllabusAIView } from './components/SyllabusAIView';
import { PrototypeHub } from './prototype/PrototypeHub';
import { AddSubjectModal } from './components/AddSubjectModal';
import { AddTaskModal } from './components/AddTaskModal';
import { AddExamModal } from './components/AddExamModal';
import { SettingsModal } from './components/SettingsModal';
import { MobileDrawer } from './components/MobileDrawer';
import { PrivacyModal } from './components/PrivacyModal';
import { ExamPassModal } from './components/ExamPassModal';
import {
  API_BASE_URL,
  getMe,
  logoutUser,
  UserAuthResponse,
  fetchSubjects,
  createSubject,
  deleteSubject,
  fetchTasks,
  fetchSubjectDetails,
  createTask,
  updateTask,
  deleteTask,
  submitTopicReview,
  updateUserProfile,
  fetchExams,
  ApiExam,
} from './lib/api';

// Local storage review helpers for offline-first & refresh persistence
interface StoredTopicReview {
  level: TopicLevel;
  lastReviewedDaysAgo: number;
  stabilityDays: number;
  reviewedAt: number; // ms timestamp
}

const getStoredTopicReviews = (userId?: string): Record<string, StoredTopicReview> => {
  try {
    if (userId) {
      const userRaw = localStorage.getItem(`student_os_topic_reviews_${userId}`);
      if (userRaw) return JSON.parse(userRaw);
    }
    const defaultRaw = localStorage.getItem('student_os_topic_reviews_default');
    return defaultRaw ? JSON.parse(defaultRaw) : {};
  } catch {
    return {};
  }
};

const saveStoredTopicReviews = (reviews: Record<string, StoredTopicReview>, userId?: string) => {
  try {
    const raw = JSON.stringify(reviews);
    if (userId) {
      localStorage.setItem(`student_os_topic_reviews_${userId}`, raw);
    }
    localStorage.setItem('student_os_topic_reviews_default', raw);
  } catch {
    // ignore quota
  }
};

const applyStoredReviewsToTopics = (
  topics: TopicItem[],
  userId?: string
): TopicItem[] => {
  const stored = getStoredTopicReviews(userId);
  if (!stored || Object.keys(stored).length === 0) return topics;

  const now = Date.now();
  return topics.map((t) => {
    const record = stored[t.id];
    if (!record) return t;

    const daysElapsed = Math.max(0, Math.floor((now - record.reviewedAt) / 86400000));
    return {
      ...t,
      level: record.level,
      lastReviewedDaysAgo: daysElapsed,
      stabilityDays: record.stabilityDays,
    };
  });
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ScreenView>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Auth User State (managed via real API)
  const [currentUser, setCurrentUser] = useState<UserAuthResponse | null>(null);

  // Core App State (Isolated strictly per authenticated student)
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [topicsDS, setTopicsDS] = useState<TopicItem[]>(() =>
    applyStoredReviewsToTopics(initialTopicsDS)
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState<boolean>(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState<boolean>(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [isExamPassOpen, setIsExamPassOpen] = useState<boolean>(false);
  const [isProUser, setIsProUser] = useState<boolean>(false);

  // Customizable Student Profile Overrides
  const [profileOverrides, setProfileOverrides] = useState<{
    name?: string;
    college: string;
    semester: string;
    dailyStudyMinutes: number;
    studyReminders: boolean;
  }>({
    college: 'Engineering College',
    semester: 'Current Semester',
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

  // Reset all student data to prevent cross-account data leaks
  const resetUserState = () => {
    setCurrentUser(null);
    setIsProUser(false);
    setSubjects([]);
    setTasks([]);
    setSchedule([]);
    setTopicsDS(applyStoredReviewsToTopics(initialTopicsDS));
    setSelectedSubjectId('');
    setProfileOverrides({
      college: 'Engineering College',
      semester: 'Current Semester',
      dailyStudyMinutes: 180,
      studyReminders: true,
    });
  };

  // Load topics for a given subject from API (or fall back to curriculum topics)
  const loadSubjectTopics = async (subjectId?: string, currentSubs?: Subject[]) => {
    const list = currentSubs || subjects;
    const targetId = subjectId || selectedSubjectId || (list.length > 0 ? list[0].id : '');

    if (targetId) {
      try {
        const detail = await fetchSubjectDetails(targetId);
        if (detail && detail.units && detail.units.length > 0) {
          const mappedTopics: TopicItem[] = [];
          const stored = getStoredTopicReviews(currentUser?.id);
          const now = Date.now();

          detail.units.forEach((u) => {
            (u.topics || []).forEach((t) => {
              // 1. First priority: DB review snapshot if reviewed
              let level: TopicItem['level'] = 'unrated';
              let lastReviewedDaysAgo = 99;
              let stabilityDays = 2.0;

              if (t.self_level === 'strong' || t.self_level === 'okay' || t.self_level === 'weak') {
                level = t.self_level;
                lastReviewedDaysAgo = t.days_since_review != null ? Math.round(t.days_since_review) : 0;
                stabilityDays = t.stability_days ?? 2.0;
              } else if (stored[t.id]) {
                // 2. Second priority: Local storage override
                const rec = stored[t.id];
                level = rec.level;
                lastReviewedDaysAgo = Math.max(0, Math.floor((now - rec.reviewedAt) / 86400000));
                stabilityDays = rec.stabilityDays;
              }

              mappedTopics.push({
                id: t.id,
                unitId: u.id,
                unitName: u.name,
                name: t.name,
                importance: t.importance ?? 0.8,
                difficulty: t.difficulty ?? 3,
                level,
                lastReviewedDaysAgo,
                stabilityDays,
              });
            });
          });
          if (mappedTopics.length > 0) {
            setTopicsDS(mappedTopics);
            setSelectedSubjectId(targetId);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load topics for subject:', err);
      }
    }

    // Fallback: If Data Structures or empty, provide curriculum topics
    const subObj = list.find((s) => s.id === targetId);
    if (!subObj || subObj.name.toLowerCase().includes('data structure')) {
      const enriched = applyStoredReviewsToTopics(initialTopicsDS, currentUser?.id);
      setTopicsDS(enriched);
    } else {
      setTopicsDS([]);
    }
    if (targetId) setSelectedSubjectId(targetId);
  };

  // Reusable loader for the authenticated student's real database records
  const loadUserData = async (user: UserAuthResponse) => {
    setCurrentUser(user);
    setIsProUser(Boolean(user.is_pro));
    setProfileOverrides({
      name: user.name,
      college: user.college || 'Engineering College',
      semester: user.semester || 'Current Semester',
      dailyStudyMinutes: user.daily_study_minutes || 180,
      studyReminders: true,
    });

    try {
      const [apiSubs, apiTasks, apiExams] = await Promise.all([fetchSubjects(), fetchTasks(), fetchExams()]);
      setExams(apiExams);
      const formattedSubs: Subject[] = apiSubs.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        progress: 0,
        completedTopics: 0,
        totalTopics: s.topics_count || 15,
        semester: s.semester || 'current',
        iconType: 'chip',
        colorTheme: (s.color_theme as any) || 'sky',
      }));
      setSubjects(formattedSubs);

      setTasks(
        apiTasks.map((t) => ({
          id: t.id,
          title: t.title,
          subjectName: t.subject_name || 'General',
          priority: t.priority >= 4 ? 'high' : t.priority >= 3 ? 'medium' : 'low',
          dueDate: t.due_date
            ? new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Flexible',
          status: t.status as any,
          estimatedMinutes: t.estimated_minutes,
        }))
      );

      const firstId = formattedSubs.length > 0 ? formattedSubs[0].id : '';
      setSelectedSubjectId(firstId);
      await loadSubjectTopics(firstId, formattedSubs);
      setSchedule([]);
    } catch (err) {
      console.error('Failed to load student data:', err);
      setSubjects([]);
      setTasks([]);
      setSchedule([]);
      setTopicsDS(applyStoredReviewsToTopics(initialTopicsDS, user.id));
    }
  };

  // Check auth session on mount (/api/me) & load real student data
  useEffect(() => {
    let isMounted = true;

    // Proactively warm up backend on free tier in background so login/register is instant
    fetch(`${API_BASE_URL}/api/health`, { method: 'GET' }).catch(() => {});

    // If no session token exists, stay on login page immediately
    const token = localStorage.getItem('student_os_jwt');
    if (!token) {
      resetUserState();
      return;
    }

    const checkSession = async () => {
      try {
        const userRes = await getMe(2500);
        if (isMounted) {
          if (userRes) {
            await loadUserData(userRes);
          } else {
            resetUserState();
          }
        }
      } catch {
        if (isMounted) resetUserState();
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

  const handleAddSubject = async (newSub: Omit<Subject, 'id'>): Promise<{ ok: boolean; error?: string }> => {
    if (currentUser) {
      const res = await createSubject({
        name: newSub.name,
        code: newSub.code,
        semester: newSub.semester,
        color_theme: newSub.colorTheme,
      });

      if (!res.ok || !res.data) {
        if (res.status === 401) {
          return {
            ok: false,
            error: 'Your session has expired. Please log in again to save subjects.',
          };
        }
        return {
          ok: false,
          error: res.error || 'Failed to create subject in database.',
        };
      }

      const subject: Subject = {
        ...newSub,
        id: res.data.id,
      };
      setSubjects((prev) => [...prev, subject]);
      return { ok: true };
    } else {
      const subject: Subject = {
        ...newSub,
        id: `sub_${Date.now()}`,
      };
      setSubjects((prev) => [...prev, subject]);
      return { ok: true };
    }
  };

  const handleRateTopic = async (topicId: string, level: TopicLevel) => {
    let computedStability = level === 'strong' ? 21 : level === 'okay' ? 7 : 2;

    setTopicsDS((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        computedStability =
          level === 'strong'
            ? Math.min(21, t.stabilityDays * 2.5)
            : level === 'okay'
            ? t.stabilityDays * 1.5
            : Math.max(1.0, t.stabilityDays * 0.5);
        return {
          ...t,
          level,
          lastReviewedDaysAgo: 0, // Reset: Reviewed today!
          stabilityDays: computedStability,
        };
      })
    );

    // 1. Immediately persist to localStorage so ratings strictly survive refresh
    const currentReviews = getStoredTopicReviews(currentUser?.id);
    currentReviews[topicId] = {
      level,
      lastReviewedDaysAgo: 0,
      stabilityDays: computedStability,
      reviewedAt: Date.now(),
    };
    saveStoredTopicReviews(currentReviews, currentUser?.id);

    // 2. Persist to DB if authenticated and topic exists in backend
    if (currentUser && level !== 'unrated') {
      const ratingMap: Record<'strong' | 'okay' | 'weak', 'easy' | 'good' | 'fail'> = {
        strong: 'easy',
        okay: 'good',
        weak: 'fail',
      };
      await submitTopicReview(topicId, ratingMap[level], level);
    }
  };

  const handleRateAllTopics = async (level: TopicLevel) => {
    const defaultStability =
      level === 'strong'
        ? 21
        : level === 'okay'
        ? 7
        : 2;

    let targetTopicList: TopicItem[] = [];
    setTopicsDS((prev) => {
      targetTopicList = prev.map((t) => ({
        ...t,
        level,
        lastReviewedDaysAgo: 0,
        stabilityDays: defaultStability,
      }));
      return targetTopicList;
    });

    // 1. Immediately persist all to localStorage so ratings strictly survive refresh
    const currentReviews = getStoredTopicReviews(currentUser?.id);
    const now = Date.now();
    targetTopicList.forEach((t) => {
      currentReviews[t.id] = {
        level,
        lastReviewedDaysAgo: 0,
        stabilityDays: defaultStability,
        reviewedAt: now,
      };
    });
    saveStoredTopicReviews(currentReviews, currentUser?.id);

    // 2. Persist each topic review to DB so ratings survive refresh
    if (currentUser && level !== 'unrated') {
      const ratingMap: Record<'strong' | 'okay' | 'weak', 'easy' | 'good' | 'fail'> = {
        strong: 'easy',
        okay: 'good',
        weak: 'fail',
      };
      for (const t of targetTopicList) {
        await submitTopicReview(t.id, ratingMap[level], level);
      }
    }
  };

  const handleAddExtractedSubject = async (
    subjectId: string,
    name: string,
    code: string,
    unitsCount: number,
    topicsCount: number,
    unitsTree?: any[]
  ) => {
    // 1. Immediately map the extracted units & topics to TopicItem[] so they appear instantly
    if (unitsTree && unitsTree.length > 0) {
      const extractedTopics: TopicItem[] = [];
      unitsTree.forEach((u, uIdx) => {
        (u.topics || []).forEach((t: any, tIdx: number) => {
          extractedTopics.push({
            id: t.id || `ext_top_${uIdx}_${tIdx}_${Date.now()}`,
            unitId: u.id || `ext_unit_${uIdx}`,
            unitName: u.name || `Unit ${uIdx + 1}`,
            name: t.name,
            importance: t.importance ?? 0.8,
            difficulty: t.difficulty ?? 3,
            level: 'unrated',
            lastReviewedDaysAgo: 99,
            stabilityDays: 2.0,
          });
        });
      });
      if (extractedTopics.length > 0) {
        setTopicsDS(extractedTopics);
      }
    }

    // 2. Refresh subjects list from database
    try {
      const apiSubs = await fetchSubjects();
      setSubjects(
        apiSubs.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          progress: 20,
          completedTopics: 0,
          totalTopics: s.topics_count || topicsCount,
          semester: s.semester || 'current',
          iconType: 'chip',
          colorTheme: (s.color_theme as any) || 'sky',
        }))
      );
    } catch {
      const sub: Subject = {
        id: subjectId || `sub_${Date.now()}`,
        name,
        code,
        progress: 20,
        completedTopics: 0,
        totalTopics: topicsCount,
        semester: 'current',
        iconType: 'chip',
        colorTheme: 'sky',
      };
      setSubjects((prev) => [sub, ...prev]);
    }

    if (subjectId) {
      setSelectedSubjectId(subjectId);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    resetUserState();
    setCurrentView('login');
  };

  const handleSaveProfile = async (updated: {
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
      try {
        const savedUser = await updateUserProfile({
          name: updated.name,
          daily_study_minutes: updated.dailyStudyMinutes,
          college: updated.college,
          semester: updated.semester,
        });
        if (savedUser) {
          setCurrentUser(savedUser);
        } else {
          setCurrentUser((prev) =>
            prev
              ? {
                  ...prev,
                  name: updated.name,
                  daily_study_minutes: updated.dailyStudyMinutes,
                  college: updated.college,
                  semester: updated.semester,
                }
              : null
          );
        }
      } catch (err) {
        console.error('Failed to update student profile on server:', err);
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                name: updated.name,
                daily_study_minutes: updated.dailyStudyMinutes,
              }
            : null
        );
      }
    }
  };

  // Open settings modal if navigate('settings') is triggered
  useEffect(() => {
    if (currentView === 'settings') {
      setIsSettingsOpen(true);
      setCurrentView('dashboard');
    }
  }, [currentView]);

  // Whenever view switches to 'readiness', ensure topics are loaded
  useEffect(() => {
    if (currentView === 'readiness' && topicsDS.length === 0) {
      loadSubjectTopics(selectedSubjectId);
    }
  }, [currentView, selectedSubjectId]);

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  const activeUserProfile: UserProfile = {
    id: currentUser?.id || 'usr_guest',
    name: currentUser?.name || profileOverrides.name || 'Student',
    email: currentUser?.email || 'student@example.com',
    college: profileOverrides.college || 'Engineering College',
    semester: profileOverrides.semester || 'Current Semester',
    dailyStudyMinutes: currentUser?.daily_study_minutes || profileOverrides.dailyStudyMinutes || 180,
  };

  // If not authenticated and not explicitly on signup, display login
  const isAuthView = currentView === 'login' || currentView === 'signup';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Unauthenticated Auth Views */}
      {(!currentUser && currentView !== 'signup') || currentView === 'login' ? (
        <div style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <LoginPage
            onNavigate={setCurrentView}
            onLoginSuccess={async (user) => {
              await loadUserData(user);
              setCurrentView('dashboard');
            }}
          />
        </div>
      ) : currentView === 'signup' ? (
        <div style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <SignUpPage
            onNavigate={setCurrentView}
            onSignUpSuccess={async (user) => {
              await loadUserData(user);
              setCurrentView('dashboard');
            }}
          />
        </div>
      ) : (
        /* Protected Authenticated App Shell */
        <div
          className="app-shell-container"
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
            onOpenPrivacy={() => setIsPrivacyOpen(true)}
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
                subjects={subjects}
                exams={exams}
                selectedExamId={selectedExamId}
                onSelectExam={setSelectedExamId}
                onRateTopic={handleRateTopic}
                onRateAllTopics={handleRateAllTopics}
                onNavigate={setCurrentView}
                selectedSubjectId={selectedSubjectId}
                onSelectSubject={(subId) => {
                  setSelectedSubjectId(subId);
                  setSelectedExamId('all');
                  loadSubjectTopics(subId);
                }}
                onOpenAddExam={() => setIsAddExamOpen(true)}
              />
            )}

            {currentView === 'syllabus-ai' && (
              <SyllabusAIView
                onNavigate={setCurrentView}
                onAddExtractedSubject={handleAddExtractedSubject}
              />
            )}

            {currentView === 'prototype' && <PrototypeHub onNavigate={setCurrentView} />}
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

      <AddExamModal
        isOpen={isAddExamOpen}
        onClose={() => setIsAddExamOpen(false)}
        subjects={subjects}
        topics={topicsDS}
        defaultSubjectId={selectedSubjectId}
        onExamCreated={(newExam) => {
          if (newExam) {
            setExams((prev) => [newExam, ...prev.filter((e) => e.id !== newExam.id)]);
            setSelectedExamId(newExam.id);
          }
          loadSubjectTopics(selectedSubjectId);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={activeUserProfile}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onSaveProfile={handleSaveProfile}
        onLogout={handleLogout}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onAccountDeleted={() => {
          setCurrentUser(null);
          setSubjects([]);
          setTasks([]);
          setSchedule([]);
          setTopicsDS([]);
          setCurrentView('dashboard');
        }}
      />

      {/* Mobile / Tablet Responsive Navigation Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        userName={activeUserProfile.name}
      />

      {/* Phase 9 Privacy & Terms Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onOpenDeleteAccount={() => setIsSettingsOpen(true)}
      />
    </div>
  );
};

export default App;
