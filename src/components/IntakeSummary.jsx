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
      {!submitted ? (
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
            onClick={() => {
              caseStore.submitCase(patientData, history, conversation, clinicId);
              setSubmitted(true);
              if (onSubmitToDoctor) onSubmitToDoctor();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            Submit to Doctor
          </button>
        </div>
      ) : (
        <div className="summary-submitted-confirmation" role="status">
          <div className="submitted-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="submitted-text">
            <strong>Pre-consultation completed.</strong>
            <p>Your health history has been securely sent to the doctor.</p>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="disclaimer-banner" role="note">
        <svg className="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          PreCare stores this pre-consultation intake in frontend state. This is NOT a diagnosis and does not provide medical treatment.
        </span>
      </div>
    </div>
  );
}
