import React, { useState } from 'react';
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
} from 'lucide-react';
import { TopicItem, ScreenView, TopicLevel } from '../types';
import { calculateExamReadiness } from '../engine/readiness';

interface ExamReadinessViewProps {
  topics: TopicItem[];
  onRateTopic: (topicId: string, level: TopicLevel) => void;
  onRateAllTopics?: (level: TopicLevel) => void;
  onNavigate: (view: ScreenView) => void;
  selectedSubjectId: string;
}

export const ExamReadinessView: React.FC<ExamReadinessViewProps> = ({
  topics,
  onRateTopic,
  onRateAllTopics,
  onNavigate,
  selectedSubjectId,
}) => {
  const [selectedExam, setSelectedExam] = useState<string>('Internal Exam - Data Structures');

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
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
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
              <option value="Internal Exam - Data Structures">Internal Exam - Data Structures</option>
              <option value="Model Exam - Operating Systems">Model Exam - Operating Systems</option>
              <option value="End Semester - Computer Networks">End Semester - Computer Networks</option>
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
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Data Structures Topics Rating (1-Tap)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Rating a topic logs a review today (100% fresh retention) and recalculates exam readiness instantly.
            </p>
          </div>

          {/* Quick Bulk Demo Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topics.map((t) => (
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
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t.unitName} • Importance: {Math.round(t.importance * 100)}% • Stability: {t.stabilityDays.toFixed(1)} days • {t.lastReviewedDaysAgo === 0 ? 'Reviewed Today (100% retention)' : `Reviewed ${t.lastReviewedDaysAgo}d ago`}
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
      </div>
    </div>
  );
};
