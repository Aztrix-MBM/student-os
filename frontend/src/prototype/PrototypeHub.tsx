import React, { useState } from 'react';
import { ScreenView } from '../types';
import { LandingPage } from './LandingPage';
import { StudyPlannerView } from './StudyPlannerView';
import { AnalyticsView } from './AnalyticsView';
import { CareerView } from './CareerView';
import { initialCalendarEvents, initialCareerPaths } from '../data/mockData';

interface PrototypeHubProps {
  onNavigate: (view: ScreenView) => void;
}

export const PrototypeHub: React.FC<PrototypeHubProps> = ({ onNavigate }) => {
  const [tab, setTab] = useState<'landing' | 'planner' | 'analytics' | 'career'>('landing');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        className="clay-card-flat"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: 'var(--amber-bg)',
          borderColor: 'var(--amber-border)',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--amber-text)', textTransform: 'uppercase' }}>
            Prototype Sandbox (Out of MVP Scope per Section 1)
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            These screens are reserved for future phases and preserved here without further modification.
          </p>
        </div>

        <div className="clay-tab-bar">
          <button
            onClick={() => setTab('landing')}
            className={`clay-tab-item ${tab === 'landing' ? 'active' : ''}`}
          >
            Landing
          </button>
          <button
            onClick={() => setTab('planner')}
            className={`clay-tab-item ${tab === 'planner' ? 'active' : ''}`}
          >
            Study Planner
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`clay-tab-item ${tab === 'analytics' ? 'active' : ''}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setTab('career')}
            className={`clay-tab-item ${tab === 'career' ? 'active' : ''}`}
          >
            Career
          </button>
        </div>
      </div>

      <div>
        {tab === 'landing' && <LandingPage onNavigate={onNavigate} />}
        {tab === 'planner' && <StudyPlannerView events={initialCalendarEvents} onAddEvent={() => {}} />}
        {tab === 'analytics' && <AnalyticsView />}
        {tab === 'career' && <CareerView careerPaths={initialCareerPaths} />}
      </div>
    </div>
  );
};
