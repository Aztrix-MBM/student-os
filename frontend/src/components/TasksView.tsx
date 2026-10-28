import React, { useState } from 'react';
import { Plus, Check, Calendar, Trash2, MoreVertical, Clock } from 'lucide-react';
import { TaskItem, TaskStatus, Priority } from '../types';

interface TasksViewProps {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onOpenAddTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onOpenAddTask,
}) => {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return (
          <span
            className="clay-pill-coral"
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            High
          </span>
        );
      case 'medium':
        return (
          <span
            className="clay-pill-amber"
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span
            className="clay-pill-mint"
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            Low
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Header and Controls */}
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
            Tasks
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Keep track of your assignments and work.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Filter Tabs matching reference panel 6 */}
          <div className="clay-tab-bar" style={{ flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              className={`clay-tab-item ${filter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('todo')}
              className={`clay-tab-item ${filter === 'todo' ? 'active' : ''}`}
            >
              To Do
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`clay-tab-item ${filter === 'in_progress' ? 'active' : ''}`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`clay-tab-item ${filter === 'completed' ? 'active' : ''}`}
            >
              Completed
            </button>
          </div>

          <button onClick={onOpenAddTask} className="clay-btn clay-btn-dark">
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      {/* Task List matching reference panel 6 */}
      <div className="clay-card" style={{ padding: '16px 20px' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '9999px',
                backgroundColor: 'var(--coral-bg)',
                color: 'var(--coral-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid var(--coral-border)',
              }}
            >
              <Check size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              All clear! No tasks here
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto 20px auto' }}>
              Add assignments, lab records, or exam revisions to keep your daily study streak on track.
            </p>
            <button onClick={onOpenAddTask} className="clay-btn clay-btn-dark">
              <Plus size={16} /> Add Task
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className="clay-card-flat"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Left: Checkbox & Task Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div
                      onClick={() => onToggleTask(task.id)}
                      className={isCompleted ? 'clay-btn-dark' : 'clay-recessed'}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '7px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        backgroundColor: isCompleted ? 'var(--dark-pill-bg)' : 'var(--bg-canvas-subtle)',
                        border: '1.5px solid var(--border-clay)',
                      }}
                    >
                      {isCompleted && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </div>
                      {task.subjectName && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {task.subjectName} • {task.estimatedMinutes} min
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Priority, Due Date, Options */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    {getPriorityBadge(task.priority)}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Calendar size={15} color="var(--text-muted)" />
                      <span>{task.dueDate}</span>
                    </div>

                    <button
                      onClick={() => onDeleteTask(task.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Delete Task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
