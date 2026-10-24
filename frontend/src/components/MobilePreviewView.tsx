import React, { useState } from 'react';
import {
  Home,
  GraduationCap,
  CheckSquare,
  User,
  Search,
  Bell,
  Cpu,
  Monitor,
  Network,
  Code,
  Compass,
  Zap,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { UserProfile, Subject, ScheduleItem } from '../types';

interface MobilePreviewViewProps {
  user: UserProfile;
  subjects: Subject[];
  schedule: ScheduleItem[];
  pendingTasksCount: number;
}

export const MobilePreviewView: React.FC<MobilePreviewViewProps> = ({
  user,
  subjects,
  schedule,
  pendingTasksCount,
}) => {
  const [mobileTab, setMobileTab] = useState<'home' | 'subjects' | 'tasks' | 'profile'>('home');

  const today = new Date();
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayName = dayNames[today.getDay()];
  const formattedDate = `${today.getDate()} ${monthNames[today.getMonth()]}`;

  const currentHour = today.getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }} className="animate-fade-in">
      {/* Title & Info Banner */}
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Mobile Responsive View
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Exact 390px mobile view with claymorphism touch targets & bottom navigation (matching reference panel 11).
        </p>
      </div>

      {/* Screen Mode Switcher Pills */}
      <div className="clay-tab-bar">
        <button
          onClick={() => setMobileTab('home')}
          className={`clay-tab-item ${mobileTab === 'home' ? 'active' : ''}`}
        >
          Mobile Home
        </button>
        <button
          onClick={() => setMobileTab('subjects')}
          className={`clay-tab-item ${mobileTab === 'subjects' ? 'active' : ''}`}
        >
          Mobile Subjects
        </button>
        <button
          onClick={() => setMobileTab('tasks')}
          className={`clay-tab-item ${mobileTab === 'tasks' ? 'active' : ''}`}
        >
          Mobile Tasks
        </button>
        <button
          onClick={() => setMobileTab('profile')}
          className={`clay-tab-item ${mobileTab === 'profile' ? 'active' : ''}`}
        >
          Mobile Profile
        </button>
      </div>

      {/* Realistic Mobile Device Frame Shell */}
      <div className="mobile-device-shell">
        {/* Dynamic Island / Notch */}
        <div
          style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          <span>5:01</span>
          <div
            style={{
              width: '100px',
              height: '18px',
              backgroundColor: '#1E2530',
              borderRadius: '9999px',
            }}
          />
          <span>5G 98%</span>
        </div>

        {/* Mobile Header matching reference panel 11 */}
        <div
          style={{
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'var(--dark-pill-bg)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={14} fill="#FFB800" stroke="#FFB800" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Student OS
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} color="var(--text-muted)" />
            <Bell size={18} color="var(--text-muted)" />
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9999px',
                backgroundColor: '#232B36',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              M
            </div>
          </div>
        </div>

        {/* Mobile Screen Body Content */}
        <div style={{ padding: '16px', paddingBottom: '90px' }}>
          {mobileTab === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Greeting */}
              <div className="clay-card-flat" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--coral-text)', fontWeight: 700 }}>
                  {dayName} {formattedDate}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {greeting}, {user.name}! 👋
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Stay consistent, keep going.
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div className="clay-card-flat" style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--coral-text)' }}>
                    {pendingTasksCount}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Tasks
                  </div>
                </div>

                <div className="clay-card-flat" style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {subjects.length}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Subjects
                  </div>
                </div>

                <div className="clay-card-flat" style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--mint-text)' }}>
                    78%
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Progress
                  </div>
                </div>
              </div>

              {/* Today's Schedule on Mobile */}
              <div className="clay-card-flat" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Today's Schedule
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {schedule.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '9999px',
                          backgroundColor: item.dotColor === 'green' ? '#179354' : item.dotColor === 'blue' ? '#2A79E2' : '#64748B',
                        }}
                      />
                      <span style={{ fontWeight: 700, minWidth: '60px', color: 'var(--text-muted)' }}>
                        {item.time}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'subjects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Subjects
                </h2>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Semester 4
                </span>
              </div>

              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="clay-card-flat"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="clay-icon-pod"
                      style={{
                        width: '38px',
                        height: '38px',
                        backgroundColor: 'var(--bg-canvas-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Cpu size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {sub.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {sub.progress}% completed • {sub.completedTopics}/{sub.totalTopics}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Your Tasks
              </h2>
              <div className="clay-card-flat" style={{ padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Complete English Assignment
                </div>
                <div style={{ fontSize: '11px', color: 'var(--coral-text)', fontWeight: 600, marginTop: '2px' }}>
                  Due 20 Oct 2026 • High Priority
                </div>
              </div>
              <div className="clay-card-flat" style={{ padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Study AVL Trees (DS)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--amber-text)', fontWeight: 600, marginTop: '2px' }}>
                  Due 18 Oct 2026 • Medium Priority
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '9999px',
                  backgroundColor: '#232B36',
                  color: '#fff',
                  fontSize: '24px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '10px auto',
                }}
              >
                M
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user.name}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {user.email}
              </div>
              <div className="clay-card-flat" style={{ padding: '14px', textAlign: 'left', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Institution</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user.college}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar matching reference panel 11 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '74px',
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-clay)',
            boxShadow: '0 -4px 14px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 12px 14px 12px',
          }}
        >
          <button
            onClick={() => setMobileTab('home')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              border: 'none',
              background: 'none',
              color: mobileTab === 'home' ? '#232B36' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <Home size={20} />
            Home
          </button>

          <button
            onClick={() => setMobileTab('subjects')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              border: 'none',
              background: 'none',
              color: mobileTab === 'subjects' ? '#232B36' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <GraduationCap size={20} />
            Subjects
          </button>

          <button
            onClick={() => setMobileTab('tasks')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              border: 'none',
              background: 'none',
              color: mobileTab === 'tasks' ? '#232B36' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <CheckSquare size={20} />
            Tasks
          </button>

          <button
            onClick={() => setMobileTab('profile')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              border: 'none',
              background: 'none',
              color: mobileTab === 'profile' ? '#232B36' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <User size={20} />
            Profile
          </button>
        </div>
      </div>
    </div>
  );
};
