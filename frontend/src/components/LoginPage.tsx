import React, { useState } from 'react';
import { Zap, Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { ScreenView } from '../types';
import { loginUser, registerUser, UserAuthResponse } from '../lib/api';

interface LoginPageProps {
  onNavigate: (view: ScreenView) => void;
  onLoginSuccess: (user: UserAuthResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginUser(email.trim(), password);
    setIsSubmitting(false);

    if (result.ok && result.user) {
      onLoginSuccess(result.user);
    } else {
      setErrorMessage(result.error || 'Invalid email or password.');
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
          maxWidth: '440px',
          padding: '40px 32px',
          borderRadius: '32px',
          textAlign: 'center',
        }}
      >
        {/* Brand Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            backgroundColor: 'var(--dark-pill-bg)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '4px 6px 16px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Zap size={28} fill="#FFB800" stroke="#FFB800" />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Student OS
        </h2>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Welcome Back
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Continue your academic journey
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
              marginBottom: '18px',
              textAlign: 'left',
            }}
          >
            <AlertCircle size={18} color="var(--coral-text)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--coral-text)' }}>
              {errorMessage}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="clay-input"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', marginTop: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#232B36', width: '16px', height: '16px' }}
              />
              Remember me
            </label>
            <span
              onClick={() => alert('Password reset instructions will be sent to your email.')}
              style={{ color: '#2A79E2', fontWeight: 600, cursor: 'pointer' }}
            >
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="clay-btn clay-btn-dark"
            style={{ width: '100%', marginTop: '8px', height: '46px', fontSize: '15px' }}
          >
            {isSubmitting ? 'Authenticating...' : (
              <>Login <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <span
            onClick={() => onNavigate('signup')}
            style={{ fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};
