import React, { useState } from 'react';
import clinicAuthStore from '../services/clinicAuthStore';
import './ClinicLogin.css';

/**
 * ClinicLogin Component
 *
 * Route: /login
 * Heading: "Sign in to your clinic"
 * Fields: Email, Password
 * Button: "Sign In"
 * Link: "Create clinic account"
 */
export default function ClinicLogin({ onLoginSuccess, onNavigateToSignUp, onNavigateToHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    const res = await clinicAuthStore.login(email.trim(), password);
    setLoading(false);

    if (res.ok) {
      onLoginSuccess();
    } else {
      setError(res.error || 'Invalid email or password.');
    }
  };

  return (
    <div className="auth-page-root">
      {/* Header */}
      <header className="auth-header">
        <button type="button" className="auth-brand" onClick={onNavigateToHome}>
          <span className="auth-brand-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          </span>
          <span className="auth-brand-text">PreCare</span>
        </button>
        <button type="button" className="auth-header-link" onClick={onNavigateToSignUp}>
          Create account →
        </button>
      </header>

      {/* Main card */}
      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-badge">Clinic Portal</span>
            <h1 className="auth-title">Sign in to your clinic</h1>
            <p className="auth-subtitle">
              Access your patient queue, review structured histories, and conduct consultations.
            </p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="auth-btn-submit"
              id="btn-sign-in"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-card-footer">
            <span>Don't have a clinic account?</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={onNavigateToSignUp}
              id="link-to-signup"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
