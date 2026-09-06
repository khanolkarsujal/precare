import React, { useState } from 'react';
import caseStore from '../services/caseStore';
import './DoctorCaseView.css';

/**
 * DoctorCaseView component
 *
 * Full single-case detail view for the doctor.
 * Shows: patient info, structured health history, original conversation.
 * Provides a [Start Consultation] button to change case status.
 *
 * Data state labels (never invent information):
 *   - Actual value   → shown as-is
 *   - null / missing → "Not reported"
 *   - Explicit "no"  → "Patient denied"
 *   - Unsure         → "Patient unsure"
 *
 * @param {Object} props
 * @param {string} props.caseId          - ID of the case to display
 * @param {Object} props.caseData        - The full case record
 * @param {() => void} props.onBack      - Return to dashboard
 */
export default function DoctorCaseView({ caseId, caseData, onBack, onStartConsultation }) {
  const [showTranscript, setShowTranscript] = useState(false);
  // Derive status from caseData so it stays in sync with caseStore
  const status = caseData?.status || 'Waiting';

  if (!caseData) {
    return (
      <div className="dcv-error">
        <p>Case not found.</p>
        <button type="button" className="dcv-back-btn" onClick={onBack}>
          ← Back to Queue
        </button>
      </div>
    );
  }

  const { patientData, history, conversation } = caseData;

  /**
   * Render a field value applying data state labels.
   * Checks for "no/none/denied" and "unsure" patterns from raw patient input.
   */
  function fieldValue(val, label = null) {
    if (val === null || val === undefined || val === '') {
      return <span className="dcv-not-reported">Not reported</span>;
    }
    const lower = String(val).toLowerCase().trim();
    if (/^(no|none|nothing|never|denied|n\/a|no medications|no allergies|no history)$/i.test(lower)) {
      return <span className="dcv-denied">Patient denied</span>;
    }
    if (/\b(not sure|don't know|don't know|unsure|uncertain|maybe|i don't know)\b/i.test(lower)) {
      return <span className="dcv-unsure">Patient unsure</span>;
    }
    return <span className="dcv-value">{val}</span>;
  }

  const languageLabels = {
    english: 'English',
    hindi: 'Hindi (हिंदी)',
    marathi: 'Marathi (मराठी)',
  };

  const genderLabels = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  };

  const statusMeta = {
    Waiting: { cls: 'dcv-status-waiting', label: 'Waiting' },
    'In Consultation': { cls: 'dcv-status-active', label: 'In Consultation' },
    Completed: { cls: 'dcv-status-reviewed', label: 'Completed' },
    Reviewed: { cls: 'dcv-status-reviewed', label: 'Reviewed' },
  };
  const currentMeta = statusMeta[status] || statusMeta.Waiting;

  const handleStartConsultation = () => {
    caseStore.startConsultation(caseId);
    if (onStartConsultation) onStartConsultation(caseId);
  };

  // Build associated symptoms list
  const associatedList = [];
  if (history?.associated_symptoms) {
    Object.entries(history.associated_symptoms).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        associatedList.push({ key: key.replace(/_/g, ' '), val });
      }
    });
  }

  return (
    <div className="dcv-wrapper">
      {/* Case view top bar */}
      <div className="dcv-topbar">
        <button
          type="button"
          className="dcv-back-btn"
          onClick={onBack}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Back to Queue
        </button>

        <div className="dcv-topbar-status">
          <span className={`dcv-status-badge ${currentMeta.cls}`}>
            {currentMeta.label}
          </span>
          <span className="dcv-submitted-meta">
            Submitted {caseData.submittedTimeLabel} &bull; {caseData.submittedDateLabel}
          </span>
        </div>
      </div>

      {/* Patient header */}
      <div className="dcv-patient-header">
        <div className="dcv-patient-avatar">
          {(patientData?.name || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="dcv-patient-name">
            {patientData?.name || 'Unknown Patient'}
          </h1>
          <p className="dcv-patient-meta">
            {patientData?.age ? `${patientData.age} yrs` : '—'} &bull;&nbsp;
            {genderLabels[patientData?.gender] || patientData?.gender || '—'} &bull;&nbsp;
            {languageLabels[patientData?.language] || patientData?.language || '—'}
          </p>
        </div>

        {/* Urgent flag */}
        {history?.is_urgent && (
          <div className="dcv-urgent-badge" role="alert">
            ⚠️ Urgent information flagged
          </div>
        )}
      </div>

      <div className="dcv-body">
        {/* LEFT COLUMN — structured data */}
        <div className="dcv-main-col">

          {/* Urgent detail */}
          {history?.is_urgent && (
            <div className="dcv-section dcv-urgent-box">
              <div className="dcv-urgent-title">⚠️ Potential Urgent Information</div>
              <p className="dcv-urgent-reason">{history.urgent_reason}</p>
            </div>
          )}

          {/* Structured health history */}
          <div className="dcv-section">
            <h2 className="dcv-section-title">Structured Health History</h2>
            <div className="dcv-field-grid">
              <div className="dcv-field">
                <span className="dcv-field-label">Chief Complaint</span>
                <span className="dcv-value dcv-primary-complaint">
                  {history?.chief_complaint || patientData?.complaint || '—'}
                </span>
              </div>

              <div className="dcv-field">
                <span className="dcv-field-label">Inquiry Category</span>
                {fieldValue(
                  history?.category
                    ? history.category.replace(/_/g, ' ')
                    : null
                )}
              </div>

              <div className="dcv-field">
                <span className="dcv-field-label">Duration</span>
                {fieldValue(history?.duration)}
              </div>

              <div className="dcv-field">
                <span className="dcv-field-label">Onset</span>
                {fieldValue(history?.onset)}
              </div>

              <div className="dcv-field">
                <span className="dcv-field-label">Location</span>
                {fieldValue(history?.location)}
              </div>

              <div className="dcv-field">
                <span className="dcv-field-label">Severity</span>
                {history?.severity ? (
                  <span className="dcv-severity-pill">{history.severity}</span>
                ) : (
                  <span className="dcv-not-reported">Not reported</span>
                )}
              </div>
            </div>
          </div>

          {/* Associated symptoms */}
          {associatedList.length > 0 && (
            <div className="dcv-section">
              <h2 className="dcv-section-title">Associated Symptoms</h2>
              <div className="dcv-field-grid">
                {associatedList.map((item, idx) => (
                  <div className="dcv-field" key={idx}>
                    <span className="dcv-field-label dcv-capitalize">{item.key}</span>
                    {fieldValue(item.val)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical background */}
          <div className="dcv-section">
            <h2 className="dcv-section-title">Medical Background</h2>
            <div className="dcv-field-grid">
              <div className="dcv-field">
                <span className="dcv-field-label">Past Medical History</span>
                {fieldValue(history?.medical_history)}
              </div>
              <div className="dcv-field">
                <span className="dcv-field-label">Current Medications</span>
                {fieldValue(history?.medications)}
              </div>
              <div className="dcv-field">
                <span className="dcv-field-label">Allergies</span>
                {fieldValue(history?.allergies)}
              </div>
            </div>
          </div>

          {/* Conversation transcript */}
          {conversation && conversation.length > 0 && (
            <div className="dcv-section">
              <button
                type="button"
                className="dcv-transcript-toggle"
                onClick={() => setShowTranscript((v) => !v)}
                aria-expanded={showTranscript}
                id="btn-toggle-transcript"
              >
                <span>
                  💬 Original Conversation ({conversation.length} messages)
                </span>
                <span className="dcv-toggle-arrow">
                  {showTranscript ? '▲ Hide' : '▼ View'}
                </span>
              </button>

              {showTranscript && (
                <div className="dcv-transcript-box">
                  {conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`dcv-msg ${
                        msg.role === 'assistant' ? 'dcv-msg-ai' : 'dcv-msg-patient'
                      }`}
                    >
                      <div className="dcv-msg-header">
                        <strong>
                          {msg.role === 'assistant'
                            ? 'PreCare AI'
                            : patientData?.name || 'Patient'}
                        </strong>
                        <span className="dcv-msg-time">{msg.timestamp}</span>
                      </div>
                      <p className="dcv-msg-content">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — action panel */}
        <div className="dcv-side-col">
          <div className="dcv-action-panel">
            <h3 className="dcv-action-title">Consultation</h3>

            {status === 'Waiting' && (
              <>
                <p className="dcv-action-desc">
                  Review the patient's structured history, then start the consultation when ready.
                </p>
                <button
                  type="button"
                  id="btn-start-consultation"
                  className="dcv-start-btn"
                  onClick={handleStartConsultation}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Start Consultation
                </button>
              </>
            )}
            {status === 'In Consultation' && (
              <button
                type="button"
                id="btn-open-workspace"
                className="dcv-start-btn"
                onClick={() => onStartConsultation && onStartConsultation(caseId)}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
                Open Workspace
              </button>
            )}
            {status === 'Completed' && (
              <div className="dcv-in-consultation-notice">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span>Consultation completed</span>
              </div>
            )}

            <div className="dcv-action-divider" />

            <div className="dcv-patient-info-mini">
              <h4 className="dcv-mini-title">Patient Information</h4>
              <div className="dcv-mini-row">
                <span className="dcv-mini-label">Full Name</span>
                <span className="dcv-mini-val">{patientData?.name || '—'}</span>
              </div>
              <div className="dcv-mini-row">
                <span className="dcv-mini-label">Age</span>
                <span className="dcv-mini-val">
                  {patientData?.age ? `${patientData.age} yrs` : '—'}
                </span>
              </div>
              <div className="dcv-mini-row">
                <span className="dcv-mini-label">Gender</span>
                <span className="dcv-mini-val">
                  {genderLabels[patientData?.gender] || patientData?.gender || '—'}
                </span>
              </div>
              <div className="dcv-mini-row">
                <span className="dcv-mini-label">Language</span>
                <span className="dcv-mini-val">
                  {languageLabels[patientData?.language] ||
                    patientData?.language ||
                    '—'}
                </span>
              </div>
              <div className="dcv-mini-row">
                <span className="dcv-mini-label">AI Model</span>
                <span className="dcv-mini-val">{history?.model || 'qwen3:8b'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="dcv-disclaimer">
        <svg className="dcv-disc-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          This pre-consultation history is generated by AI-assisted intake. It is not a diagnosis and does not replace clinical examination.
        </span>
      </div>
    </div>
  );
}
