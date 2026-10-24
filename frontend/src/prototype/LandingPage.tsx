import React from 'react';
import { ArrowRight, BookOpen, CheckSquare, Calendar, Award, Zap } from 'lucide-react';
import { ScreenView } from '../types';

interface LandingPageProps {
  onNavigate: (view: ScreenView) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }} className="animate-fade-in">
      {/* Top Navbar */}
      <nav
        className="clay-card-flat"
        style={{
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              backgroundColor: 'var(--dark-pill-bg)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '3px 4px 10px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Zap size={18} fill="#FFB800" stroke="#FFB800" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Student OS
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8" style={{ fontSize: '14px', fontWeight: 600 }}>
          <button
            onClick={() => onNavigate('landing')}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Features
          </button>
          <button
            onClick={() => onNavigate('readiness')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Readiness Engine
          </button>
          <button
            onClick={() => onNavigate('career')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Career
          </button>
        </div>

        <button
          onClick={() => onNavigate('login')}
          className="clay-btn clay-btn-dark"
          style={{ padding: '9px 24px', fontSize: '14px' }}
        >
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        {/* Left Column */}
        <div>
          <div
            className="clay-pill-amber"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            Engineering Exam Readiness Platform
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 54px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              color: 'var(--text-primary)',
              marginBottom: '18px',
            }}
          >
            Organize
            <br />
            Your Academic
            <br />
            Journey
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              fontWeight: 500,
            }}
          >
            Plan. Track. Learn. Grow.
            <br />
            All in one place.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <button
              onClick={() => onNavigate('dashboard')}
              className="clay-btn clay-btn-dark"
              style={{ padding: '13px 28px', fontSize: '15px' }}
            >
              Get Started <ArrowRight size={17} />
            </button>
            <button
              onClick={() => onNavigate('readiness')}
              className="clay-btn clay-btn-light"
              style={{ padding: '13px 24px', fontSize: '15px' }}
            >
              Learn More
            </button>
          </div>

          {/* 4 Clay Feature Cards in a row matching reference panel 1 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              className="clay-card-flat"
              onClick={() => onNavigate('subjects')}
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                className="clay-icon-pod"
                style={{
                  width: '38px',
                  height: '38px',
                  backgroundColor: 'var(--coral-bg)',
                  color: 'var(--coral-text)',
                  border: '1px solid var(--coral-border)',
                }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Organize</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Subjects</div>
              </div>
            </div>

            <div
              className="clay-card-flat"
              onClick={() => onNavigate('tasks')}
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                className="clay-icon-pod"
                style={{
                  width: '38px',
                  height: '38px',
                  backgroundColor: 'var(--mint-bg)',
                  color: 'var(--mint-text)',
                  border: '1px solid var(--mint-border)',
                }}
              >
                <CheckSquare size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Track</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Tasks</div>
              </div>
            </div>

            <div
              className="clay-card-flat"
              onClick={() => onNavigate('planner')}
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                className="clay-icon-pod"
                style={{
                  width: '38px',
                  height: '38px',
                  backgroundColor: 'var(--sky-bg)',
                  color: 'var(--sky-text)',
                  border: '1px solid var(--sky-border)',
                }}
              >
                <Calendar size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Plan</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Exams</div>
              </div>
            </div>

            <div
              className="clay-card-flat"
              onClick={() => onNavigate('career')}
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                className="clay-icon-pod"
                style={{
                  width: '38px',
                  height: '38px',
                  backgroundColor: 'var(--amber-bg)',
                  color: 'var(--amber-text)',
                  border: '1px solid var(--amber-border)',
                }}
              >
                <Award size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Build</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Your Future</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clay Arch Frame with 3D Image & Floating Quote */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div
            className="clay-card"
            style={{
              padding: '16px',
              borderRadius: '36px',
              maxWidth: '540px',
              width: '100%',
              backgroundColor: 'var(--bg-surface-elevated)',
            }}
          >
            <div
              style={{
                borderRadius: '26px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.08)',
              }}
            >
              <img
                src="/clay_study_desk.jpg"
                alt="3D Clay Study Desk"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
              />

              {/* Floating Clay Quote Badge matching reference panel 1 */}
              <div
                className="clay-card-flat"
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  padding: '12px 18px',
                  maxWidth: '180px',
                  borderRadius: '18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'var(--clay-shadow-md)',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  Discipline today, builds a better tomorrow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
