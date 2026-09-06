import React from 'react';
import './WelcomeScreen.css';

/**
 * WelcomeScreen component
 * Initial greeting introducing PreCare to the patient.
 *
 * @param {Object} props
 * @param {() => void} props.onStart - Callback to proceed to patient details form
 */
export default function WelcomeScreen({ onStart }) {
  return (
    <div className="screen-card welcome-card">
      <div className="welcome-header">
        <div className="welcome-icon-wrapper" aria-hidden="true">
          <svg className="welcome-hero-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M12 9v6" />
            <path d="M9 12h6" />
          </svg>
        </div>
        <span className="welcome-badge">Quick Pre-Consultation</span>
        <h1 className="welcome-title">Welcome to PreCare</h1>
        <p className="welcome-description">
          Complete your health history before your consultation so your doctor can focus more on your care.
        </p>
      </div>

      <div className="welcome-benefits">
        <div className="benefit-item">
          <div className="benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="benefit-text">
            <strong>Saves consultation time</strong>
            <span>Your doctor reviews your information before meeting you</span>
          </div>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="benefit-text">
            <strong>Private & Secure</strong>
            <span>Shared only directly with your consulting doctor</span>
          </div>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 8 6 6" />
              <path d="m4 14 6-6 2-3" />
              <path d="M2 5h12" />
              <path d="M7 2h1" />
              <path d="m22 22-5-10-5 10" />
              <path d="M14 18h6" />
            </svg>
          </div>
          <div className="benefit-text">
            <strong>Easy Language Support</strong>
            <span>Available in English, Hindi (हिंदी), and Marathi (मराठी)</span>
          </div>
        </div>
      </div>

      <div className="welcome-cta">
        <button
          type="button"
          id="btn-start-intake"
          className="btn btn-primary btn-block"
          onClick={onStart}
        >
          <span>Start Health Intake</span>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="disclaimer-banner" role="note">
        <svg className="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          PreCare assists your doctor with pre-consultation intake. It does not provide medical diagnosis or emergency treatment.
        </span>
      </div>
    </div>
  );
}
