import React, { useState } from 'react';
import { Zap, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { ScreenView } from '../types';
import { registerUser, UserAuthResponse } from '../lib/api';

interface SignUpPageProps {
  onNavigate: (view: ScreenView) => void;
  onSignUpSuccess: (user: UserAuthResponse) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, onSignUpSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!isAdult) {
      setErrorMessage('You must confirm that you are 18 years of age or older to register.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Principles.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerUser(name, email, password, 180);
    setIsSubmitting(false);

    if (result.ok && result.user) {
      onSignUpSuccess(result.user);
    } else {
      setErrorMessage(result.error || 'Registration failed.');
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      className="animate-fade-in"
    >
      <div
        className="clay-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px 32px',
          borderRadius: '32px',
          textAlign: 'center',
        }}
      >
        {/* Brand Icon */}
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            backgroundColor: 'var(--dark-pill-bg)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: '4px 6px 16px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Zap size={26} fill="#FFB800" stroke="#FFB800" />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Create Your Account
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '22px' }}>
          Join and take control of your academics
        </p>

        {errorMessage && (
          <div
            className="clay-card-flat"
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              backgroundColor: 'var(--coral-bg)',
              borderColor: 'var(--coral-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <AlertCircle size={18} color="var(--coral-text)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--coral-text)' }}>
              {errorMessage}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="clay-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="clay-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="clay-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="clay-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <input
              type="checkbox"
              required
              checked={isAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
              style={{ accentColor: '#232B36', width: '16px', height: '16px' }}
            />
            <span>I am 18 years of age or older</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              style={{ accentColor: '#232B36', width: '16px', height: '16px' }}
            />
            <span>I agree to the Terms of Service & Privacy Principles</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="clay-btn clay-btn-dark"
            style={{ width: '100%', marginTop: '10px', height: '46px', fontSize: '15px' }}
          >
            {isSubmitting ? 'Creating account...' : (
              <>Sign Up <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <span
            onClick={() => onNavigate('login')}
            style={{ fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};
