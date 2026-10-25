import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { Subject } from '../types';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubject: (subject: Omit<Subject, 'id'>) => Promise<{ ok: boolean; error?: string } | void> | void;
  isPro?: boolean;
  subjectsCount?: number;
  onOpenExamPass?: () => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  onAddSubject,
  isPro = false,
  subjectsCount = 0,
  onOpenExamPass,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [totalTopics, setTotalTopics] = useState(25);
  const [colorTheme, setColorTheme] = useState<Subject['colorTheme']>('sky');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLimitReached = !isPro && subjectsCount >= 2;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      onClose();
      if (onOpenExamPass) onOpenExamPass();
      return;
    }
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onAddSubject({
        name: name.trim(),
        code: code.trim() || 'CS3001',
        progress: 0,
        completedTopics: 0,
        totalTopics: Number(totalTopics) || 20,
        semester: 'current',
        iconType: 'chip',
        colorTheme,
      });

      if (result && !result.ok) {
        setErrorMessage(result.error || 'Failed to save subject.');
        setIsSubmitting(false);
        return;
      }

      setName('');
      setCode('');
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving subject.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 32, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
      className="animate-fade-in"
    >
      <div
        className="clay-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '30px',
          borderRadius: '28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="clay-icon-pod"
              style={{ width: '38px', height: '38px', backgroundColor: 'var(--sky-bg)', color: 'var(--sky-text)' }}
            >
              <BookOpen size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Add New Subject
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {isLimitReached && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#92400E',
              fontSize: '13px',
              lineHeight: '1.45',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ Free Plan Limit Reached ({subjectsCount}/2 Subjects)
            </div>
            Free accounts can add up to 2 subjects. Upgrade to Student OS Pro to unlock unlimited subjects, full AI study planning, and semester syllabus import.
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#B91C1C',
              fontSize: '13px',
              lineHeight: '1.45',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>⚠️ Could not save subject</div>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Subject Name
            </label>
            <input
              type="text"
              required
              disabled={isLimitReached || isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Artificial Intelligence"
              className="clay-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Course Code
            </label>
            <input
              type="text"
              disabled={isLimitReached || isSubmitting}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS3691"
              className="clay-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Estimated Total Topics
            </label>
            <input
              type="number"
              min="5"
              max="60"
              disabled={isLimitReached || isSubmitting}
              value={totalTopics}
              onChange={(e) => setTotalTopics(Number(e.target.value))}
              className="clay-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Color Accent
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['sky', 'amber', 'coral', 'lavender', 'mint'] as const).map((color) => (
                <button
                  type="button"
                  key={color}
                  disabled={isLimitReached || isSubmitting}
                  onClick={() => setColorTheme(color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    border: colorTheme === color ? '3px solid #232B36' : '1px solid var(--border-clay)',
                    backgroundColor:
                      color === 'sky'
                        ? '#2A79E2'
                        : color === 'amber'
                        ? '#CB7309'
                        : color === 'coral'
                        ? '#E3512B'
                        : color === 'lavender'
                        ? '#7C45EB'
                        : '#179354',
                    cursor: (isLimitReached || isSubmitting) ? 'not-allowed' : 'pointer',
                    opacity: (isLimitReached || isSubmitting) ? 0.6 : 1,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="clay-btn clay-btn-light">
              {isLimitReached ? 'Close' : 'Cancel'}
            </button>
            {isLimitReached ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenExamPass) onOpenExamPass();
                }}
                className="clay-btn clay-btn-dark"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                }}
              >
                Upgrade to Pro (₹49)
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="clay-btn clay-btn-dark"
                style={{ minWidth: '120px' }}
              >
                {isSubmitting ? 'Saving...' : 'Save Subject'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
