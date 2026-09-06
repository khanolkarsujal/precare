import React, { useState } from 'react';
import './ComplaintScreen.css';

/**
 * ComplaintScreen component
 * Captures the patient's primary complaint / health problem.
 *
 * @param {Object} props
 * @param {Object} props.patientInfo - Patient info from step 1 (name, age, language)
 * @param {string} props.initialComplaint - Existing complaint text if revisiting
 * @param {(complaint: string) => void} props.onSubmit - Callback when valid complaint is submitted
 * @param {() => void} props.onBack - Callback to return to step 1
 */
export default function ComplaintScreen({
  patientInfo,
  initialComplaint = '',
  onSubmit,
  onBack,
}) {
  const [complaint, setComplaint] = useState(initialComplaint);
  const [error, setError] = useState('');
  const [micNotice, setMicNotice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!complaint || !complaint.trim()) {
      setError('Please describe your health problem or symptoms');
      return;
    }
    setError('');
    onSubmit(complaint.trim());
  };

  const handleTextChange = (e) => {
    setComplaint(e.target.value);
    if (error && e.target.value.trim()) {
      setError('');
    }
  };

  const handleMicClick = () => {
    setMicNotice(true);
    setTimeout(() => {
      setMicNotice(false);
    }, 4000);
  };

  return (
    <div className="screen-card">
      <div className="complaint-screen-header">
        {patientInfo?.name && (
          <div className="patient-context-pill">
            <span className="patient-context-avatar" aria-hidden="true">
              {patientInfo.name.charAt(0).toUpperCase()}
            </span>
            <span className="patient-context-text">
              Patient: <strong>{patientInfo.name}</strong> ({patientInfo.age} yrs)
            </span>
          </div>
        )}

        <h2 className="screen-heading">
          What health problem are you experiencing today?
        </h2>
        <p className="screen-subheading">
          In your own words, explain your main symptoms, where it hurts, or how long you have been feeling unwell.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <div className="textarea-header">
            <label htmlFor="patient-complaint" className="form-label">
              Describe your symptoms <span className="required-star">*</span>
            </label>
            <span className="char-count">{complaint.length} characters</span>
          </div>

          <textarea
            id="patient-complaint"
            rows="5"
            className={`form-textarea ${error ? 'has-error' : ''}`}
            placeholder="e.g. I have had a severe sore throat and mild headache since yesterday morning. It hurts when swallowing..."
            value={complaint}
            onChange={handleTextChange}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'complaint-error' : undefined}
          />

          {error && (
            <div id="complaint-error" className="form-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Voice Input UI component */}
          <div className="mic-control-container">
            <div className="mic-hint">
              <div className="mic-hint-title-row">
                <span className="mic-hint-title">Prefer speaking?</span>
                <span className="btn-mic-badge">Coming Soon</span>
              </div>
              <span className="mic-hint-sub">Voice input will assist regional languages</span>
            </div>

            <button
              type="button"
              id="btn-mic-input"
              className="btn-mic"
              onClick={handleMicClick}
              aria-label="Microphone voice input (coming soon)"
              title="Voice input is coming soon"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          </div>

          {micNotice && (
            <div className="mic-notice-toast" role="status">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              <span>Voice recording will be enabled in the upcoming update. Please type your symptoms above.</span>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button
            type="button"
            id="btn-back-to-details"
            className="btn btn-secondary"
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="submit"
            id="btn-continue-complaint"
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <span>Continue</span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
