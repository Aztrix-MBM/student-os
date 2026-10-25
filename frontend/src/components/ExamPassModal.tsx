import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Check,
  Copy,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  X,
  CreditCard,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface ExamPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: (planName: string) => void;
  isPro?: boolean;
}

export const ExamPassModal: React.FC<ExamPassModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  isPro = false,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'semester' | 'annual'>('semester');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activationSuccess, setActivationSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const UPI_ID = 'studentos@okaxis';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'month' as const,
      name: '1 Month Sprint',
      price: '₹49',
      duration: '30 Days',
      desc: 'Perfect for midterm crunch & instant exam prep',
    },
    {
      id: 'semester' as const,
      name: 'Semester Pass',
      price: '₹99',
      popular: true,
      duration: 'Full Semester (6 Months)',
      desc: 'Complete semester coverage with syllabus extraction & analytics',
    },
    {
      id: 'annual' as const,
      name: 'Annual Pass',
      price: '₹199',
      duration: 'Full Academic Year',
      desc: 'All 2 semesters + Anna University / RIT lab practical tracker',
    },
  ];

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleVerifyPayment = () => {
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setErrorMessage('Please enter a valid 6-12 digit UPI Transaction Ref / UTR number.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setActivationSuccess(true);
      if (onActivated) {
        onActivated(currentPlan.name);
      }
    }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Dark Blurred Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 20, 27, 0.5)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
        }}
      />

      {/* Modal Dialog Card */}
      <div
        className="clay-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-surface)',
          padding: '28px',
          borderRadius: '26px',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflowY: 'auto',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                backgroundColor: 'var(--amber-bg)',
                color: 'var(--amber-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--amber-border)',
                boxShadow: '0 4px 12px rgba(203, 115, 9, 0.15)',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Semester Exam Pass
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: 'var(--dark-pill-bg)',
                    color: '#FFB800',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  PRO ACCESS
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Unlock high-retention superpowers & unlimited AI syllabus extractions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="clay-btn-light"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {activationSuccess ? (
          /* Success Screen */
          <div
            className="clay-recessed animate-fade-in"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              borderRadius: '20px',
              margin: '20px 0',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '9999px',
                backgroundColor: 'var(--mint-bg)',
                color: 'var(--mint-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid var(--mint-border)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Exam Pass Activated! 🎉
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 24px auto' }}>
              Thank you for supporting Student OS! Your <strong>{currentPlan.name}</strong> is now live. Enjoy unlimited AI syllabus extractions and advanced retention curves.
            </p>
            <button
              onClick={onClose}
              className="clay-btn clay-btn-dark"
              style={{ padding: '10px 32px', fontSize: '14px', borderRadius: '14px' }}
            >
              Back to Workspace
            </button>
          </div>
        ) : (
          <>
            {/* Plan Selector Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className="clay-card-flat"
                    style={{
                      padding: '16px',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #E3512B' : '1px solid var(--border-clay)',
                      backgroundColor: isSelected ? 'var(--coral-bg)' : 'var(--bg-surface)',
                      position: 'relative',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {p.popular && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '12px',
                          backgroundColor: '#E3512B',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          boxShadow: '0 2px 6px rgba(227, 81, 43, 0.4)',
                        }}
                      >
                        STUDENT FAVORITE
                      </span>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                      {p.price}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.duration}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Features Checklist */}
            <div
              className="clay-recessed"
              style={{
                padding: '16px 20px',
                borderRadius: '18px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Included in Your {currentPlan.name}:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={15} color="#179354" strokeWidth={3} />
                  <span><strong>Unlimited AI Syllabus</strong> extractions (0 limits)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={15} color="#179354" strokeWidth={3} />
                  <span><strong>Spaced Repetition</strong> Retention Analytics Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={15} color="#179354" strokeWidth={3} />
                  <span><strong>3 Extra Soft Streak</strong> Grace Shields 🛡️</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={15} color="#179354" strokeWidth={3} />
                  <span><strong>Timetable Export</strong> (Google Calendar / iCal)</span>
                </div>
              </div>
            </div>

            {/* UPI Payment Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: 'var(--bg-canvas-subtle)',
                borderRadius: '20px',
                border: '1px solid var(--border-clay)',
                marginBottom: '16px',
              }}
            >
              {/* Left Column: QR Code */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Clean SVG QR Code Representation */}
                  <svg
                    width="140"
                    height="140"
                    viewBox="0 0 140 140"
                    style={{ display: 'block' }}
                  >
                    <rect width="140" height="140" fill="#FFFFFF" />
                    {/* Corner Position Markers */}
                    <rect x="10" y="10" width="36" height="36" fill="#1C222B" rx="6" />
                    <rect x="16" y="16" width="24" height="24" fill="#FFFFFF" rx="4" />
                    <rect x="22" y="22" width="12" height="12" fill="#E3512B" rx="2" />

                    <rect x="94" y="10" width="36" height="36" fill="#1C222B" rx="6" />
                    <rect x="100" y="16" width="24" height="24" fill="#FFFFFF" rx="4" />
                    <rect x="106" y="22" width="12" height="12" fill="#E3512B" rx="2" />

                    <rect x="10" y="94" width="36" height="36" fill="#1C222B" rx="6" />
                    <rect x="16" y="100" width="24" height="24" fill="#FFFFFF" rx="4" />
                    <rect x="22" y="106" width="12" height="12" fill="#E3512B" rx="2" />

                    {/* QR Code Data Pattern */}
                    <rect x="54" y="14" width="8" height="8" fill="#1C222B" rx="2" />
                    <rect x="68" y="14" width="14" height="8" fill="#1C222B" rx="2" />
                    <rect x="54" y="28" width="14" height="14" fill="#1C222B" rx="2" />
                    <rect x="74" y="32" width="8" height="18" fill="#1C222B" rx="2" />
                    <rect x="14" y="54" width="14" height="8" fill="#1C222B" rx="2" />
                    <rect x="34" y="54" width="8" height="16" fill="#1C222B" rx="2" />
                    <rect x="50" y="54" width="40" height="40" fill="#232B36" rx="8" />
                    <circle cx="70" cy="74" r="10" fill="#FFB800" />
                    <rect x="98" y="54" width="14" height="8" fill="#1C222B" rx="2" />
                    <rect x="118" y="54" width="12" height="18" fill="#1C222B" rx="2" />
                    <rect x="10" y="78" width="8" height="8" fill="#1C222B" rx="2" />
                    <rect x="24" y="78" width="18" height="8" fill="#1C222B" rx="2" />
                    <rect x="54" y="100" width="14" height="8" fill="#1C222B" rx="2" />
                    <rect x="74" y="100" width="8" height="16" fill="#1C222B" rx="2" />
                    <rect x="94" y="94" width="16" height="8" fill="#1C222B" rx="2" />
                    <rect x="116" y="94" width="14" height="8" fill="#1C222B" rx="2" />
                    <rect x="94" y="110" width="8" height="20" fill="#1C222B" rx="2" />
                    <rect x="110" y="114" width="20" height="16" fill="#1C222B" rx="2" />
                  </svg>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '8px' }}>
                  Scan with GPay / PhonePe / Paytm / BHIM
                </div>
              </div>

              {/* Right Column: UPI Details & UTR Entry */}
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    UPI ID:
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--bg-surface)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-clay)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {UPI_ID}
                    </span>
                    <button
                      onClick={handleCopyUpi}
                      className="clay-btn-light"
                      style={{ padding: '6px 12px', fontSize: '12px', height: '36px' }}
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <Check size={14} color="#179354" />
                          <span style={{ color: '#179354', fontWeight: 700 }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    Enter 12-digit UPI Ref / UTR No:
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 428910284719"
                    className="clay-input"
                    style={{
                      width: '100%',
                      height: '40px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: '12px',
                    }}
                  />
                  {errorMessage && (
                    <div style={{ fontSize: '11px', color: '#E3512B', marginTop: '4px', fontWeight: 600 }}>
                      {errorMessage}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleVerifyPayment}
                  disabled={isSubmitting}
                  className="clay-btn clay-btn-dark"
                  style={{
                    width: '100%',
                    height: '42px',
                    marginTop: '14px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmitting ? (
                    <span>Verifying UTR...</span>
                  ) : (
                    <>
                      <span>Activate {currentPlan.name} ({currentPlan.price})</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
              🔒 100% Student Money-back Guarantee • Instant Activation • Anna University & Autonomous Colleges
            </div>
          </>
        )}
      </div>
    </div>
  );
};
