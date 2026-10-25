import React, { useState, useEffect } from 'react';
import {
  Zap,
  Check,
  Copy,
  Clock,
  X,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { getPaymentConfig, submitPayment, PlanInfo } from '../lib/api';

interface ExamPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: (planName: string) => void;
  isPro?: boolean;
}

const DEFAULT_PLANS: PlanInfo[] = [
  {
    id: 'monthly',
    name: '1 Month Sprint',
    price: 49,
    duration_days: 30,
    duration_label: '30 Days',
    features: [
      'Unlimited subjects (free plan limited to 2)',
      'Unlimited syllabus imports (free plan limited to 1)',
    ],
  },
  {
    id: 'semester',
    name: 'Semester Pass',
    price: 99,
    duration_days: 180,
    duration_label: 'Full Semester (6 Months)',
    features: [
      'Unlimited subjects (free plan limited to 2)',
      'Unlimited syllabus imports (free plan limited to 1)',
    ],
  },
];

export const ExamPassModal: React.FC<ExamPassModalProps> = ({
  isOpen,
  onClose,
  isPro = false,
}) => {
  const [plans, setPlans] = useState<PlanInfo[]>(DEFAULT_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('semester');
  const [upiId, setUpiId] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedUtr, setSubmittedUtr] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingConfig(true);
      setErrorMessage(null);
      getPaymentConfig()
        .then((res) => {
          if (res.ok && res.data) {
            setIsConfigured(Boolean(res.data.configured));
            setUpiId(res.data.upi_id || '');
            setPayeeName(res.data.payee_name || '');
            if (res.data.plans && res.data.plans.length > 0) {
              setPlans(res.data.plans);
            }
          } else {
            setIsConfigured(false);
            setUpiId('');
            setPayeeName('');
          }
        })
        .catch(() => {
          setIsConfigured(false);
          setUpiId('');
          setPayeeName('');
        })
        .finally(() => {
          setIsLoadingConfig(false);
        });
    }
  }, [isOpen]);

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  useEffect(() => {
    if (isConfigured && upiId) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || 'Student OS')}&am=${currentPlan.price}&cu=INR&tn=${encodeURIComponent(currentPlan.name)}`;
      QRCode.toDataURL(upiUrl, {
        width: 160,
        margin: 1,
        color: {
          dark: '#1C222B',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => {
          console.error('Failed to generate UPI QR code:', err);
          setQrCodeUrl('');
        });
    } else {
      setQrCodeUrl('');
    }
  }, [isConfigured, upiId, payeeName, currentPlan.price, currentPlan.name]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitPayment = async () => {
    const trimmed = utrNumber.trim();
    if (!/^\d{12}$/.test(trimmed)) {
      setErrorMessage('Please enter a valid 12-digit numeric UPI Ref / UTR number.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await submitPayment(selectedPlanId, trimmed);
    setIsSubmitting(false);

    if (res.ok && res.data) {
      setSubmittedUtr(res.data.utr);
    } else {
      setErrorMessage(res.error || 'Failed to submit payment. Please verify UTR and try again.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(21, 25, 33, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="clay-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-clay)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--coral-bg)',
                color: 'var(--coral-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--coral-border)',
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Semester Exam Pass
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: isPro ? 'var(--mint-bg)' : 'var(--dark-pill-bg)',
                    color: isPro ? 'var(--mint-text)' : '#FFFFFF',
                  }}
                >
                  {isPro ? 'PRO ACTIVE' : 'PRO ACCESS'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Unlock unlimited subjects and syllabus imports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="clay-btn-light"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isLoadingConfig ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Loading payment configuration...
            </p>
          </div>
        ) : submittedUtr ? (
          /* Submission Pending State (No client unlock / verification notice) */
          <div
            className="clay-recessed"
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              borderRadius: '20px',
              margin: '20px 0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--amber-bg)',
                color: 'var(--amber-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid var(--amber-border)',
              }}
            >
              <Clock size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Payment submitted. We verify within 24 hours.
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
              Your reference number <strong>{submittedUtr}</strong> for <strong>{currentPlan.name}</strong> has been received. Pro access will activate automatically once verified by admin.
            </p>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-clay)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--amber-text)',
                marginBottom: '20px',
              }}
            >
              Status: Pending Verification
            </div>
            <div>
              <button
                onClick={onClose}
                className="clay-btn clay-btn-dark"
                style={{ padding: '10px 28px', fontSize: '13px', borderRadius: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Plan Selector Grid (Monthly and Semester Only - Annual Removed) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                const isSemester = p.id === 'semester';
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className="clay-card-flat"
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #E3512B' : '1px solid var(--border-clay)',
                      backgroundColor: isSelected ? 'var(--coral-bg)' : 'var(--bg-surface)',
                      position: 'relative',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {isSemester && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-9px',
                          right: '12px',
                          backgroundColor: '#E3512B',
                          color: '#FFFFFF',
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        STUDENT FAVORITE
                      </span>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                      ₹{p.price}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.duration_label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Features Checklist (Only implemented features listed) */}
            <div
              className="clay-recessed"
              style={{
                padding: '14px 18px',
                borderRadius: '16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Included in Your {currentPlan.name}:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                {currentPlan.features.map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#179354" strokeWidth={3} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isConfigured ? (
              /* Payments Not Configured Guard - Hides QR and UTR form */
              <div
                className="clay-recessed"
                style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  borderRadius: '20px',
                  margin: '18px 0',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--amber-bg)',
                    color: 'var(--amber-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                    border: '1px solid var(--amber-border)',
                  }}
                >
                  <AlertCircle size={26} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Payments are not available yet.
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                  Payment configuration is not set up on this server. Contact the administrator to enable payments.
                </p>
                <button
                  onClick={onClose}
                  className="clay-btn clay-btn-dark"
                  style={{ padding: '8px 24px', fontSize: '13px', borderRadius: '10px' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* UPI Payment Card */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: 'var(--bg-canvas-subtle)',
                    borderRadius: '18px',
                    border: '1px solid var(--border-clay)',
                    marginBottom: '14px',
                  }}
                >
                  {/* Left Column: Dynamic QR Code */}
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '12px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                    >
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt={`UPI Payment QR Code for ${upiId}`}
                          width="140"
                          height="140"
                          style={{ display: 'block', borderRadius: '6px' }}
                        />
                      ) : (
                        <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 className="animate-spin" size={24} color="var(--text-muted)" />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '6px' }}>
                      Scan with GPay / PhonePe / Paytm
                    </div>
                  </div>

                  {/* Right Column: UPI Details & UTR Entry */}
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Payee: <strong>{payeeName}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'var(--bg-surface)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-clay)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {upiId}
                        </span>
                        <button
                          onClick={handleCopyUpi}
                          className="clay-btn-light"
                          style={{ padding: '6px 10px', fontSize: '11px', height: '32px' }}
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? (
                            <>
                              <Check size={12} color="#179354" />
                              <span style={{ color: '#179354', fontWeight: 700 }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
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
                          fontSize: '11px',
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
                        maxLength={12}
                        onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 428910284719"
                        className="clay-input"
                        style={{
                          width: '100%',
                          height: '38px',
                          fontSize: '13px',
                          fontFamily: 'var(--font-mono)',
                          borderRadius: '10px',
                        }}
                      />
                      {errorMessage && (
                        <div style={{ fontSize: '11px', color: '#E3512B', marginTop: '4px', fontWeight: 600 }}>
                          {errorMessage}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSubmitPayment}
                      disabled={isSubmitting || utrNumber.length !== 12}
                      className="clay-btn clay-btn-dark"
                      style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '12px',
                        fontSize: '13px',
                        fontWeight: 800,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: utrNumber.length === 12 ? 1 : 0.6,
                      }}
                    >
                      {isSubmitting ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <span>Submit Payment ({currentPlan.name} — ₹{currentPlan.price})</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Payments verified manually via banking UTR lookup within 24 hours.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
