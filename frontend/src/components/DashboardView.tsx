import React from 'react';
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
} from 'lucide-react';
import { ScreenView, ScheduleItem, UserProfile } from '../types';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Hero Welcome Banner Card matching reference panel 4 */}
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
            {greeting}, {user.name}! <span style={{ fontSize: '28px' }}>👋</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Stay consistent, keep going.
          </p>
        </div>

        {/* Date Clay Badge */}
        <div
          className="clay-card-flat"
          style={{
            padding: '12px 20px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            zIndex: 2,
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
            2
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
            Upcoming Exams
          </div>
        </div>

        {/* Metric 4: Overall Progress */}
        <div
          className="clay-card-flat"
          onClick={() => onNavigate('analytics')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--mint-text)', lineHeight: 1 }}>
            78%
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
            Overall Progress
          </div>
        </div>
      </div>

      {/* Hero "Next Best Action" Card (from BUILD_GUIDE.md Section 6.4) */}
      <div
        className="clay-card"
        style={{
          padding: '20px 24px',
          borderLeft: '5px solid #0F766E',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              className="clay-pill-mint"
              style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px' }}
            >
              Next Best Action
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated: 45 min</span>
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Revise AVL Tree Rotations & Deletions (Data Structures)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <strong>Why:</strong> Internal exam in 5 days • Topic retention score dropped to 42% (below 70% threshold) • High exam weightage unit.
          </p>
        </div>

        <button
          onClick={() => onNavigate('readiness')}
          className="clay-btn clay-btn-dark"
          style={{ height: '42px', padding: '0 20px', fontSize: '13px' }}
        >
          Start Session <ArrowRight size={15} />
        </button>
      </div>

      {/* Two Columns: Schedule & Quick Actions matching reference panel 4 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px',
        }}
      >
        {/* Left Column: Today's Schedule */}
        <div className="clay-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Today's Schedule
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {schedule.filter((s) => s.completed).length} of {schedule.length} completed
              </span>
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Timeline List */}
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
                  {/* Timeline status indicator */}
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

                  {/* Time Badge */}
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

                  {/* Title & Category */}
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

                  {/* Check icon */}
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
        </div>

        {/* Right Column: Quick Actions */}
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

            {/* Action 3: Syllabus AI Extractor */}
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
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Syllabus AI
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-extract topics</div>
              </div>
            </button>

            {/* Action 4: Open Study Plan */}
            <button
              onClick={() => onNavigate('planner')}
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
                <CalendarIcon size={22} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Study Plan
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Calendar schedule</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
