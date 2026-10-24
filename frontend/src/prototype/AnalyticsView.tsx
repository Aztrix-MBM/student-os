import React, { useState } from 'react';
import { ChevronDown, TrendingUp, Clock, BookOpen, CheckCircle2 } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [timeRange, setTimeRange] = useState('This Month');

  // Study hours for 4 weeks (15h, 24h, 32h, 38h)
  const weeklyHours = [
    { week: 'Week 1', hours: 15 },
    { week: 'Week 2', hours: 24 },
    { week: 'Week 3', hours: 32 },
    { week: 'Week 4', hours: 38 },
  ];

  // Topic mastery percentages matching reference panel 9
  const topicMastery = [
    { name: 'Trees', pct: 90, color: '#179354' },
    { name: 'Graphs', pct: 75, color: '#2A79E2' },
    { name: 'OS', pct: 60, color: '#CB7309' },
    { name: 'Networks', pct: 85, color: '#179354' },
    { name: 'Java', pct: 80, color: '#7C45EB' },
    { name: 'Maths', pct: 70, color: '#2A79E2' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Header and Filter matching reference panel 9 */}
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
            Learning Analytics
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Track your growth over time.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="clay-input"
            style={{
              paddingRight: '36px',
              height: '42px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              appearance: 'none',
              borderRadius: '9999px',
              minWidth: '160px',
            }}
          >
            <option value="This Month">This Month</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Semester 4">Semester 4</option>
          </select>
          <ChevronDown
            size={16}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--text-secondary)',
            }}
          />
        </div>
      </div>

      {/* Grid: Study Hours Bar Chart & Topic Mastery Gauges matching reference panel 9 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '22px',
        }}
      >
        {/* Left Card: Study Hours Bar Chart */}
        <div className="clay-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Study Hours
            </h2>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--mint-text)' }}>
              +18% from last month
            </span>
          </div>

          {/* Bar Chart Area */}
          <div
            style={{
              height: '240px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              gap: '16px',
              paddingTop: '20px',
              position: 'relative',
              borderBottom: '2px solid var(--border-clay)',
            }}
          >
            {/* Background reference lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '25%', height: '1px', backgroundColor: 'var(--border-subtle)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', backgroundColor: 'var(--border-subtle)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '75%', height: '1px', backgroundColor: 'var(--border-subtle)', pointerEvents: 'none' }} />

            {weeklyHours.map((item, idx) => {
              const heightPct = (item.hours / 40) * 100;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    height: '100%',
                    justifyContent: 'flex-end',
                    zIndex: 2,
                    flex: 1,
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {item.hours}h
                  </span>

                  {/* Clay 3D Pillar */}
                  <div
                    className="clay-btn-dark"
                    style={{
                      width: '42px',
                      height: `${heightPct}%`,
                      maxHeight: '180px',
                      borderRadius: '12px 12px 4px 4px',
                      backgroundColor: '#179354',
                      boxShadow: '4px 6px 14px rgba(23, 147, 84, 0.3), inset 1px 1px 2px rgba(255, 255, 255, 0.4)',
                      transition: 'height 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    title={`${item.week}: ${item.hours} hours`}
                  />

                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {item.week}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card: Topic Mastery Circular Gauges matching reference panel 9 */}
        <div className="clay-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Topic Mastery
            </h2>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Across Core Courses
            </span>
          </div>

          {/* 6 Circular Mini Gauges Grid matching reference panel 9 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '18px',
              textAlign: 'center',
            }}
          >
            {topicMastery.map((item, idx) => {
              const radius = 32;
              const circum = 2 * Math.PI * radius;
              const offset = circum - (item.pct / 100) * circum;

              return (
                <div
                  key={idx}
                  className="clay-card-flat"
                  style={{
                    padding: '16px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ position: 'relative', width: '74px', height: '74px' }}>
                    <svg width="74" height="74" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="37" cy="37" r={radius} fill="none" stroke="var(--bg-canvas-subtle)" strokeWidth="6" />
                      <circle
                        cx="37"
                        cy="37"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circum}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.pct}%
                    </div>
                  </div>

                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
