import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  Award,
  Sparkles,
  Layers,
  Settings,
  ChevronRight,
  Zap,
  X,
  LogOut,
  Smartphone,
} from 'lucide-react';
import { ScreenView } from '../types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ScreenView;
  onNavigate: (view: ScreenView) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  userName?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  onLogout,
  onOpenSettings,
  userName,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navItems: Array<{ id: ScreenView; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Today (Home)', icon: <LayoutDashboard size={19} /> },
    { id: 'subjects', label: 'Subjects', icon: <GraduationCap size={19} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={19} /> },
    { id: 'readiness', label: 'Exam Readiness', icon: <Award size={19} /> },
    { id: 'syllabus-ai', label: 'Syllabus AI', icon: <Sparkles size={19} /> },
    { id: 'prototype', label: 'Prototype Lab', icon: <Layers size={19} /> },
    { id: 'mobile-preview', label: 'Mobile Preview', icon: <Smartphone size={19} /> },
  ];

  const handleItemClick = (view: ScreenView) => {
    onNavigate(view);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Dark Blur Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 20, 27, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Slide-out Drawer Container */}
      <div
        className="clay-card"
        style={{
          position: 'relative',
          width: '300px',
          maxWidth: '85vw',
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          padding: '24px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '0 28px 28px 0',
          boxShadow: '16px 0 40px rgba(0, 0, 0, 0.28)',
          zIndex: 51,
          overflowY: 'auto',
          animation: 'slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div>
          {/* Top Brand Header + Close Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '16px',
            }}
          >
            <div
              onClick={() => handleItemClick('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--dark-pill-bg)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '3px 4px 10px rgba(0, 0, 0, 0.2)',
                }}
              >
                <Zap size={20} fill="#FFB800" stroke="#FFB800" />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                  Student OS
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Navigation Menu
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="clay-btn-light"
              style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px' }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--dark-pill-bg)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '14px',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive
                      ? '3px 5px 14px rgba(35, 43, 54, 0.24), inset 1px 1px 2px rgba(255, 255, 255, 0.2)'
                      : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: isActive ? '#FFFFFF' : 'var(--text-muted)' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={15} style={{ opacity: 0.8 }} />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Settings / Logout Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <div
            className="clay-recessed"
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {userName || 'Student'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Online • JWT Active
              </div>
            </div>
            {onLogout && (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="clay-btn clay-btn-light"
                style={{ padding: '4px 10px', height: '28px', fontSize: '11px' }}
              >
                <LogOut size={13} style={{ marginRight: '4px' }} />
                Logout
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onClose();
              if (onOpenSettings) onOpenSettings();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              width: '100%',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-canvas-subtle)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
