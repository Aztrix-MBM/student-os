import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  Award,
  BookOpen,
  Settings,
  ChevronRight,
  Zap,
  Layers,
  Shield,
} from 'lucide-react';
import { ScreenView } from '../types';

interface SidebarProps {
  currentView: ScreenView;
  onNavigate: (view: ScreenView) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenExamPass?: () => void;
  onOpenPrivacy?: () => void;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onLogout,
  onOpenSettings,
  onOpenExamPass,
  onOpenPrivacy,
  userName,
}) => {
  const navItems: Array<{ id: ScreenView; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Today (Home)', icon: <LayoutDashboard size={19} /> },
    { id: 'subjects', label: 'Subjects', icon: <GraduationCap size={19} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={19} /> },
    { id: 'readiness', label: 'Exam Readiness', icon: <Award size={19} /> },
    { id: 'syllabus-ai', label: 'Import Syllabus', icon: <BookOpen size={19} /> },
    { id: 'prototype', label: 'Prototype Lab', icon: <Layers size={19} /> },
  ];

  return (
    <aside
      className="clay-card sidebar-desktop"
      style={{
        width: '260px',

        minWidth: '260px',
        padding: '24px 16px',
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
        marginRight: '24px',
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 10px 20px 10px',
            cursor: 'pointer',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '16px',
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
              MVP Workspace
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  minHeight: '44px',
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

      {/* User / Settings Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>

        <div
          className="clay-recessed"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
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
              onClick={onLogout}
              className="clay-btn clay-btn-light"
              style={{ padding: '4px 10px', height: '28px', fontSize: '11px' }}
            >
              Logout
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onOpenSettings ? onOpenSettings : () => onNavigate('settings')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '12px',
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
            <Settings size={15} />
            <span>Settings</span>
          </button>

          {onOpenPrivacy && (
            <button
              onClick={onOpenPrivacy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Privacy Policy & Terms"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-canvas-subtle)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Shield size={14} />
              <span>Privacy</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
