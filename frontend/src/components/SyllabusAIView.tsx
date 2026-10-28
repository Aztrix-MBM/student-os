import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  Clock,
  Layers,
  Edit2,
  Check,
} from 'lucide-react';
import { ScreenView } from '../types';
import {
  extractSyllabusText,
  uploadSyllabusPdf,
  confirmSyllabus,
  getSyllabusLimits,
  fetchSubjects,
  createSubject,
  ApiSubject,
  SyllabusUnitDraft,
  SyllabusTopicDraft,
} from '../lib/api';

interface SyllabusAIViewProps {
  onNavigate: (view: ScreenView) => void;
  onAddExtractedSubject?: (
    subjectId: string,
    name: string,
    code: string,
    unitsCount: number,
    topicsCount: number,
    unitsTree: SyllabusUnitDraft[]
  ) => void;
}

export const SyllabusAIView: React.FC<SyllabusAIViewProps> = ({ onNavigate, onAddExtractedSubject }) => {
  const [syllabusText, setSyllabusText] = useState(
`ANNA UNIVERSITY CHENNAI : : B.E. COMPUTER SCIENCE AND ENGINEERING
CS3351 DATA STRUCTURES
UNIT I LINEAR DATA STRUCTURES - LIST
Abstract Data Types (ADTs) – List ADT – Array-based implementation – Linked list implementation – Singly linked lists – Circularly linked lists – Doubly-linked lists – Applications of lists – Polynomial Addition.
UNIT II LINEAR DATA STRUCTURES - STACKS, QUEUES
Stack ADT – Operations – Applications: Evaluating arithmetic expressions, Conversion of Infix to Postfix expression – Queue ADT – Operations – Circular Queue – Priority Queue – Deque – Applications of Queues.
UNIT III NON LINEAR DATA STRUCTURES - TREES
Tree ADT – Tree Traversals – Binary Tree ADT – Expression Trees – Binary Search Tree ADT – AVL Trees – Priority Queue (Heaps) – Binary Heap – B-Trees.
UNIT IV NON LINEAR DATA STRUCTURES - GRAPHS
Definition – Representation of Graphs – Breadth-first traversal – Depth-first traversal – Topological Sort – Shortest Path Algorithms: Dijkstra's algorithm – Minimum Spanning Tree: Prim's and Kruskal's algorithms.
UNIT V SEARCHING, SORTING AND HASHING TECHNIQUES
Searching: Linear Search – Binary Search. Sorting: Bubble Sort – Selection Sort – Insertion Sort – Radix Sort – Quick Sort – Merge Sort. Hashing: Hash Functions – Separate Chaining – Open Addressing – Rehashing.`
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [unitsTree, setUnitsTree] = useState<SyllabusUnitDraft[] | null>(null);
  const [limits, setLimits] = useState<{ limit: number; used_today: number; remaining_today: number } | null>(null);

  // Subject assignment
  const [existingSubjects, setExistingSubjects] = useState<ApiSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('new');
  const [newSubjectName, setNewSubjectName] = useState<string>('Data Structures');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('CS3351');

  // Inline editing state for topics
  const [editingTopicKey, setEditingTopicKey] = useState<string | null>(null);
  const [editingTopicText, setEditingTopicText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load subjects and user extraction quota
    fetchSubjects().then((subs: ApiSubject[]) => setExistingSubjects(subs));
    getSyllabusLimits().then((l) => {
      if (l) setLimits(l);
    });
  }, []);

  const handleExtractText = async () => {
    if (!syllabusText.trim()) {
      setErrorMessage('Please enter or paste syllabus text to parse.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    setCacheNotice(null);

    const subId = selectedSubjectId !== 'new' ? selectedSubjectId : undefined;
    const res = await extractSyllabusText(syllabusText, subId);
    setIsProcessing(false);

    if (!res.ok || !res.data) {
      setErrorMessage(res.error || 'Failed to extract syllabus. Please check your text.');
      return;
    }

    setUnitsTree(res.data.units);
    if (res.data.cached) {
      setCacheNotice('Retrieved instantly from cache (0 tokens consumed)');
    } else if (res.data.message) {
      setCacheNotice(res.data.message);
    }

    // Refresh limits
    getSyllabusLimits().then((l) => l && setLimits(l));
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('PDF file exceeds the 10 MB maximum size limit.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCacheNotice(null);

    const subId = selectedSubjectId !== 'new' ? selectedSubjectId : undefined;
    const res = await uploadSyllabusPdf(file, subId);
    setIsProcessing(false);

    if (!res.ok || !res.data) {
      setErrorMessage(res.error || 'Failed to parse PDF syllabus.');
      return;
    }

    setUnitsTree(res.data.units);
    if (res.data.cached) {
      setCacheNotice('Retrieved instantly from cache (0 tokens consumed)');
    } else if (res.data.message) {
      setCacheNotice(res.data.message);
    }

    getSyllabusLimits().then((l) => l && setLimits(l));
  };

  const handleAddTopic = (unitIndex: number) => {
    const topicName = prompt('Enter new topic title:');
    if (!topicName || !unitsTree) return;

    const updated = [...unitsTree];
    const unit = updated[unitIndex];
    unit.topics.push({
      name: topicName.trim(),
      importance: 0.8,
      difficulty: 3,
      order_no: unit.topics.length + 1,
    });
    setUnitsTree(updated);
  };

  const handleDeleteTopic = (unitIndex: number, topicIndex: number) => {
    if (!unitsTree) return;
    const updated = [...unitsTree];
    updated[unitIndex].topics.splice(topicIndex, 1);
    setUnitsTree(updated);
  };

  const handleToggleImportance = (unitIndex: number, topicIndex: number) => {
    if (!unitsTree) return;
    const updated = [...unitsTree];
    const top = updated[unitIndex].topics[topicIndex];
    // Rotate between 0.9 (High), 0.65 (Medium), 0.35 (Low)
    if (top.importance >= 0.8) {
      top.importance = 0.65;
    } else if (top.importance >= 0.5) {
      top.importance = 0.35;
    } else {
      top.importance = 0.9;
    }
    setUnitsTree(updated);
  };

  const handleConfirmAndSave = async () => {
    if (!unitsTree || unitsTree.length === 0) return;
    setIsConfirming(true);
    setErrorMessage(null);

    let targetSubjectId = selectedSubjectId;

    // Create new subject if 'new' selected
    if (targetSubjectId === 'new') {
      const createdRes = await createSubject({
        name: newSubjectName.trim() || 'Extracted Subject',
        code: newSubjectCode.trim() || 'SUB101',
        semester: 'Semester 1',
        color_theme: 'lavender',
      });
      if (!createdRes.ok || !createdRes.data) {
        setIsConfirming(false);
        setErrorMessage(createdRes.error || 'Failed to create academic subject for this syllabus.');
        return;
      }
      targetSubjectId = createdRes.data.id;
    }

    const res = await confirmSyllabus(targetSubjectId, unitsTree);
    setIsConfirming(false);

    if (!res.ok) {
      setErrorMessage(res.error || 'Failed to save confirmed syllabus to academic core.');
      return;
    }

    const totalTopics = unitsTree.reduce((acc, u) => acc + u.topics.length, 0);
    const chosenName = selectedSubjectId !== 'new'
      ? (existingSubjects.find(s => s.id === selectedSubjectId)?.name || newSubjectName)
      : newSubjectName;
    const chosenCode = selectedSubjectId !== 'new'
      ? (existingSubjects.find(s => s.id === selectedSubjectId)?.code || newSubjectCode)
      : newSubjectCode;

    if (onAddExtractedSubject) {
      onAddExtractedSubject(targetSubjectId, chosenName, chosenCode, unitsTree.length, totalTopics, unitsTree);
    }

    alert(`Successfully saved ${unitsTree.length} units and ${totalTopics} topics into your Academic Core! Opening Exam Readiness to rate your topics.`);
    onNavigate('readiness');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="clay-icon-pod"
            style={{
              width: '46px',
              height: '46px',
              backgroundColor: 'var(--lavender-bg)',
              color: 'var(--lavender-text)',
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Import Syllabus
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Paste syllabus text or upload PDF. Review and fine-tune units & topics before saving.
            </p>
          </div>
        </div>

        {/* Quota Badge */}
        {limits && (
          <div className="clay-card-flat" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={15} color="var(--lavender-text)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {limits.remaining_today} / {limits.limit} extractions left today
            </span>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          className="clay-card-flat"
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--coral-bg)',
            color: 'var(--coral-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '220px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
          {(errorMessage.toLowerCase().includes('log in') ||
            errorMessage.toLowerCase().includes('session') ||
            errorMessage.toLowerCase().includes('authentication') ||
            errorMessage.toLowerCase().includes('cookie')) && (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="clay-btn clay-btn-dark"
              style={{
                height: '32px',
                padding: '0 14px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              Log In Now
            </button>
          )}
        </div>
      )}

      {/* Cache notification */}
      {cacheNotice && (
        <div
          className="clay-card-flat"
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--mint-bg)',
            color: 'var(--mint-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{cacheNotice}</span>
        </div>
      )}

      {!unitsTree ? (
        /* STEP 1: Input text or PDF */
        <div className="clay-card" style={{ padding: '28px' }}>
          {/* Target Subject Selector */}
          <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '240px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Assign to Subject:
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="clay-input"
                style={{ height: '42px', fontSize: '14px', fontWeight: 600 }}
              >
                <option value="new">+ Create New Subject</option>
                {existingSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedSubjectId === 'new' && (
              <>
                <div style={{ flex: '1', minWidth: '180px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Subject Name:
                  </label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="clay-input"
                    style={{ height: '42px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ width: '130px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Code:
                  </label>
                  <input
                    type="text"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="e.g. CS3451"
                    className="clay-input"
                    style={{ height: '42px', fontSize: '14px' }}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Paste Syllabus Text
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Supports Anna University / VTU / JNTU format
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
              marginTop: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handlePdfUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="clay-btn clay-btn-light"
                style={{ height: '42px', fontSize: '13px' }}
              >
                <Upload size={16} /> Upload PDF Syllabus
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Max 10 MB • Text PDF</span>
            </div>

            <button
              onClick={handleExtractText}
              disabled={isProcessing}
              className="clay-btn clay-btn-dark"
              style={{ minWidth: '190px', height: '44px' }}
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
        /* STEP 2: Editable Tree Preview */
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
                Draft Ready (Not yet saved)
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                Review & Edit Topics
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Click chips to toggle yield (High/Med/Low). Add or delete topics before finalizing.
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
                disabled={isConfirming}
                className="clay-btn clay-btn-dark"
                style={{ fontSize: '13px', height: '40px', minWidth: '180px' }}
              >
                {isConfirming ? (
                  <>Saving to Academic Core...</>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirm & Save to Subjects
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Units and Topics List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {unitsTree.map((unit, uIdx) => (
              <div key={uIdx} className="clay-card-flat" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={18} color="var(--lavender-text)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {unit.name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Weight: {Math.round(unit.exam_weight * 100)}%
                    </span>
                    <button
                      onClick={() => handleAddTopic(uIdx)}
                      className="clay-btn clay-btn-light"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                    >
                      <Plus size={13} /> Add Topic
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unit.topics.map((top, tIdx) => {
                    const isEditing = editingTopicKey === `${uIdx}-${tIdx}`;
                    const importanceBadge =
                      top.importance >= 0.8
                        ? { label: 'High Yield', style: { backgroundColor: 'var(--coral-bg)', color: 'var(--coral-text)' } }
                        : top.importance >= 0.5
                        ? { label: 'Med Yield', style: { backgroundColor: 'var(--sky-bg)', color: 'var(--sky-text)' } }
                        : { label: 'Low Yield', style: { backgroundColor: 'var(--mint-bg)', color: 'var(--mint-text)' } };

                    return (
                      <div
                        key={tIdx}
                        className="clay-recessed"
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <input
                              type="text"
                              value={editingTopicText}
                              onChange={(e) => setEditingTopicText(e.target.value)}
                              className="clay-input"
                              style={{ height: '32px', fontSize: '13px' }}
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (editingTopicText.trim()) {
                                  top.name = editingTopicText.trim();
                                }
                                setEditingTopicKey(null);
                              }}
                              className="clay-btn clay-btn-dark"
                              style={{ height: '32px', padding: '0 8px' }}
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {top.name}
                            </span>
                            <button
                              onClick={() => {
                                setEditingTopicKey(`${uIdx}-${tIdx}`);
                                setEditingTopicText(top.name);
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Rename topic"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleImportance(uIdx, tIdx)}
                            style={{
                              ...importanceBadge.style,
                              border: 'none',
                              borderRadius: '9999px',
                              padding: '3px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Click to toggle yield weight"
                          >
                            {importanceBadge.label} ({Math.round(top.importance * 100)}%)
                          </button>

                          <button
                            onClick={() => handleDeleteTopic(uIdx, tIdx)}
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
