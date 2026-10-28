import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, Menu, LogOut, Flame, Download, Shield } from 'lucide-react';
import { ScreenView } from '../types';
import { checkBackendHealth, HealthCheckData, fetchStreak, ApiStreak } from '../lib/api';
import { usePWAInstall } from '../lib/pwa';

interface NavbarProps {
  currentView: ScreenView;
  onNavigate: (view: ScreenView) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleMobileMenu: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
  onToggleMobileMenu,
  onLogout,
  onOpenSettings,
  userName,
}) => {
  const [backendHealth, setBackendHealth] = useState<{
    checked: boolean;
    ok: boolean;
    data?: HealthCheckData;
    error?: string;
  }>({ checked: false, ok: false });

  const [streak, setStreak] = useState<ApiStreak | null>(null);
  const { canInstall, promptInstall } = usePWAInstall();

  useEffect(() => {
    let isMounted = true;
    const verifyHealth = async () => {
      const result = await checkBackendHealth();
      if (isMounted) {
        setBackendHealth({ checked: true, ok: result.ok, data: result.data, error: result.error });
      }
    };

    const loadStreak = async () => {
      try {
        const s = await fetchStreak();
        if (isMounted && s) {
          setStreak(s);
        }
      } catch {
        // graceful offline
      }
    };

    verifyHealth();
    loadStreak();

    const interval = setInterval(() => {
      verifyHealth();
      loadStreak();
    }, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header
      className="clay-card-flat nav-header-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: '12px',
        zIndex: 15,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Mobile Menu Button & Search */}
      <div
        className="navbar-search-wrapper"
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          maxWidth: '420px',
        }}
      >
        <button
          onClick={onToggleMobileMenu}
          className="clay-btn-light mobile-menu-trigger navbar-action-btn"
          aria-label="Toggle navigation menu"
          title="Open menu"
        >
          <Menu size={18} style={{ display: 'block', margin: 'auto' }} />
        </button>

        <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search subjects, topics, exams..."
            className="clay-input search-bar-input"
            style={{
              borderRadius: '9999px',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Right Controls: Streak, PWA, Health & User */}
      <div
        className="navbar-right-controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Soft Streak Flame Badge (Phase 8 Specification) */}
        <div
          className="clay-card-flat navbar-streak-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: '9999px',
            fontWeight: 800,
            color: streak && streak.current_streak > 0 ? '#E3512B' : 'var(--text-muted)',
            cursor: 'pointer',
            backgroundColor: streak && streak.current_streak > 0 ? 'var(--coral-bg)' : undefined,
            border: streak && streak.current_streak > 0 ? '1px solid var(--coral-border)' : '1px solid var(--border-clay)',
          }}
          onClick={() => onNavigate('dashboard')}
          title={
            streak
              ? `${streak.message}\nLongest: ${streak.longest_streak}d | Grace remaining: ${streak.grace_days_remaining}d`
              : 'Soft Streak tracker'
          }
        >
          <Flame size={15} color={streak && streak.current_streak > 0 ? '#E3512B' : '#94A3B8'} />
          <span>{streak ? `${streak.current_streak}d` : '0d'}</span>
          {streak?.status === 'grace_applied' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#D97706' }}>
              <Shield size={12} color="#D97706" />
            </span>
          )}
        </div>

        {/* PWA Install Button (Prompt when available) */}
        {canInstall && (
          <button
            onClick={promptInstall}
            className="clay-btn clay-btn-dark hide-on-mobile"
            style={{
              height: '36px',
              padding: '0 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Install Student OS as native PWA App on your device"
          >
            <Download size={14} />
            <span>Install App</span>
          </button>
        )}

        {/* Live Backend Connection Indicator (Hidden on mobile to preserve navbar space; visible in Menu drawer) */}
        <div
          className={`hide-on-mobile ${backendHealth.ok ? 'clay-pill-mint' : 'clay-card-flat'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'help',
          }}
          title={
            backendHealth.ok
              ? `FastAPI Backend: ${backendHealth.data?.app_name} (${backendHealth.data?.version})\nDatabase: ${backendHealth.data?.database}\nEnvironment: ${backendHealth.data?.environment}`
              : `FastAPI status: ${backendHealth.error || 'Connecting to http://127.0.0.1:8000...'}`
          }
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              backgroundColor: backendHealth.ok ? '#179354' : '#CB7309',
              boxShadow: backendHealth.ok ? '0 0 6px #179354' : 'none',
            }}
          />
          <span className="hide-on-tablet">
            {backendHealth.ok ? 'API Live (v0.1.0)' : 'API Connecting'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="clay-btn clay-btn-light navbar-action-btn"
          aria-label="Toggle dark mode"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun size={18} color="#FFB800" /> : <Moon size={18} />}
        </button>

        {/* User Profile Avatar with Initials */}
        <button
          onClick={onOpenSettings}
          className="navbar-action-btn"
          style={{
            borderRadius: '12px',
            backgroundColor: 'var(--dark-pill-bg)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '3px 4px 10px rgba(0, 0, 0, 0.25)',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title={userName ? `${userName} (Open Settings)` : 'Student (Open Settings)'}
        >
          {userName ? userName.charAt(0).toUpperCase() : 'M'}
        </button>

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="clay-btn-light navbar-action-btn"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </header>
  );
};
