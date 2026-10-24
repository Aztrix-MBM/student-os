import React, { useState } from 'react';
import {
  X,
  Settings,
  User,
  GraduationCap,
  Clock,
  ShieldCheck,
  Moon,
  Sun,
  Bell,
  Check,
  Save,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSaveProfile: (updated: {
    name: string;
    college: string;
    semester: string;
    dailyStudyMinutes: number;
    studyReminders: boolean;
  }) => void;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  isDarkMode,
  onToggleDarkMode,
  onSaveProfile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'study' | 'security'>('profile');
  const [name, setName] = useState(user.name);
  const [college, setCollege] = useState(user.college || 'Rajalakshmi Institute of Technology (RIT)');
  const [semester, setSemester] = useState(user.semester || 'Semester 4 — Computer Science & Engineering');
  const [dailyMinutes, setDailyMinutes] = useState(user.dailyStudyMinutes || 180);
  const [studyReminders, setStudyReminders] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      name,
      college,
      semester,
      dailyStudyMinutes: Number(dailyMinutes),
      studyReminders,
    });
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 900);
  };

  const presetMinutes = [60, 90, 120, 180, 240];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 32, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '20px',
      }}
      className="animate-fade-in"
    >
      <div
        className="clay-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px',
          borderRadius: '28px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                backgroundColor: 'var(--coral-bg)',
                color: 'var(--coral-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
                Student OS Settings
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Customize your academic profile & preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="clay-btn-light"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px' }}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="clay-tab-bar" style={{ marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`clay-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            style={{ fontSize: '13px' }}
          >
            Academic Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`clay-tab-item ${activeTab === 'study' ? 'active' : ''}`}
            style={{ fontSize: '13px' }}
          >
            Study Goals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`clay-tab-item ${activeTab === 'security' ? 'active' : ''}`}
            style={{ fontSize: '13px' }}
          >
            Security & Session
          </button>
        </div>

        {/* Form Body (Scrollable if viewport is short) */}
        <form onSubmit={handleSave} style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Student Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="clay-input"
                  placeholder="e.g. Muthubalamurugan"
                  style={{ width: '100%', height: '42px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Registered Email (JWT Account)
                </label>
                <div
                  className="clay-recessed"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{user.email}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--mint-text)',
                      backgroundColor: 'var(--mint-bg)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    Verified
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  College / University
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="clay-input"
                  placeholder="e.g. Rajalakshmi Institute of Technology (RIT)"
                  style={{ width: '100%', height: '42px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Current Semester & Department
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="clay-input"
                  placeholder="e.g. Semester 4 — Computer Science & Engineering"
                  style={{ width: '100%', height: '42px', fontSize: '14px' }}
                />
              </div>

              {/* Theme Toggle Card */}
              <div
                className="clay-card-flat"
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isDarkMode ? <Moon size={20} color="#7C45EB" /> : <Sun size={20} color="#FFB800" />}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Interface Appearance
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Currently in {isDarkMode ? 'Dark Clay' : 'Light Clay'} mode
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="clay-btn-light"
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '10px' }}
                >
                  Switch to {isDarkMode ? 'Light' : 'Dark'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'study' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Daily Target Study Time (Minutes)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="number"
                    min={15}
                    max={600}
                    step={15}
                    value={dailyMinutes}
                    onChange={(e) => setDailyMinutes(Number(e.target.value))}
                    className="clay-input"
                    style={{ width: '110px', height: '42px', fontSize: '15px', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    minutes / day ({Math.floor(dailyMinutes / 60)}h {dailyMinutes % 60}m)
                  </span>
                </div>

                {/* Preset Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {presetMinutes.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyMinutes(mins)}
                      className={`clay-btn ${dailyMinutes === mins ? 'clay-btn-dark' : 'clay-btn-light'}`}
                      style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '10px' }}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Study Habit Reminders */}
              <div
                className="clay-card-flat"
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={20} color="var(--coral-text)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Exam Revision Alerts
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Show alerts for topics with &lt;70% retention score
                    </div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={studyReminders}
                  onChange={(e) => setStudyReminders(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--coral-text)', cursor: 'pointer' }}
                />
              </div>

              {/* Daily Algorithm Summary */}
              <div
                className="clay-recessed"
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="var(--lavender-text)" />
                  Next Best Action Engine
                </div>
                Your daily target automatically balances topic retention decay curves and exam weightage to prioritize today's study queue.
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div
                className="clay-card-flat"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color="var(--mint-text)" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Active Secure Session (Phase 2)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Cryptographically verified via FastAPI & SQLite
                    </div>
                  </div>
                </div>

                <div
                  className="clay-recessed"
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cookie Storage:</span>
                    <span style={{ fontWeight: 600, color: 'var(--mint-text)' }}>HttpOnly, SameSite=lax</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>LocalStorage Tokens:</span>
                    <span style={{ fontWeight: 600, color: 'var(--mint-text)' }}>0 Bytes (Clean)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rate Limiting:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Active (5/min IP+Email)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Token Expiry:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>7 Days Rolling</span>
                  </div>
                </div>
              </div>

              {onLogout && (
                <div
                  className="clay-card-flat"
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Sign Out
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Clear httpOnly authentication cookie
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="clay-btn clay-btn-light"
                    style={{
                      padding: '8px 14px',
                      color: 'var(--coral-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Save Actions */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="clay-btn clay-btn-light"
              style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '12px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="clay-btn clay-btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {savedToast ? (
                <>
                  <Check size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
