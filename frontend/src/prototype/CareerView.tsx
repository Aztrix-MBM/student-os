import React, { useState } from 'react';
import { Compass, Server, BarChart2, Cpu, Globe, ChevronRight, CheckCircle2 } from 'lucide-react';
import { CareerPath } from '../types';

interface CareerViewProps {
  careerPaths: CareerPath[];
}

export const CareerView: React.FC<CareerViewProps> = ({ careerPaths }) => {
  const [activeTab, setActiveTab] = useState<'recommended' | 'skills' | 'roadmap' | 'opportunities'>('recommended');

  const getRoleIcon = (title: string) => {
    if (title.includes('Backend')) return <Server size={22} />;
    if (title.includes('Data Analyst')) return <BarChart2 size={22} />;
    if (title.includes('AI/ML')) return <Cpu size={22} />;
    return <Globe size={22} />;
  };

  const getRoleTheme = (title: string) => {
    if (title.includes('Backend')) {
      return { bg: 'var(--sky-bg)', border: 'var(--sky-border)', text: 'var(--sky-text)', fill: '#2A79E2' };
    }
    if (title.includes('Data Analyst')) {
      return { bg: 'var(--amber-bg)', border: 'var(--amber-border)', text: 'var(--amber-text)', fill: '#CB7309' };
    }
    if (title.includes('AI/ML')) {
      return { bg: 'var(--mint-bg)', border: 'var(--mint-border)', text: 'var(--mint-text)', fill: '#179354' };
    }
    return { bg: 'var(--coral-bg)', border: 'var(--coral-border)', text: 'var(--coral-text)', fill: '#E3512B' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Header matching reference panel 10 */}
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
            Career Guidance
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Explore career paths based on your skills and interests.
          </p>
        </div>

        {/* Tabs matching reference panel 10 */}
        <div className="clay-tab-bar">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`clay-tab-item ${activeTab === 'recommended' ? 'active' : ''}`}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`clay-tab-item ${activeTab === 'skills' ? 'active' : ''}`}
          >
            Skills
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`clay-tab-item ${activeTab === 'roadmap' ? 'active' : ''}`}
          >
            Roadmap
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`clay-tab-item ${activeTab === 'opportunities' ? 'active' : ''}`}
          >
            Opportunities
          </button>
        </div>
      </div>

      {/* Career Path Clay Cards List matching reference panel 10 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {careerPaths.map((path) => {
          const theme = getRoleTheme(path.title);
          return (
            <div
              key={path.id}
              className="clay-card"
              style={{
                padding: '24px 28px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                cursor: 'pointer',
              }}
              onClick={() => alert(`Roadmap for ${path.title}: Core curriculum matches ${path.matchPct}%.`)}
            >
              {/* Left: Icon & Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '280px' }}>
                <div
                  className="clay-icon-pod-lg"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    border: `1.5px solid ${theme.border}`,
                  }}
                >
                  {getRoleIcon(path.title)}
                </div>

                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {path.title}
                  </h3>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {path.category} • Match: {path.matchPct}%
                  </div>

                  {/* Skills badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {path.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="clay-card-flat"
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Progress bar & Chevron arrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '220px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Skill Match</span>
                    <span style={{ color: theme.text }}>{path.matchPct}%</span>
                  </div>

                  {/* Recessed Clay Bar */}
                  <div
                    className="clay-recessed"
                    style={{
                      height: '10px',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      position: 'relative',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        width: `${path.matchPct}%`,
                        height: '100%',
                        backgroundColor: theme.fill,
                        borderRadius: '9999px',
                        boxShadow: `0 0 8px ${theme.fill}`,
                      }}
                    />
                  </div>
                </div>

                <div
                  className="clay-card-flat"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
