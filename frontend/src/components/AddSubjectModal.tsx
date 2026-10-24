import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { Subject } from '../types';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubject: (subject: Omit<Subject, 'id'>) => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isOpen, onClose, onAddSubject }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [totalTopics, setTotalTopics] = useState(25);
  const [colorTheme, setColorTheme] = useState<Subject['colorTheme']>('sky');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddSubject({
      name,
      code: code || 'CS3001',
      progress: 0,
      completedTopics: 0,
      totalTopics: Number(totalTopics) || 20,
      semester: 'current',
      iconType: 'chip',
      colorTheme,
    });
    setName('');
    setCode('');
    onClose();
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Subject Name
            </label>
            <input
              type="text"
              required
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
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="clay-btn clay-btn-light">
              Cancel
            </button>
            <button type="submit" className="clay-btn clay-btn-dark">
              Save Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
