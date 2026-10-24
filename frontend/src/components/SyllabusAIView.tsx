import React, { useState } from 'react';
import { Sparkles, FileText, Upload, Plus, Trash2, CheckCircle2, ArrowRight, BookOpen } from 'lucide-react';
import { ScreenView } from '../types';

interface SyllabusAIViewProps {
  onNavigate: (view: ScreenView) => void;
  onAddExtractedSubject: (name: string, code: string, unitsCount: number, topicsCount: number) => void;
}

interface DraftUnit {
  id: string;
  name: string;
  examWeight: number;
  topics: Array<{ id: string; name: string; importance: number }>;
}

export const SyllabusAIView: React.FC<SyllabusAIViewProps> = ({ onNavigate, onAddExtractedSubject }) => {
  const [syllabusText, setSyllabusText] = useState(
`ANNA UNIVERSITY CHENNAI : : B.E. COMPUTER SCIENCE AND ENGINEERING
CS3351 DATA STRUCTURES
UNIT I LINEAR DATA STRUCTURES
Introduction to Data Structures – Arrays – Linked List Implementation – Singly Linked List – Doubly Linked List – Circular Linked List – Applications of Linked Lists – Stack Implementation – Queue Implementation – Applications of Stacks and Queues.
UNIT II TREE STRUCTURES
Tree Traversals – Binary Trees – Binary Search Trees (BST) – Operations on BST – AVL Trees – Rotations and Balancing – B-Trees – B+ Trees – Priority Queues and Binary Heaps.
UNIT III GRAPH ALGORITHMS
Graph Representations – Breadth First Search (BFS) – Depth First Search (DFS) – Topological Sort – Shortest Path Algorithms: Dijkstra's Algorithm – Minimum Spanning Tree: Prim's and Kruskal's Algorithms.
UNIT IV SORTING AND HASHING
Sorting Algorithms: Insertion Sort, Quick Sort, Merge Sort, Heap Sort – Hashing: Hash Functions, Separate Chaining, Open Addressing, Rehashing.`
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [unitsTree, setUnitsTree] = useState<DraftUnit[] | null>(null);

  const handleExtract = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setUnitsTree([
        {
          id: 'u1',
          name: 'Unit I – Linear Data Structures',
          examWeight: 0.9,
          topics: [
            { id: 't1', name: 'Arrays & Singly Linked Lists', importance: 0.8 },
            { id: 't2', name: 'Doubly & Circular Linked Lists', importance: 0.75 },
            { id: 't3', name: 'Stack & Queue Applications', importance: 0.9 },
          ],
        },
        {
          id: 'u2',
          name: 'Unit II – Tree Structures',
          examWeight: 1.0,
          topics: [
            { id: 't4', name: 'Binary Trees & Traversals', importance: 0.85 },
            { id: 't5', name: 'Binary Search Trees (BST)', importance: 0.95 },
            { id: 't6', name: 'AVL Tree Rotations', importance: 1.0 },
            { id: 't7', name: 'B-Trees & B+ Trees', importance: 0.8 },
          ],
        },
        {
          id: 'u3',
          name: 'Unit III – Graph Algorithms',
          examWeight: 0.95,
          topics: [
            { id: 't8', name: 'BFS and DFS Traversals', importance: 0.9 },
            { id: 't9', name: "Dijkstra's Shortest Path", importance: 0.95 },
            { id: 't10', name: "Prim's & Kruskal's MST", importance: 0.85 },
          ],
        },
        {
          id: 'u4',
          name: 'Unit IV – Sorting & Hashing',
          examWeight: 0.85,
          topics: [
            { id: 't11', name: 'Quick Sort & Merge Sort', importance: 0.8 },
            { id: 't12', name: 'Hash Functions & Separate Chaining', importance: 0.85 },
          ],
        },
      ]);
    }, 900);
  };

  const handleAddTopic = (unitId: string) => {
    const topicName = prompt('Enter new topic title:');
    if (!topicName || !unitsTree) return;
    setUnitsTree(
      unitsTree.map((u) =>
        u.id === unitId
          ? {
              ...u,
              topics: [...u.topics, { id: `t_${Date.now()}`, name: topicName, importance: 0.8 }],
            }
          : u
      )
    );
  };

  const handleDeleteTopic = (unitId: string, topicId: string) => {
    if (!unitsTree) return;
    setUnitsTree(
      unitsTree.map((u) =>
        u.id === unitId ? { ...u, topics: u.topics.filter((t) => t.id !== topicId) } : u
      )
    );
  };

  const handleConfirmAndSave = () => {
    if (!unitsTree) return;
    const totalTopics = unitsTree.reduce((acc, u) => acc + u.topics.length, 0);
    onAddExtractedSubject('Data Structures & Algorithms', 'CS3351', unitsTree.length, totalTopics);
    alert(`Successfully imported ${unitsTree.length} units and ${totalTopics} topics into your academic study plan!`);
    onNavigate('readiness');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            className="clay-icon-pod"
            style={{
              width: '42px',
              height: '42px',
              backgroundColor: 'var(--lavender-bg)',
              color: 'var(--lavender-text)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Syllabus AI Extractor
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Paste syllabus text or PDF. Extracted units & topics are fully editable before saving.
            </p>
          </div>
        </div>
      </div>

      {!unitsTree ? (
        /* Step 1: Input Syllabus Text */
        <div className="clay-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Paste Syllabus Text
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Sample: Anna University / RIT CSE Curriculum
            </span>
          </div>

          <textarea
            rows={10}
            value={syllabusText}
            onChange={(e) => setSyllabusText(e.target.value)}
            className="clay-input"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginTop: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <FileText size={16} />
              <span>Max 5 MB • Strict JSON schema validated</span>
            </div>

            <button
              onClick={handleExtract}
              disabled={isProcessing}
              className="clay-btn clay-btn-dark"
              style={{ minWidth: '180px' }}
            >
              {isProcessing ? (
                <>Parsing Units & Topics...</>
              ) : (
                <>
                  <Sparkles size={16} /> Extract Units & Topics
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Step 2: Editable Tree Preview (from BUILD_GUIDE.md Section 7) */
        <div className="clay-card" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <span className="clay-pill-mint" style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px' }}>
                Draft Ready
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                Review Topics before Saving
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                You can rename, delete, add topics, or adjust exam weightage.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setUnitsTree(null)}
                className="clay-btn clay-btn-light"
                style={{ fontSize: '13px', height: '40px' }}
              >
                Re-paste Text
              </button>
              <button
                onClick={handleConfirmAndSave}
                className="clay-btn clay-btn-dark"
                style={{ fontSize: '13px', height: '40px' }}
              >
                <CheckCircle2 size={16} /> Confirm & Save to Subjects
              </button>
            </div>
          </div>

          {/* Units and Topics List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {unitsTree.map((unit) => (
              <div
                key={unit.id}
                className="clay-card-flat"
                style={{ padding: '20px 22px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={18} color="var(--text-secondary)" />
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {unit.name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Exam Weight: {Math.round(unit.examWeight * 100)}%
                    </span>
                    <button
                      onClick={() => handleAddTopic(unit.id)}
                      className="clay-btn clay-btn-light"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                    >
                      <Plus size={13} /> Add Topic
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unit.topics.map((top) => (
                    <div
                      key={top.id}
                      className="clay-recessed"
                      style={{
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {top.name}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Yield: {Math.round(top.importance * 100)}%
                        </span>
                        <button
                          onClick={() => handleDeleteTopic(unit.id, top.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--coral-text)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Remove Topic"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
