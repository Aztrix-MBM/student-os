import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Calendar, Layers, Check, AlertCircle, Clock } from 'lucide-react';
import { Subject, TopicItem } from '../types';
import { createExam, fetchSubjectDetails, ApiExam, ApiUnitDetail, ApiTopicDetail } from '../lib/api';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  topics?: TopicItem[];
  initialSubjectId?: string;
  defaultSubjectId?: string;
  onExamCreated: (exam?: ApiExam) => void;
}

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  subjects,
  topics = [],
  initialSubjectId,
  defaultSubjectId,
  onExamCreated,
}) => {
  const chosenSubId = initialSubjectId || defaultSubjectId || subjects[0]?.id || '';
  const [subjectId, setSubjectId] = useState<string>(chosenSubId);
  const [title, setTitle] = useState<string>('Internal Assessment 1');
  const [examDate, setExamDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [examType, setExamType] = useState<string>('internal');

  // Scope selection state
  const [scopeMode, setScopeMode] = useState<'units' | 'all'>('units');
  const [availableUnits, setAvailableUnits] = useState<ApiUnitDetail[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync subject selection
  useEffect(() => {
    if (initialSubjectId) {
      setSubjectId(initialSubjectId);
    } else if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [initialSubjectId, subjects]);

  // Load units for the selected subject
  useEffect(() => {
    if (!subjectId) return;
    let isCancelled = false;
    setIsLoadingDetails(true);
    fetchSubjectDetails(subjectId)
      .then((detail) => {
        if (!isCancelled && detail && detail.units && detail.units.length > 0) {
          setAvailableUnits(detail.units);
          // Default to selecting the first 2 units for an internal test if available
          const initialSelected = new Set<string>();
          detail.units.slice(0, 2).forEach((u) => initialSelected.add(u.id));
          setSelectedUnitIds(initialSelected);
        } else if (!isCancelled && topics && topics.length > 0) {
          // Fallback to grouping by unit from topics
          const unitMap = new Map<string, { id: string; name: string; topics: { id: string; name: string }[] }>();
          topics.forEach((t) => {
            const uId = t.unitId || t.unitName || 'unit_other';
            const uName = t.unitName || 'Unit';
            if (!unitMap.has(uId)) {
              unitMap.set(uId, { id: uId, name: uName, topics: [] });
            }
            unitMap.get(uId)!.topics.push({ id: t.id, name: t.name });
          });
          const mappedUnits: ApiUnitDetail[] = Array.from(unitMap.values()).map((item, idx) => ({
            id: item.id,
            subject_id: subjectId,
            name: item.name,
            order_no: idx + 1,
            exam_weight: 0.2,
            topics: item.topics.map((t, tIdx) => ({
              id: t.id,
              unit_id: item.id,
              name: t.name,
              importance: 0.8,
              difficulty: 3,
              order_no: tIdx + 1,
            })),
          }));
          setAvailableUnits(mappedUnits);
          const initialSelected = new Set<string>();
          mappedUnits.slice(0, 2).forEach((u) => initialSelected.add(u.id));
          setSelectedUnitIds(initialSelected);
        }
      })
      .catch(() => {
        if (!isCancelled && topics && topics.length > 0) {
          const unitMap = new Map<string, { id: string; name: string; topics: { id: string; name: string }[] }>();
          topics.forEach((t) => {
            const uId = t.unitId || t.unitName || 'unit_other';
            const uName = t.unitName || 'Unit';
            if (!unitMap.has(uId)) {
              unitMap.set(uId, { id: uId, name: uName, topics: [] });
            }
            unitMap.get(uId)!.topics.push({ id: t.id, name: t.name });
          });
          const mappedUnits: ApiUnitDetail[] = Array.from(unitMap.values()).map((item, idx) => ({
            id: item.id,
            subject_id: subjectId,
            name: item.name,
            order_no: idx + 1,
            exam_weight: 0.2,
            topics: item.topics.map((t, tIdx) => ({
              id: t.id,
              unit_id: item.id,
              name: t.name,
              importance: 0.8,
              difficulty: 3,
              order_no: tIdx + 1,
            })),
          }));
          setAvailableUnits(mappedUnits);
          const initialSelected = new Set<string>();
          mappedUnits.slice(0, 2).forEach((u) => initialSelected.add(u.id));
          setSelectedUnitIds(initialSelected);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingDetails(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [subjectId, topics]);

  if (!isOpen) return null;

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleSelectAllUnits = () => {
    const all = new Set(availableUnits.map((u) => u.id));
    setSelectedUnitIds(all);
  };

  const handleDeselectAllUnits = () => {
    setSelectedUnitIds(new Set());
  };

  // Compute total topics in selected units
  const totalScopedTopicsCount = availableUnits
    .filter((u) => scopeMode === 'all' || selectedUnitIds.has(u.id))
    .reduce((acc, u) => acc + (u.topics?.length || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an exam title.');
      return;
    }
    if (!subjectId) {
      setErrorMsg('Please select a subject.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const selectedUnitsList = availableUnits.filter((u) => scopeMode === 'all' || selectedUnitIds.has(u.id));
    const scopedTopicIds: string[] = [];
    selectedUnitsList.forEach((u) => {
      (u.topics || []).forEach((t) => {
        if (t.id) scopedTopicIds.push(t.id);
      });
    });

    const unitIdsPayload =
      scopeMode === 'units' && selectedUnitIds.size > 0
        ? Array.from(selectedUnitIds)
        : undefined;

    const topicIdsPayload =
      scopeMode === 'units' && scopedTopicIds.length > 0
        ? scopedTopicIds
        : undefined;

    const res = await createExam({
      subject_id: subjectId,
      title: title.trim(),
      exam_date: new Date(examDate).toISOString(),
      total_marks: Number(totalMarks) || 50,
      type: examType,
      unit_ids: unitIdsPayload,
      topic_ids: topicIdsPayload,
    });

    setIsSubmitting(false);

    const createdExam: ApiExam = {
      ...(res || {
        id: `ex_${Date.now()}`,
        user_id: 'usr_me',
        subject_id: subjectId,
        title: title.trim(),
        exam_date: new Date(examDate).toISOString(),
        total_marks: Number(totalMarks) || 50,
        type: examType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      topic_ids: res?.topic_ids && res.topic_ids.length > 0 ? res.topic_ids : scopedTopicIds,
      topics_count: res?.topics_count || scopedTopicIds.length,
    };

    onExamCreated(createdExam);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 32, 42, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="clay-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="clay-icon-pod"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'var(--sky-bg)',
                color: 'var(--sky-text)',
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Schedule Exam & Define Scope
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Set up unit tests, internal assessments, or semester exams.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="clay-btn-flat"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            className="clay-card-flat"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--coral-bg)',
              color: 'var(--coral-text)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subject Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="clay-input"
              style={{ width: '100%', height: '42px', fontWeight: 600, fontSize: '14px' }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Title */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Exam Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Internal Assessment 1, Midterm Exam"
              className="clay-input"
              style={{ width: '100%', height: '42px', fontSize: '14px' }}
            />
          </div>

          {/* Date & Total Marks Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="clay-input"
                style={{ width: '100%', height: '42px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Total Marks
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="clay-input"
                style={{ width: '100%', height: '42px', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Exam Type */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Exam Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { id: 'internal', label: 'Internal' },
                { id: 'semester', label: 'Semester' },
                { id: 'practical', label: 'Practical' },
                { id: 'quiz', label: 'Quiz' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExamType(t.id)}
                  className={`clay-btn ${examType === t.id ? 'clay-btn-dark' : 'clay-btn-light'}`}
                  style={{ height: '36px', fontSize: '12px', fontWeight: 700 }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* B1 Scope Section: Pick Units Covered */}
          <div
            className="clay-card-flat"
            style={{
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-canvas-subtle)',
              border: '1.5px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#0F766E" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Exam Scope (Units Covered)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSelectAllUnits}
                  style={{ background: 'none', border: 'none', color: '#0F766E', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllUnits}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              Internal tests usually cover 1 or 2 units. Readiness will be calculated exclusively for the selected units.
            </p>

            {isLoadingDetails ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                Loading units and topics for this subject...
              </div>
            ) : availableUnits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableUnits.map((u) => {
                  const isChecked = selectedUnitIds.has(u.id);
                  const topicCount = u.topics?.length || 0;
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUnitSelection(u.id)}
                      className="clay-card-flat"
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isChecked ? 'rgba(15, 118, 110, 0.08)' : 'var(--bg-card)',
                        border: isChecked ? '1.5px solid #0F766E' : '1px solid var(--border-clay)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: isChecked ? 'none' : '2px solid var(--border-clay)',
                            backgroundColor: isChecked ? '#0F766E' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {isChecked && <Check size={14} />}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {u.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {topicCount} topics
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No units created yet for this subject. Entire subject topics will be included.
              </div>
            )}

            {/* Scope Summary */}
            <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#0F766E', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} strokeWidth={2.5} />
              <span>{selectedUnitIds.size} Units selected ({totalScopedTopicsCount} topics in exam readiness scope)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="clay-btn clay-btn-light"
              style={{ minHeight: '44px', padding: '0 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn clay-btn-dark"
              style={{ minHeight: '44px', padding: '0 24px', fontSize: '13px', fontWeight: 700 }}
            >
              {isSubmitting ? 'Saving...' : 'Save Exam Scope'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
