import React, { useState, useMemo } from 'react';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  CheckCheck,
  RotateCcw,
  Search,
  Filter,
} from 'lucide-react';
import { TopicItem, ScreenView, TopicLevel, Subject } from '../types';
import { calculateExamReadiness } from '../engine/readiness';

interface ExamReadinessViewProps {
  topics: TopicItem[];
  subjects?: Subject[];
  onRateTopic: (topicId: string, level: TopicLevel) => void;
  onRateAllTopics?: (level: TopicLevel) => void;
  onNavigate: (view: ScreenView) => void;
  selectedSubjectId: string;
  onSelectSubject?: (subjectId: string) => void;
}

export const ExamReadinessView: React.FC<ExamReadinessViewProps> = ({
  topics,
  subjects = [],
  onRateTopic,
  onRateAllTopics,
  onNavigate,
  selectedSubjectId,
  onSelectSubject,
}) => {
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const currentSubjectName = currentSubject?.name || 'Data Structures';

  // Unit filter and search state
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique units for filtering tabs
  const unitList = useMemo(() => {
    const map = new Map<string, number>();
    topics.forEach((t) => {
      const u = t.unitName || 'Other';
      map.set(u, (map.get(u) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [topics]);

  // Filter topics based on unit and search query
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesUnit = unitFilter === 'all' || t.unitName === unitFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.unitName && t.unitName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesUnit && matchesSearch;
    });
  }, [topics, unitFilter, searchQuery]);

  const strongCount = topics.filter((t) => t.level === 'strong').length;
  const okayCount = topics.filter((t) => t.level === 'okay').length;
  const weakCount = topics.filter((t) => t.level === 'weak').length;

  // Compute live readiness using engine pure function
  const readinessResult = calculateExamReadiness(topics);

  // Dynamic Ring & Status colors based on readiness
  const isHighReadiness = readinessResult.readinessPct >= 85;
  const isMediumReadiness = readinessResult.readinessPct >= 70 && readinessResult.readinessPct < 85;
  const strokeColor = isHighReadiness ? '#179354' : isMediumReadiness ? '#2A79E2' : '#CB7309';

  // SVG circular gauge calculation
  const circleRadius = 78;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (readinessResult.readinessPct / 100) * circumference;

  const handleRateAll = (level: TopicLevel) => {
    if (onRateAllTopics) {
      onRateAllTopics(level);
    } else {
      topics.forEach((t) => onRateTopic(t.id, level));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Header and Subject Select matching reference panel 8 */}
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
            Exam Readiness
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Analyze your preparation and predict readiness in real-time.
          </p>
        </div>

        {/* Exam / Subject Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedSubjectId || (currentSubject ? currentSubject.id : '')}
              onChange={(e) => onSelectSubject && onSelectSubject(e.target.value)}
              className="clay-input"
              style={{
                paddingRight: '40px',
                paddingLeft: '18px',
                height: '44px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                appearance: 'none',
                borderRadius: '9999px',
                minWidth: '280px',
              }}
            >
              {subjects.length > 0 ? (
                subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))
              ) : (
                <option value="ds_default">Data Structures (CS3351)</option>
              )}
            </select>
            <ChevronDown
              size={18}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--text-secondary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Readiness Analysis Card matching reference panel 8 */}
      <div
        className="clay-card"
        style={{
          padding: '36px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '36px',
          alignItems: 'center',
        }}
      >
        {/* Left: Large Circular Readiness Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '210px',
              height: '210px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Ambient clay bevel ring behind SVG */}
            <div
              className="clay-card-flat"
              style={{
                position: 'absolute',
                width: '186px',
                height: '186px',
                borderRadius: '9999px',
                zIndex: 1,
              }}
            />

            <svg width="210" height="210" style={{ position: 'relative', zIndex: 2, transform: 'rotate(-90deg)' }}>
              {/* Background Track */}
              <circle
                cx="105"
                cy="105"
                r={circleRadius}
                fill="none"
                stroke="var(--bg-canvas-subtle)"
                strokeWidth="14"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="105"
                cy="105"
                r={circleRadius}
                fill="none"
                stroke={strokeColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease' }}
              />
            </svg>

            {/* Center Content */}
            <div
              style={{
                position: 'absolute',
                zIndex: 3,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '38px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {readinessResult.readinessPct}%
              </span>
              <span
                className={isHighReadiness ? 'clay-pill-mint' : isMediumReadiness ? 'clay-pill-sky' : 'clay-pill-amber'}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  marginTop: '4px',
                }}
              >
                Estimate
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Coverage: {readinessResult.coveragePct}% ({readinessResult.strongCount} Strong)
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Info size={14} />
            <span>Formula: Σ(weight × mastery × retention) / Σ(weight)</span>
          </div>
        </div>

        {/* Right: Dynamic Recommendations with "Why" */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Recommendations ({isHighReadiness ? 'Advanced Prep' : 'Needs Review'})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isHighReadiness ? (
              <>
                <div className="clay-card-flat" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: '#179354', boxShadow: '0 0 8px #179354', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Take Full Syllabus Mock Exam
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      All core units mastered • Test 3-hour Anna University time management
                    </div>
                  </div>
                </div>

                <div className="clay-card-flat" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: '#2A79E2', boxShadow: '0 0 8px #2A79E2', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Practice Part-B 16-Mark Problems
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Focus on diagram presentation for AVL and Dijkstra proofs
                    </div>
                  </div>
                </div>

                <div className="clay-card-flat" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: '#7C45EB', boxShadow: '0 0 8px #7C45EB', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Maintain Spaced Retention
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Next retention check in 5 days before stability decays
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="clay-card-flat" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: '#E3512B', boxShadow: '0 0 8px #E3512B', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Revise Weak Topics ({readinessResult.weakTopics.slice(0, 2).join(', ') || 'Trees & Graphs'})
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Exam in 5 days • High yield units require immediate practice
                    </div>
                  </div>
                </div>

                <div className="clay-card-flat" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: '#2A79E2', boxShadow: '0 0 8px #2A79E2', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Practice Previous Year Questions
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Solve Anna University 2023-2025 question sets
                    </div>
                  </div>
                </div>

                <div className="clay-card-flat" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: '#CB7309', boxShadow: '0 0 8px #CB7309', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Solve 5 More Problems
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Target AVL rotation balancing edge cases
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar matching reference panel 8 */}
      <div
        className="clay-card"
        style={{
          padding: '18px 26px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: isHighReadiness ? 'var(--mint-bg)' : isMediumReadiness ? 'var(--sky-bg)' : 'var(--amber-bg)',
          borderColor: isHighReadiness ? 'var(--mint-border)' : isMediumReadiness ? 'var(--sky-border)' : 'var(--amber-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 size={22} color={isHighReadiness ? '#179354' : isMediumReadiness ? '#2A79E2' : '#CB7309'} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isHighReadiness
              ? 'Preparation Excellent! You are in the top readiness percentile.'
              : isMediumReadiness
              ? 'You are on track. Keep consistent!'
              : 'Attention Needed: Tap Strong/Okay on topics you reviewed today to update score.'}
          </span>
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          className="clay-btn clay-btn-dark"
          style={{ height: '42px', padding: '0 22px', fontSize: '13px' }}
        >
          View Today's Plan <ArrowRight size={15} />
        </button>
      </div>

      {/* Interactive 1-Tap Topic Rating Section (from BUILD_GUIDE.md Section 6 & 10) */}
      <div className="clay-card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentSubjectName} Topics Rating (1-Tap)
              </h3>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-canvas-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {topics.length} Total Topics
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Rating a topic logs a review today (100% fresh retention) and recalculates exam readiness instantly.
            </p>
          </div>

          {/* Quick Bulk Demo Buttons & Syllabus AI Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('syllabus-ai')}
              className="clay-btn clay-btn-light"
              style={{ height: '34px', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#7C45EB' }}
              title="Add more topics or import syllabus via AI"
            >
              <Sparkles size={14} color="#7C45EB" /> Syllabus AI
            </button>
            {topics.length > 0 && (
              <>
                <button
                  onClick={() => handleRateAll('strong')}
                  className="clay-btn clay-btn-light"
                  style={{ height: '34px', padding: '0 12px', fontSize: '12px', fontWeight: 700 }}
                  title="Set all topics to Strong (reviewed today) to see 100% readiness"
                >
                  <CheckCheck size={14} color="#179354" /> Mark All Strong (100%)
                </button>
                <button
                  onClick={() => handleRateAll('okay')}
                  className="clay-btn clay-btn-light"
                  style={{ height: '34px', padding: '0 12px', fontSize: '12px', fontWeight: 700 }}
                >
                  All Okay (70%)
                </button>
              </>
            )}
          </div>
        </div>

        {topics.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {/* Topic Stats Row & Search */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              {/* Status Breakdown Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(23, 147, 84, 0.12)', color: '#179354' }}>
                  ✓ {strongCount} Strong
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(42, 121, 226, 0.12)', color: '#2A79E2' }}>
                  ~ {okayCount} Okay
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(227, 81, 43, 0.12)', color: '#E3512B' }}>
                  ! {weakCount} Weak
                </span>
              </div>

              {/* Instant Search Box */}
              <div style={{ position: 'relative', minWidth: '220px', maxWidth: '320px', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search topic or unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="clay-input"
                  style={{ width: '100%', height: '36px', paddingLeft: '34px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Unit Filter Tabs */}
            {unitList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  onClick={() => setUnitFilter('all')}
                  className={`clay-btn ${unitFilter === 'all' ? 'clay-btn-dark' : 'clay-btn-light'}`}
                  style={{ height: '30px', padding: '0 12px', fontSize: '12px', borderRadius: '9999px', whiteSpace: 'nowrap' }}
                >
                  All Units ({topics.length})
                </button>
                {unitList.map((u) => (
                  <button
                    key={u.name}
                    onClick={() => setUnitFilter(u.name)}
                    className={`clay-btn ${unitFilter === u.name ? 'clay-btn-dark' : 'clay-btn-light'}`}
                    style={{ height: '30px', padding: '0 12px', fontSize: '12px', borderRadius: '9999px', whiteSpace: 'nowrap' }}
                  >
                    {u.name} ({u.count})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {topics.length > 0 ? (
          filteredTopics.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTopics.map((t) => (
                <div
                  key={t.id}
                  className="clay-card-flat"
                  style={{
                    padding: '14px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t.unitName}</span>
                      <span>•</span>
                      <span>Importance: {Math.round(t.importance * 100)}%</span>
                      <span>•</span>
                      <span>Stability: {t.stabilityDays.toFixed(1)}d</span>
                      <span>•</span>
                      <span>{t.lastReviewedDaysAgo === 0 ? 'Reviewed Today (100% retention)' : `Reviewed ${t.lastReviewedDaysAgo}d ago`}</span>
                    </div>
                  </div>

                  {/* 3 Rating Chips (Strong / Okay / Weak) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => onRateTopic(t.id, 'strong')}
                      className={`clay-btn ${t.level === 'strong' ? 'clay-btn-dark' : 'clay-btn-light'}`}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        fontSize: '12px',
                        backgroundColor: t.level === 'strong' ? '#179354' : undefined,
                        color: t.level === 'strong' ? '#FFFFFF' : undefined,
                        boxShadow: t.level === 'strong' ? '0 0 10px rgba(23, 147, 84, 0.4)' : undefined,
                      }}
                    >
                      Strong
                    </button>
                    <button
                      onClick={() => onRateTopic(t.id, 'okay')}
                      className={`clay-btn ${t.level === 'okay' ? 'clay-btn-dark' : 'clay-btn-light'}`}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        fontSize: '12px',
                        backgroundColor: t.level === 'okay' ? '#2A79E2' : undefined,
                        color: t.level === 'okay' ? '#FFFFFF' : undefined,
                        boxShadow: t.level === 'okay' ? '0 0 10px rgba(42, 121, 226, 0.4)' : undefined,
                      }}
                    >
                      Okay
                    </button>
                    <button
                      onClick={() => onRateTopic(t.id, 'weak')}
                      className={`clay-btn ${t.level === 'weak' ? 'clay-btn-dark' : 'clay-btn-light'}`}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        fontSize: '12px',
                        backgroundColor: t.level === 'weak' ? '#E3512B' : undefined,
                        color: t.level === 'weak' ? '#FFFFFF' : undefined,
                        boxShadow: t.level === 'weak' ? '0 0 10px rgba(227, 81, 43, 0.4)' : undefined,
                      }}
                    >
                      Weak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="clay-card-flat"
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                No topics found matching "{searchQuery}"
              </div>
              <button
                onClick={() => { setSearchQuery(''); setUnitFilter('all'); }}
                className="clay-btn clay-btn-light"
                style={{ height: '32px', padding: '0 14px', fontSize: '12px', marginTop: '6px' }}
              >
                Clear Search & Filters
              </button>
            </div>
          )
        ) : (
          <div
            className="clay-card-flat"
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              className="clay-icon-pod"
              style={{
                width: '54px',
                height: '54px',
                backgroundColor: 'var(--lavender-bg)',
                color: 'var(--lavender-text)',
              }}
            >
              <Sparkles size={28} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              No Topics Available Yet for {currentSubjectName}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
              Upload your syllabus PDF or paste text into Syllabus AI to automatically extract all units and topics in seconds.
            </p>
            <button
              onClick={() => onNavigate('syllabus-ai')}
              className="clay-btn clay-btn-dark"
              style={{ height: '42px', padding: '0 22px', fontSize: '13px', marginTop: '6px' }}
            >
              <Sparkles size={16} /> Auto-Extract via Syllabus AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
