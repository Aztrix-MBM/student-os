import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { CalendarEvent } from '../types';

interface StudyPlannerViewProps {
  events: CalendarEvent[];
  onAddEvent: (day: number, title: string, type: CalendarEvent['type']) => void;
}

export const StudyPlannerView: React.FC<StudyPlannerViewProps> = ({ events, onAddEvent }) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDay, setSelectedDay] = useState<number>(17); // Default to Oct 17 2026

  // October 2026 starts on Thursday (index 4)
  const startDayOffset = 4;
  const daysInMonth = 31;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventBadgeClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'ds':
        return 'clay-pill-mint';
      case 'english':
        return 'clay-pill-mint';
      case 'cn':
        return 'clay-pill-coral';
      case 'nptel':
        return 'clay-pill-lavender';
      case 'project':
        return 'clay-pill-sky';
      default:
        return 'clay-pill-amber';
    }
  };

  const selectedDayEvents = events.filter((e) => e.day === selectedDay);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Header and Controls matching reference panel 7 */}
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
            Study Planner
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Plan your study schedule effectively.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Month / Week / Day toggle */}
          <div className="clay-tab-bar">
            <button
              onClick={() => setViewMode('month')}
              className={`clay-tab-item ${viewMode === 'month' ? 'active' : ''}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`clay-tab-item ${viewMode === 'week' ? 'active' : ''}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`clay-tab-item ${viewMode === 'day' ? 'active' : ''}`}
            >
              Day
            </button>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="clay-btn-light" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px' }}>
              <ChevronLeft size={18} />
            </button>
            <button className="clay-btn-light" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px' }}>
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setSelectedDay(17)}
              className="clay-btn clay-btn-dark"
              style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Card matching reference panel 7 */}
      <div className="clay-card" style={{ padding: '28px' }}>
        {/* Month Navigation Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            October 2026
          </h2>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Days Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          {days.map((day) => (
            <div key={day} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
          }}
        >
          {/* Empty cells for startDayOffset */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                minHeight: '74px',
                borderRadius: '16px',
                opacity: 0.35,
                padding: '8px',
                backgroundColor: 'var(--bg-canvas-subtle)',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{27 + i}</span>
            </div>
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = dayNum === 17;
            const isSelected = dayNum === selectedDay;
            const dayEvents = events.filter((e) => e.day === dayNum);

            return (
              <div
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={isSelected ? 'clay-card-flat' : 'clay-recessed'}
                style={{
                  minHeight: '84px',
                  padding: '8px 10px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  border: isToday ? '2px solid #232B36' : isSelected ? '2px solid #2A79E2' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--bg-surface)' : 'var(--bg-canvas-subtle)',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isToday || isSelected ? 800 : 600,
                      color: isToday ? '#232B36' : 'var(--text-primary)',
                    }}
                  >
                    {dayNum}
                  </span>
                  {isToday && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        backgroundColor: '#232B36',
                        color: '#FFFFFF',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                      }}
                    >
                      TODAY
                    </span>
                  )}
                </div>

                {/* Day events pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={getEventBadgeClass(ev.type)}
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 6px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer */}
      <div className="clay-card" style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Agenda for October {selectedDay}, 2026
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {selectedDayEvents.length} scheduled study session(s)
            </span>
          </div>
          <button
            onClick={() => {
              const title = prompt('Enter study session title (e.g., Operating Systems Lab):');
              if (title) onAddEvent(selectedDay, title, 'ds');
            }}
            className="clay-btn clay-btn-dark"
            style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
          >
            <Plus size={14} /> Add Session
          </button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            No sessions planned for this day. Click "+ Add Session" to block study hours.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className={`clay-card-flat ${getEventBadgeClass(ev.type)}`}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Clock size={16} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{ev.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
