import React, { useState } from 'react';
import {
  Cpu,
  Monitor,
  Network,
  Code,
  Compass,
  BookOpen,
  Plus,
  MoreVertical,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Subject, ScreenView } from '../types';

interface SubjectsViewProps {
  subjects: Subject[];
  onOpenAddSubject: () => void;
  onNavigate: (view: ScreenView) => void;
  onSelectSubjectForReadiness: (subjectId: string) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  onOpenAddSubject,
  onNavigate,
  onSelectSubjectForReadiness,
}) => {
  const [filter, setFilter] = useState<'all' | 'current' | 'previous'>('all');

  const filteredSubjects = subjects.filter((s) => {
    if (filter === 'all') return true;
    return s.semester === filter;
  });

  const getSubjectIcon = (iconType: Subject['iconType']) => {
    switch (iconType) {
      case 'chip':
        return <Cpu size={24} />;
      case 'monitor':
        return <Monitor size={24} />;
      case 'network':
        return <Network size={24} />;
      case 'code':
        return <Code size={24} />;
      case 'math':
        return <Compass size={24} />;
      case 'book':
        return <BookOpen size={24} />;
      default:
        return <BookOpen size={24} />;
    }
  };

  const getColorClasses = (colorTheme: Subject['colorTheme']) => {
    switch (colorTheme) {
      case 'coral':
        return {
          bg: 'var(--coral-bg)',
          border: 'var(--coral-border)',
          text: 'var(--coral-text)',
          fill: '#E3512B',
        };
      case 'sky':
        return {
          bg: 'var(--sky-bg)',
          border: 'var(--sky-border)',
          text: 'var(--sky-text)',
          fill: '#2A79E2',
        };
      case 'lavender':
        return {
          bg: 'var(--lavender-bg)',
          border: 'var(--lavender-border)',
          text: 'var(--lavender-text)',
          fill: '#7C45EB',
        };
      case 'mint':
        return {
          bg: 'var(--mint-bg)',
          border: 'var(--mint-border)',
          text: 'var(--mint-text)',
          fill: '#179354',
        };
      case 'amber':
      default:
        return {
          bg: 'var(--amber-bg)',
          border: 'var(--amber-border)',
          text: 'var(--amber-text)',
          fill: '#CB7309',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Header and Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            My Subjects
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Manage your subjects, topics and track your progress.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Filter Pills matching reference panel 5 */}
          <div className="clay-tab-bar">
            <button
              onClick={() => setFilter('all')}
              className={`clay-tab-item ${filter === 'all' ? 'active' : ''}`}
            >
              All Subjects
            </button>
            <button
              onClick={() => setFilter('current')}
              className={`clay-tab-item ${filter === 'current' ? 'active' : ''}`}
            >
              Current Semester
            </button>
            <button
              onClick={() => setFilter('previous')}
              className={`clay-tab-item ${filter === 'previous' ? 'active' : ''}`}
            >
              Previous Semester
            </button>
          </div>

          {/* Add Subject CTA */}
          <button onClick={onOpenAddSubject} className="clay-btn clay-btn-dark">
            <Plus size={18} />
            Add Subject
          </button>
        </div>
      </div>

      {/* Grid of Subject Clay Cards matching reference panel 5 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {filteredSubjects.map((sub) => {
          const colors = getColorClasses(sub.colorTheme);
          return (
            <div
              key={sub.id}
              className="clay-card"
              style={{
                padding: '24px',
                cursor: 'pointer',
              }}
              onClick={() => {
                onSelectSubjectForReadiness(sub.id);
                onNavigate('readiness');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    className="clay-icon-pod-lg"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1.5px solid ${colors.border}`,
                    }}
                  >
                    {getSubjectIcon(sub.iconType)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sub.name}
                    </h3>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {sub.code} • Semester 4
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Options for ${sub.name}: Edit syllabus or mark completed.`);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              {/* Progress Stat */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Progress: {sub.progress}%</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {sub.completedTopics}/{sub.totalTopics} topics
                  </span>
                </div>

                {/* Recessed Clay Progress Track */}
                <div
                  className="clay-recessed"
                  style={{
                    height: '10px',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${sub.progress}%`,
                      height: '100%',
                      backgroundColor: colors.fill,
                      borderRadius: '9999px',
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: `0 0 8px ${colors.fill}`,
                    }}
                  />
                </div>
              </div>

              {/* Action Hint */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Click to view topics & readiness</span>
                <span style={{ fontWeight: 700, color: colors.text }}>View Analysis →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
