import React, { useState } from 'react';
import clinicAuthStore from '../services/clinicAuthStore';
import './ClinicSignUp.css';

/**
 * ClinicSignUp Component
 *
 * Route: /signup
 * Heading: "Create your clinic account"
 * Fields: Clinic Name, Doctor Name, Email, Phone Number, Password, Confirm Password
 * Button: "Create Clinic Account"
 * Link: "Already have an account? Sign in"
 */
export default function ClinicSignUp({ onNavigateToLogin, onNavigateToSetup, onNavigateToHome }) {
  const [formData, setFormData] = useState({
    clinicName: '',
    doctorName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.clinicName.trim()) {
      setError('Please enter your clinic name.');
      return;
    }
    if (!formData.doctorName.trim()) {
      setError('Please enter the primary doctor\'s name.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please provide a valid email format (e.g., doctor@clinic.com).');
      return;
    }
    if (!formData.password) {
      setError('Please enter a password.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    const result = await clinicAuthStore.signup({
      clinicName: formData.clinicName.trim(),
      doctorName: formData.doctorName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
    });

    setLoading(false);

    if (result.ok) {
      onNavigateToSetup();
    } else {
      setError(result.error || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div className="auth-page-root">
      {/* Top navigation banner */}
      <header className="auth-header">
        <button type="button" className="auth-brand" onClick={onNavigateToHome}>
          <span className="auth-brand-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          </span>
          <span className="auth-brand-text">PreCare</span>
        </button>
        <button type="button" className="auth-header-link" onClick={onNavigateToLogin}>
          Sign in →
        </button>
      </header>

      {/* Main Card */}
      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-badge">Clinic Registration</span>
            <h1 className="auth-title">Create your clinic account</h1>
            <p className="auth-subtitle">
              Start collecting organized patient histories before consultation in minutes.
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
              <label htmlFor="clinicName">Clinic Name *</label>
              <input
                type="text"
                id="clinicName"
                name="clinicName"
                placeholder="e.g. Apex Health Clinic"
                value={formData.clinicName}
                onChange={handleChange}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="doctorName">Doctor Name *</label>
              <input
                type="text"
                id="doctorName"
                name="doctorName"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={formData.doctorName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="doctor@clinic.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-btn-submit"
              id="btn-create-clinic"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Clinic Account'}
            </button>
          </form>

          <div className="auth-card-footer">
            <span>Already have an account?</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={onNavigateToLogin}
              id="link-to-login"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
