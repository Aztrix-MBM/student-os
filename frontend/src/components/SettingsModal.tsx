import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Clock,
  ShieldCheck,
  Bell,
  Check,
  Save,
  LogOut,
  Sparkles,
  Download,
  Smartphone,
  Send,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  testSendNotification,
  deleteAccount,
  ApiNotificationPreferences,
} from '../lib/api';
import { usePWAInstall, requestPushNotificationPermission } from '../lib/pwa';

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
  }) => void | Promise<void>;
  onLogout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenExamPass?: () => void;
  onAccountDeleted?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  isDarkMode,
  onToggleDarkMode,
  onSaveProfile,
  onLogout,
  onOpenPrivacy,
  onOpenExamPass,
  onAccountDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'study' | 'notifications' | 'security'>('profile');
  const [name, setName] = useState(user.name);
  const [college, setCollege] = useState(user.college || 'Rajalakshmi Institute of Technology (RIT)');
  const [semester, setSemester] = useState(user.semester || 'Semester 4 — Computer Science & Engineering');
  const [dailyMinutes, setDailyMinutes] = useState(user.dailyStudyMinutes || 180);
  const [studyReminders, setStudyReminders] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  // Phase 9 Security & Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Phase 8 PWA & Notification State
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [morningEnabled, setMorningEnabled] = useState<boolean>(true);
  const [morningTime, setMorningTime] = useState<string>('08:00');
  const [revisionAlerts, setRevisionAlerts] = useState<boolean>(true);
  const [examAlerts, setExamAlerts] = useState<boolean>(true);
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [hasPushSub, setHasPushSub] = useState<boolean>(false);
  const [isTestingNotification, setIsTestingNotification] = useState<boolean>(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const [presetSavedToast, setPresetSavedToast] = useState<string | null>(null);

  // Sync profile fields from props whenever modal opens or user profile updates
  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setCollege(user.college || 'Rajalakshmi Institute of Technology (RIT)');
      setSemester(user.semester || 'Semester 4 — Computer Science & Engineering');
      setDailyMinutes(user.dailyStudyMinutes || 180);
      let isMounted = true;
      fetchNotificationPreferences().then((prefs) => {
        if (isMounted && prefs) {
          setMorningEnabled(prefs.morning_plan_enabled);
          setMorningTime(prefs.morning_plan_time || '08:00');
          setRevisionAlerts(prefs.revision_due_alerts);
          setExamAlerts(prefs.exam_countdown_alerts);
          setTelegramChatId(prefs.telegram_chat_id || '');
          setHasPushSub(prefs.has_push_subscription);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, user.name, user.college, user.semester, user.dailyStudyMinutes]);

  if (!isOpen) return null;

  const handleSelectPreset = async (mins: number) => {
    setDailyMinutes(mins);
    setPresetSavedToast(`${mins}m target active`);
    setTimeout(() => setPresetSavedToast(null), 2500);
    try {
      await onSaveProfile({
        name,
        college,
        semester,
        dailyStudyMinutes: mins,
        studyReminders,
      });
    } catch (err) {
      console.warn('Auto-save preset target error:', err);
    }
  };

  const handleEnablePush = async () => {
    const res = await requestPushNotificationPermission();
    if (res.ok) {
      setHasPushSub(true);
      setNotificationToast('Web Push enabled! Device registered for morning plans.');
      setTimeout(() => setNotificationToast(null), 3500);
    } else {
      setNotificationToast(res.error || 'Failed to enable push notifications');
      setTimeout(() => setNotificationToast(null), 3500);
    }
  };

  const handleTriggerTest = async () => {
    try {
      setIsTestingNotification(true);
      const res = await testSendNotification();
      if (res.ok) {
        setNotificationToast(res.message || 'Morning plan test notification dispatched!');
      } else {
        setNotificationToast(res.message);
      }
    } catch {
      setNotificationToast('Network error triggering test alert');
    } finally {
      setIsTestingNotification(false);
      setTimeout(() => setNotificationToast(null), 3500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveProfile({
      name,
      college,
      semester,
      dailyStudyMinutes: Number(dailyMinutes),
      studyReminders,
    });

    // Save notification preferences
    await updateNotificationPreferences({
      morning_plan_enabled: morningEnabled,
      morning_plan_time: morningTime,
      revision_due_alerts: revisionAlerts,
      exam_countdown_alerts: examAlerts,
      telegram_chat_id: telegramChatId.trim() || undefined,
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
          maxWidth: '580px',
          maxHeight: '92vh',
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
                Customize your academic profile, PWA & alerts
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

        {/* Toast Feedback */}
        {notificationToast && (
          <div
            className="clay-card-flat animate-fade-in"
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--mint-bg)',
              color: 'var(--mint-text)',
              border: '1px solid var(--mint-border)',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{notificationToast}</span>
            <button
              onClick={() => setNotificationToast(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Switcher Pills */}
        <div className="clay-tab-bar" style={{ marginBottom: '22px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`clay-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            style={{ fontSize: '12px' }}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`clay-tab-item ${activeTab === 'study' ? 'active' : ''}`}
            style={{ fontSize: '12px' }}
          >
            Study Goals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`clay-tab-item ${activeTab === 'notifications' ? 'active' : ''}`}
            style={{ fontSize: '12px' }}
          >
            PWA & Alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`clay-tab-item ${activeTab === 'security' ? 'active' : ''}`}
            style={{ fontSize: '12px' }}
          >
            Security
          </button>
        </div>

        {/* Form Body */}
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
                  placeholder="e.g. Alex Morgan"
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
            </div>
          )}

          {activeTab === 'study' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Daily Study Target: {dailyMinutes} Minutes ({Math.round((dailyMinutes / 60) * 10) / 10} Hours)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: presetSavedToast ? 'var(--mint-text)' : 'var(--coral-text)' }}>
                    {presetSavedToast ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} /> {presetSavedToast}
                      </span>
                    ) : dailyMinutes >= 180 ? (
                      'Optimal for Engineering'
                    ) : (
                      'Light Pace'
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {presetMinutes.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSelectPreset(mins)}
                      className={`clay-btn ${dailyMinutes === mins ? 'clay-btn-dark' : 'clay-btn-light'}`}
                      style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '10px' }}
                    >
                      {mins >= 60 ? `${mins / 60}h (${mins}m)` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

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
                  Greedy Daily Planner Capacity
                </div>
                The planner engine fits high-priority tasks and revision-due topics into this exact study budget each morning.
              </div>
            </div>
          )}

          {/* Phase 8 PWA & Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              {/* PWA Section */}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Smartphone size={22} color="var(--sky-text)" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Progressive Web App (PWA)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isInstalled
                          ? 'Installed as standalone desktop/mobile app'
                          : canInstall
                          ? 'Available to install on this device'
                          : 'Service Worker active (offline capable)'}
                      </div>
                    </div>
                  </div>

                  {canInstall && !isInstalled && (
                    <button
                      type="button"
                      onClick={promptInstall}
                      className="clay-btn clay-btn-dark"
                      style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} /> Install App
                    </button>
                  )}
                </div>

                <div
                  className="clay-recessed"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Zap size={14} color="#179354" />
                  <span>Offline cache active via service worker: study plans load instantaneously.</span>
                </div>
              </div>

              {/* Web Push Morning Plan Alert */}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell size={20} color="var(--coral-text)" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Morning Study Plan Digest
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Daily notification with Next Best Action & Soft Streak
                      </div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={morningEnabled}
                    onChange={(e) => setMorningEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--coral-text)', cursor: 'pointer' }}
                  />
                </div>

                {morningEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Morning Dispatch Time
                    </label>
                    <input
                      type="time"
                      value={morningTime}
                      onChange={(e) => setMorningTime(e.target.value)}
                      className="clay-input"
                      style={{ height: '34px', fontSize: '13px', padding: '0 8px' }}
                    />
                  </div>
                )}

                {!hasPushSub && (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    className="clay-btn clay-btn-light"
                    style={{
                      height: '34px',
                      fontSize: '12px',
                      color: 'var(--coral-text)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Bell size={14} /> Enable Web Push on this Browser
                  </button>
                )}
              </div>

              {/* Revision Due & Exam Countdown Toggles */}
              <div
                className="clay-card-flat"
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Spaced Revision Reminders
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Notify when topic retention drops below 70% threshold
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={revisionAlerts}
                    onChange={(e) => setRevisionAlerts(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--coral-text)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Upcoming Exam Countdowns
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Urgent countdown alert when an exam is within 7 days
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={examAlerts}
                    onChange={(e) => setExamAlerts(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--coral-text)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Telegram Bot Dispatch (Build Guide Section 10 Phase 8) */}
              <div
                className="clay-card-flat"
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Telegram Bot Integration (Optional)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Receive morning study digests directly to your Telegram chat
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="e.g. @rit_student_chat_id"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="clay-input"
                  style={{ width: '100%', height: '36px', fontSize: '13px' }}
                />
              </div>

              {/* Test Notification Dispatch Button */}
              <button
                type="button"
                onClick={handleTriggerTest}
                disabled={isTestingNotification}
                className="clay-btn clay-btn-light"
                style={{
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '12px',
                }}
              >
                <Send size={15} />
                {isTestingNotification ? 'Generating Test Digest...' : 'Send Test Morning Notification'}
              </button>
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

              {/* Privacy & Compliance Link */}
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
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Privacy Policy & Terms
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    India DPDP Act 2023 compliance & data disclosures
                  </div>
                </div>

                {onOpenPrivacy && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPrivacy();
                    }}
                    className="clay-btn clay-btn-light"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    View Policy
                  </button>
                )}
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

              {/* Danger Zone: Account Deletion (DPDP Act 2023) */}
              <div
                className="clay-card-flat"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(227, 81, 43, 0.4)',
                  backgroundColor: 'var(--coral-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#E3512B' }}>
                    Danger Zone: Delete Account & Data
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Permanently delete your account, subjects, tasks, and revision logs. This action cannot be undone.
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="clay-btn"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#FFFFFF',
                      color: '#E3512B',
                      border: '1px solid #FFD4C4',
                      fontSize: '12px',
                      fontWeight: 700,
                      alignSelf: 'flex-start',
                    }}
                  >
                    Delete Account
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Type <strong>DELETE</strong> to confirm permanent wipe:
                    </div>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="clay-input"
                      style={{ height: '36px', fontSize: '13px', padding: '0 10px' }}
                    />
                    {deleteError && (
                      <div style={{ fontSize: '11px', color: '#E3512B', fontWeight: 600 }}>
                        {deleteError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (deleteConfirmText.trim() !== 'DELETE') {
                            setDeleteError('Please type DELETE to confirm.');
                            return;
                          }
                          setDeleteError(null);
                          setIsDeletingAccount(true);
                          const res = await deleteAccount();
                          setIsDeletingAccount(false);
                          if (res.ok) {
                            if (onAccountDeleted) onAccountDeleted();
                            else if (onLogout) onLogout();
                            onClose();
                          } else {
                            setDeleteError(res.message);
                          }
                        }}
                        disabled={isDeletingAccount}
                        className="clay-btn"
                        style={{
                          backgroundColor: '#E3512B',
                          color: '#FFFFFF',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {isDeletingAccount ? 'Wiping Data...' : 'Confirm Permanent Deletion'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                          setDeleteError(null);
                        }}
                        className="clay-btn clay-btn-light"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <a
              href="mailto:support@studentos.app?subject=Student%20OS%20Feedback"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
              title="Share feedback or report an issue directly to the developer"
            >
              <MessageSquare size={15} />
              <span>Send Feedback</span>
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          </div>
        </form>
      </div>
    </div>
  );
};
