import React, { useState, useEffect } from 'react';
import { Shield, Lock, Trash2, CheckCircle2, FileText, X, AlertTriangle } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeleteAccount?: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onOpenDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
      {/* Blurred Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 20, 27, 0.45)',
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
          maxWidth: '680px',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-surface)',
          padding: '28px',
          borderRadius: '24px',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--mint-bg)',
                color: 'var(--mint-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--mint-border)',
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Privacy & Academic Terms
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Built Following India DPDP Principles • Student Data Protection
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

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            marginBottom: '16px',
            padding: '4px',
            backgroundColor: 'var(--bg-surface-sunken)',
            borderRadius: '14px',
          }}
        >
          <button
            onClick={() => setActiveTab('privacy')}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'privacy' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'privacy' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'privacy' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'terms' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'terms' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'terms' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Terms of Service
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          {activeTab === 'privacy' ? (
            <>
              <div
                className="clay-recessed"
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  borderLeft: '4px solid #0F6B3C',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Student Data Sovereignty & DPDP Principles
                </div>
                Your academic data belongs exclusively to you. Student OS is built following the Digital Personal Data Protection (DPDP) principles. We do NOT sell, monetize, or share your study patterns, marks, or syllabus files with any third party, advertisers, or colleges.
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  1. Information We Collect and Store
                </h3>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>Account Profile:</strong> Your name, student email address, and cryptographic password hash (bcrypt).</li>
                  <li><strong>Academic Records:</strong> Subjects created, extracted syllabus units, topics, study tasks, and exam schedules.</li>
                  <li><strong>Learning Loop:</strong> Topic self-assessment ratings (strong, okay, weak) used locally by our algorithm to compute memory stability and exam readiness estimates.</li>
                  <li><strong>Notification Subscriptions:</strong> Browser Web Push endpoints and encryption keys (optional, only if push notifications are enabled).</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  2. Strict Cookies & Security Headers
                </h3>
                <p>
                  We only issue strictly necessary <code>httpOnly</code>, <code>SameSite=Lax</code> authentication cookies. JavaScript in the browser cannot read your access token, protecting against cross-site scripting (XSS) and token theft.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  3. Right to Erasure (Account Deletion)
                </h3>
                <p>
                  Under DPDP principles, you have the right to complete erasure. Clicking <strong>Delete Account</strong> in your settings immediately wipes your entire database footprint permanently with cascading deletion across all tables.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  4. Grievance Redressal Desk
                </h3>
                <p>
                  For any privacy inquiries, data export, or grievance redressal, contact our Data Grievance Officer at <strong>grievance@studentos.app</strong>. All requests receive an acknowledgement within 24 hours and resolution within 48 business hours.
                </p>
              </div>
            </>
          ) : (
            <>
              <div
                className="clay-recessed"
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  borderLeft: '4px solid #1A5BB8',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Academic Micro-SaaS Workspace
                </div>
                Student OS is designed to empower engineering students to excel in university exams with scientific spaced repetition and daily planning.
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  1. Permitted Academic Use
                </h3>
                <p>
                  You may upload university syllabi PDFs, lecture notes, and assignments to organize your semester. Automated scraping or denial-of-service attempts are strictly prohibited.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  2. Free & Unlimited Academic Access
                </h3>
                <p>
                  All registered students enjoy unrestricted access to create subjects, schedule exams, log reviews, and import syllabi for academic preparation.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  3. Service Reliability & Offline Guarantee
                </h3>
                <p>
                  Student OS features an installable Progressive Web App (PWA) that caches your schedule and tasks locally so you can continue revising even during hostel Wi-Fi outages.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '12px',
          }}
        >
          {onOpenDeleteAccount ? (
            <button
              onClick={() => {
                onClose();
                onOpenDeleteAccount();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#E3512B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
              <span>Right to Erasure (Delete Account)</span>
            </button>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Last updated: October 2026
            </span>
          )}

          <button
            onClick={onClose}
            className="clay-btn clay-btn-dark"
            style={{ padding: '8px 24px', fontSize: '13px' }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
