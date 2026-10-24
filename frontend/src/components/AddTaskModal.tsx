import React, { useState } from 'react';
import { X, CheckSquare } from 'lucide-react';
import { TaskItem, Priority } from '../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  subjectNames: string[];
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  subjectNames,
}) => {
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState(subjectNames[0] || 'Data Structures');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('22 Oct 2026');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title,
      subjectName,
      priority,
      dueDate,
      status: 'todo',
      estimatedMinutes: Number(estimatedMinutes) || 45,
    });
    setTitle('');
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
              style={{ width: '38px', height: '38px', backgroundColor: 'var(--coral-bg)', color: 'var(--coral-text)' }}
            >
              <CheckSquare size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Add New Task
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
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solve Dijkstra Algorithm Problems"
              className="clay-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Related Subject
            </label>
            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="clay-input"
            >
              {subjectNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="General Academic">General Academic</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="clay-input"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Est. Minutes
              </label>
              <input
                type="number"
                min="10"
                max="240"
                step="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="clay-input"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Due Date
            </label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="e.g. 22 Oct 2026"
              className="clay-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="clay-btn clay-btn-light">
              Cancel
            </button>
            <button type="submit" className="clay-btn clay-btn-dark">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
