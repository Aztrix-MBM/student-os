import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  PlusCircle,
  BookOpen,
  Sparkles,
  ArrowRight,
  MoreVertical,
  Flame,
  CheckSquare,
  AlertCircle,
  X,
  ChevronRight,
  GraduationCap,
  TrendingUp,
  RotateCcw,
  Check,
  Shield,
} from 'lucide-react';
import { ScreenView, ScheduleItem, UserProfile } from '../types';
import {
  fetchTodayPlan,
  acceptRecommendation,
  dismissRecommendation,
  togglePlanItem,
  updateTask,
  submitTopicReview,
  fetchStreak,
  ApiTodayPlan,
  ApiPlanItem,
  ApiUpcomingExam,
  ApiStreak,
} from '../lib/api';


interface DashboardViewProps {
  user: UserProfile;
  schedule: ScheduleItem[];
  onToggleSchedule: (id: string) => void;
  onNavigate: (view: ScreenView) => void;
  onOpenAddTask: () => void;
  onOpenAddSubject: () => void;
  pendingTasksCount: number;
  subjectsCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  schedule,
  onToggleSchedule,
  onNavigate,
  onOpenAddTask,
  onOpenAddSubject,
  pendingTasksCount,
  subjectsCount,
}) => {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = dayNames[today.getDay()];
  const formattedDate = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const currentYear = today.getFullYear();

  const currentHour = today.getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Phase 7 & 8 Today Plan and Retention State
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const planStorageKey = `student_os_completed_${user.id}_${todayDateStr}`;

  const [todayPlan, setTodayPlan] = useState<ApiTodayPlan | null>(null);
  const [streak, setStreak] = useState<ApiStreak | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [completedPlanIds, setCompletedPlanIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`student_os_completed_${user.id}_${todayDateStr}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Fetch live Today Plan and Soft Streak from backend
  const loadPlan = async () => {
    try {
      setIsLoadingPlan(true);
      const [plan, streakData] = await Promise.all([fetchTodayPlan(), fetchStreak()]);
      if (plan) {
        setTodayPlan(plan);
        // Merge server completed items with local storage
        setCompletedPlanIds((prev) => {
          const merged = new Set(prev);
          (plan.plan || []).forEach((item) => {
            if (item.completed) {
              merged.add(item.id);
            }
          });
          if (plan.next_best_action?.completed) {
            merged.add(plan.next_best_action.id);
          }
          try {
            localStorage.setItem(planStorageKey, JSON.stringify(Array.from(merged)));
          } catch {
            // ignore
          }
          return merged;
        });
      }
      if (streakData) {
        setStreak(streakData);
      }
    } catch {
      // Graceful fallback to prop schedule
    } finally {
      setIsLoadingPlan(false);
    }
  };


  // Active planned minutes for today's generated schedule
  const plannedMinutes =
    todayPlan?.workload.planned_minutes ??
    (todayPlan?.plan || []).reduce((acc, item) => acc + (item.minutes || 0), 0);
  const targetMinutes = user.dailyStudyMinutes || todayPlan?.workload.available_minutes || 120;
  const backlogMinutes = todayPlan?.workload.backlog_minutes ?? todayPlan?.workload.required_minutes ?? 0;

  useEffect(() => {
    if (user.dailyStudyMinutes && todayPlan?.workload) {
      const newTarget = user.dailyStudyMinutes;
      const newMaxItems = Math.max(3, Math.min(10, Math.floor(newTarget / 25)));
      const approxPlanned = Math.min(newTarget, newMaxItems * 25);
      setTodayPlan((prev) =>
        prev
          ? {
              ...prev,
              student_daily_minutes: newTarget,
              workload: {
                ...prev.workload,
                available_minutes: newTarget,
                planned_minutes: approxPlanned,
                status:
                  prev.workload.required_minutes > newTarget * 1.5
                    ? 'overloaded'
                    : prev.workload.required_minutes > newTarget * 0.9
                    ? 'busy'
                    : 'comfortable',
              },
            }
          : null
      );
    }
    loadPlan();
  }, [user.id, user.dailyStudyMinutes]);

  // Handle recommendation dismiss
  const handleDismissRec = async (recId: string, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set(prev).add(itemId));
    await dismissRecommendation(recId);
  };

  // Handle recommendation accept
  const handleAcceptRec = async (recId: string, _itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await acceptRecommendation(recId);
    setReviewSuccessMsg('Recommendation accepted into your priority queue!');
    setTimeout(() => setReviewSuccessMsg(null), 3000);
  };

  // Handle marking a plan item completed (Task completion or Topic review)
  const handleTogglePlanItem = async (item: ApiPlanItem) => {
    const isCurrentlyDone = completedPlanIds.has(item.id) || Boolean(item.completed);
    const updated = new Set(completedPlanIds);

    if (isCurrentlyDone) {
      updated.delete(item.id);
    } else {
      updated.add(item.id);
    }
    setCompletedPlanIds(updated);

    try {
      localStorage.setItem(planStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // ignore
    }

    // Call server toggle endpoint to persist in DailyPlan / DB
    await togglePlanItem(item.id, !isCurrentlyDone);

    if (item.type === 'task' && item.id.startsWith('tsk_')) {
      await updateTask(item.id, { status: isCurrentlyDone ? 'todo' : 'completed' });
    } else if (item.type === 'topic' && !isCurrentlyDone) {
      // Mark topic reviewed with 'good' rating
      await submitTopicReview(item.id, 'good', 'okay');
      setReviewSuccessMsg(`Topic "${item.title}" reviewed! Retention stability updated.`);
      setTimeout(() => setReviewSuccessMsg(null), 3500);
    }
  };

  // Filter out any dismissed items
  const activePlanItems = (todayPlan?.plan || []).filter((item) => !dismissedIds.has(item.id));
  const activeDeferredItems = (todayPlan?.deferred || []).filter((item) => !dismissedIds.has(item.id));
  const completedCount = activePlanItems.filter((i) => completedPlanIds.has(i.id) || Boolean(i.completed)).length;
  const completionPercentage = activePlanItems.length > 0
    ? Math.min(100, Math.round((completedCount / activePlanItems.length) * 100))
    : 0;

  const nba = todayPlan?.next_best_action && !dismissedIds.has(todayPlan.next_best_action.id)
    ? todayPlan.next_best_action
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Toast banner for quick feedback */}
      {reviewSuccessMsg && (
        <div
          className="clay-card-flat animate-fade-in"
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--mint-bg)',
            color: 'var(--mint-text)',
            border: '1.5px solid var(--mint-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#179354" />
            <span>{reviewSuccessMsg}</span>
          </div>
          <button
            onClick={() => setReviewSuccessMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mint-text)' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero Welcome Banner Card */}
      <div
        className="clay-card"
        style={{
          padding: '24px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Mountain Landscape Background Overlay */}
        <div
          className="hero-mountain-banner"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '320px',
            opacity: 0.22,
            backgroundImage: 'url(/clay_mountain_banner.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--coral-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Academic Session {currentYear}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.college}</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(24px, 3.5vw, 32px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {greeting}, {user.name}!
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Stay consistent, keep going.
          </p>
        </div>

        {/* Right Badges: Date & Workload Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
          {/* Workload Status Badge (Phase 7 Specification) */}
          {todayPlan?.workload && (
            <div
              className="clay-card-flat"
              style={{
                padding: '12px 18px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: `1.5px solid ${
                  todayPlan.workload.status === 'overloaded'
                    ? 'var(--coral-border)'
                    : todayPlan.workload.status === 'busy'
                    ? 'var(--amber-border)'
                    : 'var(--mint-border)'
                }`,
                backgroundColor:
                  todayPlan.workload.status === 'overloaded'
                    ? 'var(--coral-bg)'
                    : todayPlan.workload.status === 'busy'
                    ? 'var(--amber-bg)'
                    : 'var(--mint-bg)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor:
                    todayPlan.workload.status === 'overloaded'
                      ? '#E3512B'
                      : todayPlan.workload.status === 'busy'
                      ? '#D97706'
                      : '#179354',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {todayPlan.workload.status === 'overloaded' ? (
                  <AlertCircle size={20} />
                ) : todayPlan.workload.status === 'busy' ? (
                  <Clock size={20} />
                ) : (
                  <TrendingUp size={20} />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'capitalize',
                    color:
                      todayPlan.workload.status === 'overloaded'
                        ? 'var(--coral-text)'
                        : todayPlan.workload.status === 'busy'
                        ? 'var(--amber-text)'
                        : 'var(--mint-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Workload: {todayPlan.workload.status}</span>
                  {todayPlan.workload.status === 'overloaded' && backlogMinutes > targetMinutes && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(227, 81, 43, 0.12)',
                        color: 'var(--coral-text)',
                      }}
                      title="You have a large semester syllabus backlog. The AI planner selects only what fits your daily target."
                    >
                      Backlog
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>{plannedMinutes}m planned / {targetMinutes}m target</span>
                  {backlogMinutes > targetMinutes && (
                    <span
                      style={{ marginLeft: '6px', opacity: 0.8 }}
                      title={`Total syllabus backlog: ${backlogMinutes} minutes across all unreviewed topics`}
                    >
                      ({backlogMinutes}m backlog)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Soft Streak Badge (Phase 8 Retention) */}
          {streak && (
            <div
              className="clay-card-flat"
              style={{
                padding: '12px 18px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: streak.current_streak > 0 ? '1.5px solid var(--coral-border)' : '1px solid var(--border-clay)',
                backgroundColor: streak.current_streak > 0 ? 'var(--coral-bg)' : undefined,
              }}
              title={`${streak.message}\nLongest streak: ${streak.longest_streak}d`}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: streak.current_streak > 0 ? '#E3512B' : '#64748B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Flame size={20} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: streak.current_streak > 0 ? 'var(--coral-text)' : 'var(--text-primary)',
                  }}
                >
                  {streak.current_streak > 0 ? `${streak.current_streak}-Day Streak` : 'Start Streak'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {streak.status === 'grace_applied' ? (
                    <>
                      <Shield size={12} color="#D97706" />
                      <span>Grace Day Active</span>
                    </>
                  ) : (
                    `${streak.total_active_days} active days`
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Date Clay Badge */}
          <div
            className="clay-card-flat"
            style={{
              padding: '12px 20px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--amber-bg)',
                color: 'var(--amber-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {dayName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {formattedDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nearest Exam Countdown Alert Banner (Phase 8 Specification) */}
      {(() => {
        const nearest = todayPlan?.upcoming_exams && todayPlan.upcoming_exams.length > 0
          ? todayPlan.upcoming_exams[0]
          : null;
        if (!nearest || nearest.days_to_exam > 7) return null;
        const days = Math.round(nearest.days_to_exam);
        const isUrgent = days <= 3;

        return (
          <div
            className="clay-card-flat animate-fade-in"
            style={{
              padding: '16px 22px',
              borderRadius: '20px',
              backgroundColor: isUrgent ? 'var(--coral-bg)' : 'var(--amber-bg)',
              border: `1.5px solid ${isUrgent ? 'var(--coral-border)' : 'var(--amber-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: isUrgent ? '#E3512B' : '#D97706',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '18px',
                }}
              >
                <Clock size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {nearest.title} ({nearest.subject_name}) is{' '}
                  <span style={{ color: isUrgent ? 'var(--coral-text)' : 'var(--amber-text)' }}>
                    {days <= 0 ? 'Today!' : days === 1 ? 'Tomorrow!' : `in ${days} days`}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Exam proximity boost is active in your Daily Plan. Review weak units to secure your marks!
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('readiness')}
              className="clay-btn clay-btn-dark"
              style={{ height: '38px', padding: '0 16px', fontSize: '12px', fontWeight: 700 }}
            >
              Check Exam Readiness <ArrowRight size={14} />
            </button>
          </div>
        );
      })()}


      {/* 4 Stats Metrics Row matching reference panel 4 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Metric 1: Pending Tasks */}
        <div
          className="clay-card-flat"
          onClick={() => onNavigate('tasks')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--coral-text)', lineHeight: 1 }}>
            {pendingTasksCount}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
            Pending Tasks
          </div>
        </div>

        {/* Metric 2: Subjects */}
        <div
          className="clay-card-flat"
          onClick={() => onNavigate('subjects')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {subjectsCount}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
            Subjects
          </div>
        </div>

        {/* Metric 3: Upcoming Exams */}
        <div
          className="clay-card-flat"
          onClick={() => onNavigate('readiness')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#2A79E2', lineHeight: 1 }}>
            {todayPlan?.upcoming_exams ? todayPlan.upcoming_exams.length : 0}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
            Upcoming Exams
          </div>
        </div>

        {/* Metric 4: Overall Progress */}
        <div
          className="clay-card-flat"
          onClick={() => onNavigate('readiness')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--mint-text)', lineHeight: 1 }}>
            {todayPlan ? `${completionPercentage}%` : '0%'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
            Today's Plan Done
          </div>
        </div>
      </div>

      {/* Hero "Next Best Action" Card (BUILD_GUIDE.md Section 6.4 & Phase 7) */}
      {nba ? (
        <div
          className="clay-card"
          style={{
            padding: '22px 26px',
            borderLeft: '6px solid #0F766E',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            position: 'relative',
          }}
        >
          <div style={{ maxWidth: '680px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span
                className="clay-pill-mint"
                style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.4px' }}
              >
                Next Best Action
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> {nba.minutes} min
              </span>
              {nba.subject_name && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--sky-text)',
                    backgroundColor: 'var(--sky-bg)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {nba.subject_name}
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
              {nba.title}
            </h3>

            {/* "Why" Human-readable reasons list */}
            {nba.reasons && nba.reasons.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {nba.reasons.map((r, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(15, 118, 110, 0.09)',
                      color: '#0F766E',
                      fontWeight: 600,
                    }}
                  >
                    <strong>Why:</strong> {r.value}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {nba.recommendation_id && (
              <>
                <button
                  onClick={(e) => handleDismissRec(nba.recommendation_id!, nba.id, e)}
                  title="Dismiss recommendation"
                  className="clay-card-flat"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-clay)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={15} /> Dismiss
                </button>
                <button
                  onClick={(e) => handleAcceptRec(nba.recommendation_id!, nba.id, e)}
                  title="Accept into today's priority plan"
                  className="clay-card-flat"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--mint-border)',
                    backgroundColor: 'var(--mint-bg)',
                    color: 'var(--mint-text)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={15} /> Accept
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (nba.type === 'topic') {
                  onNavigate('readiness');
                } else {
                  onNavigate('tasks');
                }
              }}
              className="clay-btn clay-btn-dark"
              style={{ height: '42px', padding: '0 20px', fontSize: '13px', fontWeight: 700 }}
            >
              {nba.type === 'topic' ? 'Start Revision' : 'Open Task'} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* Fallback / All Caught Up NBA */
        <div
          className="clay-card"
          style={{
            padding: '20px 24px',
            borderLeft: '5px solid #179354',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="clay-pill-mint" style={{ fontSize: '11px', fontWeight: 800 }}>
                Next Best Action
              </span>
              <span style={{ fontSize: '12px', color: 'var(--mint-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                All Clear
              </span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              You're ahead of schedule today! No urgent topics or overdue tasks.
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Feel free to revise any unreviewed topics or take a well-deserved rest.
            </p>
          </div>
          <button
            onClick={() => onNavigate('readiness')}
            className="clay-btn clay-btn-dark"
            style={{ height: '40px', padding: '0 18px', fontSize: '13px' }}
          >
            Review Topics <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Two Columns: Dynamic Today Study Plan & Quick Actions / Exams */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '22px',
        }}
      >
        {/* Left Column: Today's Generated Study Plan */}
        <div className="clay-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Today's Study Plan
                </h2>
                {todayPlan && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--lavender-bg)',
                      color: 'var(--lavender-text)',
                    }}
                  >
                    AI Planned
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {todayPlan
                  ? `${completedCount} of ${activePlanItems.length} items completed (${completionPercentage}%)`
                  : `${schedule.filter((s) => s.completed).length} of ${schedule.length} completed`}
              </span>
            </div>

            <button
              onClick={loadPlan}
              title="Refresh Today Plan"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
            >
              <RotateCcw size={17} />
            </button>
          </div>

          {/* Dynamic Plan Items from API */}
          {todayPlan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activePlanItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  {subjectsCount === 0 ? (
                    <>
                      <Sparkles size={36} color="#0F766E" style={{ margin: '0 auto 12px auto' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Welcome! Let's set up your semester
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '6px auto 16px auto', lineHeight: 1.5 }}>
                        Add your semester subjects or extract a syllabus PDF to generate your personalized AI study schedule.
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={onOpenAddSubject}
                          className="clay-btn clay-btn-dark"
                          style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '12px' }}
                        >
                          + Add Subject
                        </button>
                        <button
                          onClick={() => onNavigate('syllabus-ai')}
                          className="clay-btn clay-btn-light"
                          style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '12px' }}
                        >
                          Import Syllabus
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={36} color="#179354" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        All done for today!
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        Great consistency! Check Exam Readiness or relax.
                      </div>
                    </>
                  )}
                </div>
              ) : (
                activePlanItems.map((item) => {
                  const isDone = completedPlanIds.has(item.id) || Boolean(item.completed);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleTogglePlanItem(item)}
                      className="clay-card-flat schedule-item-row"
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        opacity: isDone ? 0.65 : 1,
                        transition: 'opacity 0.2s ease, transform 0.15s ease',
                        border: isDone ? '1px dashed var(--border-clay)' : '1px solid var(--border-clay)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Checkbox */}
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '7px',
                              border: isDone ? 'none' : '2px solid var(--border-clay)',
                              backgroundColor: isDone ? '#179354' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              flexShrink: 0,
                            }}
                          >
                            {isDone && <Check size={15} />}
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: isDone ? 'line-through' : 'none',
                              }}
                            >
                              {item.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  color: item.type === 'topic' ? 'var(--lavender-text)' : 'var(--coral-text)',
                                }}
                              >
                                {item.type === 'topic' ? 'Topic Revision' : 'Assignment Task'}
                              </span>
                              {item.subject_name && (
                                <>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>•</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {item.subject_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Duration pill */}
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Clock size={13} /> {item.minutes}m
                        </div>
                      </div>

                      {/* "Why" reasons pills */}
                      {item.reasons && item.reasons.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginLeft: '34px' }}>
                          {item.reasons.map((r, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(15, 118, 110, 0.08)',
                                color: '#0F766E',
                              }}
                            >
                              <strong>Why:</strong> {r.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Overloaded Schedule Notice & Deferred items banner */}
              {activeDeferredItems.length > 0 && (
                <div
                  className="clay-card-flat"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--coral-bg)',
                    border: '1.5px solid var(--coral-border)',
                    marginTop: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <AlertCircle size={16} color="#E3512B" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--coral-text)' }}>
                      Deferred to Tomorrow ({activeDeferredItems.length} items)
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                    To prevent study burnout, these lower-urgency candidates were postponed to fit your daily study budget.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeDeferredItems.map((def) => (
                      <div
                        key={def.id}
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>• {def.title}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{def.minutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : schedule.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '13px', margin: 0 }}>No study tasks scheduled yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {schedule.map((item, index) => {
                const isLast = index === schedule.length - 1;
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleSchedule(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="schedule-item-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <div
                        className="timeline-dot"
                        style={{
                          backgroundColor:
                            item.dotColor === 'green'
                              ? '#179354'
                              : item.dotColor === 'blue'
                              ? '#2A79E2'
                              : item.dotColor === 'coral'
                              ? '#E3512B'
                              : '#64748B',
                        }}
                      />
                      {!isLast && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '6px',
                            top: '14px',
                            bottom: '-28px',
                            width: '2px',
                            backgroundColor: 'var(--border-subtle)',
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        minWidth: '78px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {item.time}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: item.completed ? 'line-through' : 'none',
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {item.category}
                      </div>
                    </div>

                    <div>
                      {item.completed ? (
                        <CheckCircle2 size={18} color="#179354" />
                      ) : (
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '9999px',
                            border: '2px solid var(--border-clay)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Exams & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Upcoming Exams Countdown Section */}
          {todayPlan?.upcoming_exams && todayPlan.upcoming_exams.length > 0 && (
            <div className="clay-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={20} color="#2A79E2" />
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Upcoming Exams
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('readiness')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2A79E2',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  Readiness <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayPlan.upcoming_exams.map((ex) => {
                  const daysLeft = Math.round(ex.days_to_exam);
                  const isUrgent = daysLeft <= 3;
                  return (
                    <div
                      key={ex.id}
                      onClick={() => onNavigate('readiness')}
                      className="clay-card-flat"
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        border: isUrgent ? '1px solid var(--coral-border)' : '1px solid var(--border-clay)',
                        backgroundColor: isUrgent ? 'var(--coral-bg)' : undefined,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ex.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {ex.subject_name} • {ex.type}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          backgroundColor: isUrgent ? '#E3512B' : '#2A79E2',
                          color: '#FFFFFF',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {daysLeft <= 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="clay-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px' }}>
              Quick Actions
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Action 1: Add Task */}
              <button
                onClick={onOpenAddTask}
                className="clay-card-flat"
                style={{
                  padding: '20px 16px',
                  textAlign: 'left',
                  border: '1px solid var(--border-clay)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  className="clay-icon-pod"
                  style={{
                    backgroundColor: 'var(--coral-bg)',
                    color: 'var(--coral-text)',
                    border: '1px solid var(--coral-border)',
                  }}
                >
                  <PlusCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Add Task
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Track assignment</div>
                </div>
              </button>

              {/* Action 2: Add Subject */}
              <button
                onClick={onOpenAddSubject}
                className="clay-card-flat"
                style={{
                  padding: '20px 16px',
                  textAlign: 'left',
                  border: '1px solid var(--border-clay)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  className="clay-icon-pod"
                  style={{
                    backgroundColor: 'var(--sky-bg)',
                    color: 'var(--sky-text)',
                    border: '1px solid var(--sky-border)',
                  }}
                >
                  <BookOpen size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Add Subject
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semester course</div>
                </div>
              </button>

              {/* Action 3: Syllabus Import Extractor */}
              <button
                onClick={() => onNavigate('syllabus-ai')}
                className="clay-card-flat"
                style={{
                  padding: '20px 16px',
                  textAlign: 'left',
                  border: '1px solid var(--border-clay)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  className="clay-icon-pod"
                  style={{
                    backgroundColor: 'var(--lavender-bg)',
                    color: 'var(--lavender-text)',
                    border: '1px solid var(--lavender-border)',
                  }}
                >
                  <BookOpen size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Import Syllabus
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Import & extract topics</div>
                </div>
              </button>

              {/* Action 4: Exam Readiness */}
              <button
                onClick={() => onNavigate('readiness')}
                className="clay-card-flat"
                style={{
                  padding: '20px 16px',
                  textAlign: 'left',
                  border: '1px solid var(--border-clay)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  className="clay-icon-pod"
                  style={{
                    backgroundColor: 'var(--mint-bg)',
                    color: 'var(--mint-text)',
                    border: '1px solid var(--mint-border)',
                  }}
                >
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Exam Readiness
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mastery & weak units</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
