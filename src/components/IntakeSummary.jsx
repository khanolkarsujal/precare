import React, { useState } from 'react';
import caseStore from '../services/caseStore';
import './IntakeSummary.css';

/**
 * IntakeSummary component
 * Displays both the structured clinical history and full conversation log
 * for the consulting doctor to review.
 *
 * @param {Object} props
 * @param {Object} props.patientData - Demographics { name, age, gender, language }
 * @param {Object} props.history - Structured history object
 * @param {Array} props.conversation - Message log
 * @param {() => void} props.onEdit - Return to chat or details
 * @param {() => void} props.onReset - Start over with new patient
 * @param {() => void} [props.onSubmitToDoctor] - Called after submission to navigate to doctor view
 */
export default function IntakeSummary({
  patientData,
  history,
  conversation,
  clinicId,
  onEdit,
  onReset,
  onSubmitToDoctor,
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const languageLabels = {
    english: 'English',
    hindi: 'Hindi (हिंदी)',
    marathi: 'Marathi (मराठी)',
  };

  const genderLabels = {
    male: 'Male (पुरुष)',
    female: 'Female (महिला)',
    other: 'Other (अन्य)',
  };

  // Combine associated symptoms into readable list
  const associatedList = [];
  if (history?.associated_symptoms) {
    Object.entries(history.associated_symptoms).forEach(([key, val]) => {
      const cleanKey = key.replace(/_/g, ' ');
      associatedList.push({ key: cleanKey, val });
    });
  }

  // When intake has been submitted to the doctor, show payment-app-style success state
  if (submitted) {
    return (
      <div className="screen-card completion-card" role="status" aria-live="polite">
        <div className="completion-hero summary-submitted-confirmation">
          {/* Large green circular checkmark with ripple & pop animation */}
          <div className="completion-icon-wrapper">
            <div className="completion-icon-pulse" aria-hidden="true" />
            <div className="completion-icon-circle submitted-icon" aria-hidden="true">
              <svg
                className="completion-checkmark-svg"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="completion-checkmark-bg-circle"
                  cx="26"
                  cy="26"
                  r="24"
                />
                <path
                  className="completion-checkmark-path"
                  d="M15 27L22.5 34.5L37 19"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="submitted-text completion-header-text">
            <h2 className="completion-title">Pre-consultation completed!</h2>
            <p className="completion-subtitle">
              Your health history has been securely sent to the doctor.
            </p>
          </div>

          <div className="completion-notice-badge">
            <svg
              className="completion-notice-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="completion-notice-text">
              You're all done. You can safely close this page now.
            </span>
          </div>

          <p className="completion-secondary-text">
            The doctor will review your information before your consultation.
          </p>
        </div>

        {/* Transmission Summary Receipt */}
        <div className="completion-receipt-card">
          <div className="completion-receipt-header">
            <span className="receipt-title">Intake Receipt</span>
            <span className="receipt-status-pill">
              <span className="receipt-status-dot" />
              Delivered
            </span>
          </div>

          <div className="completion-receipt-body">
            <div className="receipt-row">
              <span className="receipt-label">Patient</span>
              <span className="receipt-val">{patientData?.name || 'Patient'}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Chief Concern</span>
              <span className="receipt-val">
                {history?.chief_complaint || patientData?.complaint || 'General Consultation'}
              </span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Sent To</span>
              <span className="receipt-val">Clinic Doctor</span>
            </div>
          </div>

          <button
            type="button"
            className="completion-details-toggle"
            onClick={() => setShowTranscript(!showTranscript)}
            aria-expanded={showTranscript}
          >
            <span>{showTranscript ? 'Hide Submitted Intake Details' : 'View Submitted Intake Details'}</span>
            <span className="toggle-arrow">{showTranscript ? '▲' : '▼'}</span>
          </button>

          {showTranscript && (
            <div className="completion-expanded-summary">
              <div className="expanded-section">
                <h4 className="expanded-heading">Patient Demographics</h4>
                <div className="summary-data-container">
                  <div className="summary-row">
                    <span className="summary-key">Full Name</span>
                    <span className="summary-val">{patientData?.name}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-key">Age / Gender</span>
                    <span className="summary-val">
                      {patientData?.age} yrs • {genderLabels[patientData?.gender] || patientData?.gender}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-key">Language</span>
                    <span className="summary-val">
                      {languageLabels[patientData?.language] || patientData?.language}
                    </span>
                  </div>
                </div>
              </div>

              <div className="expanded-section">
                <h4 className="expanded-heading">Structured Clinical History</h4>
                <div className="summary-data-container">
                  <div className="summary-row">
                    <span className="summary-key">Chief Complaint</span>
                    <span className="summary-val primary-highlight">
                      {history?.chief_complaint || patientData?.complaint}
                    </span>
                  </div>
                  {history?.duration && (
                    <div className="summary-row">
                      <span className="summary-key">Duration</span>
                      <span className="summary-val">{history.duration}</span>
                    </div>
                  )}
                  {history?.severity && (
                    <div className="summary-row">
                      <span className="summary-key">Severity</span>
                      <span className="summary-val severity-pill">{history.severity}</span>
                    </div>
                  )}
                  {associatedList.length > 0 && (
                    <div className="summary-row-vertical">
                      <span className="summary-key">Associated Inquiries</span>
                      <div className="tags-container">
                        {associatedList.map((item, idx) => (
                          <span key={idx} className="symptom-tag">
                            <strong>{item.key}:</strong> {item.val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Medical Disclaimer */}
        <div className="disclaimer-banner" role="note">
          <svg className="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            PreCare securely submits this pre-consultation intake to the clinic. This is NOT a medical diagnosis and does not provide treatment.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-card summary-card">
      <div className="summary-status-badge">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
        <span>Pre-Consultation History Complete</span>
      </div>

      <h2 className="summary-title">Ready for Doctor Consultation</h2>
      <p className="summary-desc">
        The patient's health history has been structured and recorded in session state for the doctor's review.
      </p>

      {history?.is_urgent && (
        <div className="urgent-banner-warning" role="alert">
          <div className="urgent-banner-icon">⚠️</div>
          <div>
            <strong>Potential Urgent Information Flagged</strong>
            <p>{history.urgent_reason}</p>
          </div>
        </div>
      )}

      {/* Patient Demographics */}
      <div className="summary-section">
        <h3 className="section-title">Patient Demographics</h3>
        <div className="summary-data-container">
          <div className="summary-row">
            <span className="summary-key">Full Name</span>
            <span className="summary-val">{patientData.name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Age / Gender</span>
            <span className="summary-val">
              {patientData.age} yrs • {genderLabels[patientData.gender] || patientData.gender}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Preferred Language</span>
            <span className="summary-val">
              {languageLabels[patientData.language] || patientData.language}
            </span>
          </div>
        </div>
      </div>

      {/* Structured Health History */}
      <div className="summary-section">
        <h3 className="section-title">Structured Health History</h3>
        <div className="summary-data-container">
          <div className="summary-row">
            <span className="summary-key">Chief Complaint</span>
            <span className="summary-val primary-highlight">
              {history?.chief_complaint || patientData.complaint}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-key">Inquiry Category</span>
            <span className="summary-val text-capitalize">
              {history?.category ? history.category.replace('_', ' ') : 'General'}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-key">Duration</span>
            <span className="summary-val">{history?.duration || 'Not specified'}</span>
          </div>

          <div className="summary-row">
            <span className="summary-key">Location</span>
            <span className="summary-val">{history?.location || 'Not specified'}</span>
          </div>

          <div className="summary-row">
            <span className="summary-key">Severity</span>
            <span className="summary-val severity-pill">
              {history?.severity || 'Not specified'}
            </span>
          </div>

          {/* Associated Symptoms */}
          {associatedList.length > 0 && (
            <div className="summary-row-vertical">
              <span className="summary-key">Associated Inquiries</span>
              <div className="tags-container">
                {associatedList.map((item, idx) => (
                  <span key={idx} className="symptom-tag">
                    <strong>{item.key}:</strong> {item.val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {history?.medical_history && (
            <div className="summary-row">
              <span className="summary-key">Past Medical History</span>
              <span className="summary-val">{history.medical_history}</span>
            </div>
          )}

          {history?.medications && (
            <div className="summary-row">
              <span className="summary-key">Current Medications</span>
              <span className="summary-val">{history.medications}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Conversation Transcript */}
      {conversation && conversation.length > 0 && (
        <div className="transcript-section">
          <button
            type="button"
            className="transcript-toggle-btn"
            onClick={() => setShowTranscript(!showTranscript)}
            aria-expanded={showTranscript}
          >
            <span>💬 Original Conversation Transcript ({conversation.length} messages)</span>
            <span>{showTranscript ? '▲ Hide' : '▼ View'}</span>
          </button>

          {showTranscript && (
            <div className="transcript-box">
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`transcript-entry ${msg.role === 'assistant' ? 'entry-ai' : 'entry-patient'
                    }`}
                >
                  <div className="entry-header">
                    <strong>{msg.role === 'assistant' ? 'PreCare AI' : patientData.name}</strong>
                    <span className="entry-time">{msg.timestamp}</span>
                  </div>
                  <p className="entry-content">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="summary-actions">
        <button
          type="button"
          id="btn-edit-intake"
          className="btn btn-secondary"
          onClick={onEdit}
        >
          Return to Consultation
        </button>
        <button
          type="button"
          id="btn-submit-to-doctor"
          className="btn btn-primary"
          onClick={async () => {
            await caseStore.submitCase(patientData, history, conversation, clinicId);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (onSubmitToDoctor) onSubmitToDoctor();
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          Submit to Doctor
        </button>
      </div>

      {/* Medical Disclaimer */}
      <div className="disclaimer-banner" role="note">
        <svg className="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          PreCare securely submits this pre-consultation intake to the clinic. This is NOT a medical diagnosis and does not provide treatment.
        </span>
      </div>
    </div>
  );
}
