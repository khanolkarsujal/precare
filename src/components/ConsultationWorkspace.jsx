import React, { useState, useCallback } from 'react';
import caseStore from '../services/caseStore';
import './ConsultationWorkspace.css';

/**
 * ConsultationWorkspace — Part 5
 *
 * Full doctor consultation interface.
 *
 * Left column  : Patient pre-consultation history (read + doctor-editable)
 *                + Original AI conversation (collapsible)
 * Right column : Doctor Notes (free text) + SOAP structured notes
 *                + Complete Consultation button
 *
 * Rules:
 *  - No AI calls. No diagnosis. No treatment recommendations.
 *  - Doctor edits are stored in `doctorEditedHistory` (clearly labelled).
 *  - Completing saves everything and sets status → 'Completed'.
 *  - Once 'Completed', status cannot return to 'Waiting'.
 *
 * @param {Object} props
 * @param {string}   props.caseId         - ID of the active case
 * @param {Object}   props.caseData       - Full case record from caseStore
 * @param {() => void} props.onComplete   - Called after Complete Consultation
 * @param {() => void} props.onBack       - Return to case detail (without completing)
 */
export default function ConsultationWorkspace({ caseId, caseData, onComplete, onBack }) {
  const { patientData, history, conversation } = caseData;

  // ── Doctor notes & SOAP state ────────────────────────────────────────────
  const [doctorNotes, setDoctorNotes] = useState(caseData.doctorNotes || '');
  const [soap, setSoap] = useState({
    subjective: caseData.soap?.subjective || '',
    objective: caseData.soap?.objective || '',
    assessment: caseData.soap?.assessment || '',
    plan: caseData.soap?.plan || '',
  });

  // ── Doctor-edited history overrides ─────────────────────────────────────
  const [editedHistory, setEditedHistory] = useState(
    caseData.doctorEditedHistory || {}
  );
  // Which field is currently being edited (field key or null)
  const [editingField, setEditingField] = useState(null);
  // Temporary input value while editing
  const [editInputVal, setEditInputVal] = useState('');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showTranscript, setShowTranscript] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // ── Helper: get effective value (doctor override takes precedence) ────────
  const effectiveVal = useCallback(
    (field, rawVal) => {
      return field in editedHistory ? editedHistory[field] : rawVal;
    },
    [editedHistory]
  );

  // ── Helper: render value with data-state labels ───────────────────────────
  function renderVal(val, fieldKey) {
    const effective = fieldKey !== undefined ? effectiveVal(fieldKey, val) : val;
    const isEdited = fieldKey !== undefined && fieldKey in editedHistory;

    if (effective === null || effective === undefined || effective === '') {
      return (
        <span className="cw-not-reported">
          Not reported{isEdited && <span className="cw-edited-tag">edited</span>}
        </span>
      );
    }
    const lower = String(effective).toLowerCase().trim();
    if (/^(no|none|nothing|never|denied|n\/a|no medications|no allergies|no history)$/i.test(lower)) {
      return (
        <span className="cw-denied">
          Patient denied{isEdited && <span className="cw-edited-tag">edited</span>}
        </span>
      );
    }
    if (/\b(not sure|don't know|don't know|unsure|uncertain|maybe|i don't know)\b/i.test(lower)) {
      return (
        <span className="cw-unsure">
          Patient unsure{isEdited && <span className="cw-edited-tag">edited</span>}
        </span>
      );
    }
    return (
      <span className={`cw-value${isEdited ? ' cw-value--edited' : ''}`}>
        {effective}
        {isEdited && <span className="cw-edited-tag">edited by doctor</span>}
      </span>
    );
  }

  // ── Editing actions ────────────────────────────────────────────────────────
  const startEdit = (fieldKey, currentVal) => {
    setEditingField(fieldKey);
    setEditInputVal(effectiveVal(fieldKey, currentVal) ?? '');
  };

  const commitEdit = (fieldKey) => {
    const newEdits = { ...editedHistory, [fieldKey]: editInputVal.trim() };
    setEditedHistory(newEdits);
    setEditingField(null);
    setEditInputVal('');
    // Auto-save to store
    caseStore.saveConsultation(caseId, {
      doctorNotes,
      soap,
      doctorEditedHistory: newEdits,
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditInputVal('');
  };

  const revertEdit = (fieldKey) => {
    const newEdits = { ...editedHistory };
    delete newEdits[fieldKey];
    setEditedHistory(newEdits);
    caseStore.saveConsultation(caseId, {
      doctorNotes,
      soap,
      doctorEditedHistory: newEdits,
    });
  };

  // ── SOAP updater ──────────────────────────────────────────────────────────
  const updateSoap = (key, val) => setSoap((prev) => ({ ...prev, [key]: val }));

  // ── Complete consultation ─────────────────────────────────────────────────
  const handleComplete = () => {
    setCompleting(true);
    caseStore.completeConsultation(caseId, {
      doctorNotes,
      soap,
      doctorEditedHistory: editedHistory,
    });
    setCompleted(true);
    setCompleting(false);
    // Brief pause so the doctor sees completion state, then return to dashboard
    setTimeout(() => {
      onComplete();
    }, 1400);
  };

  // ── Labels ────────────────────────────────────────────────────────────────
  const languageLabels = { english: 'English', hindi: 'Hindi (हिंदी)', marathi: 'Marathi (मराठी)' };
  const genderLabels = { male: 'Male', female: 'Female', other: 'Other' };

  // ── Associated symptoms list ──────────────────────────────────────────────
  const associatedList = [];
  if (history?.associated_symptoms) {
    Object.entries(history.associated_symptoms).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        associatedList.push({ key: key.replace(/_/g, ' '), val, fieldKey: `assoc_${key}` });
      }
    });
  }

  // ── Editable field component (inline) ────────────────────────────────────
  function EditableField({ label, fieldKey, rawVal, wide = false }) {
    const isEditing = editingField === fieldKey;
    const isEdited = fieldKey in editedHistory;
    return (
      <div className={`cw-field${wide ? ' cw-field--wide' : ''}`}>
        <div className="cw-field-label-row">
          <span className="cw-field-label">{label}</span>
          {!isEditing && !completed && (
            <button
              type="button"
              className="cw-edit-btn"
              onClick={() => startEdit(fieldKey, rawVal)}
              title="Edit this value"
              aria-label={`Edit ${label}`}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
          )}
          {isEdited && !isEditing && !completed && (
            <button
              type="button"
              className="cw-revert-btn"
              onClick={() => revertEdit(fieldKey)}
              title="Revert to original patient value"
            >
              Revert
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="cw-edit-input-row">
            <input
              type="text"
              className="cw-edit-input"
              value={editInputVal}
              onChange={(e) => setEditInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(fieldKey);
                if (e.key === 'Escape') cancelEdit();
              }}
              autoFocus
              aria-label={`Edit ${label}`}
            />
            <button type="button" className="cw-edit-confirm" onClick={() => commitEdit(fieldKey)}>Save</button>
            <button type="button" className="cw-edit-cancel" onClick={cancelEdit}>Cancel</button>
          </div>
        ) : (
          renderVal(rawVal, fieldKey)
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="cw-wrapper">
      {/* Top bar */}
      <div className="cw-topbar">
        <button type="button" className="cw-back-btn" onClick={onBack} disabled={completed}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Back to Case
        </button>

        <div className="cw-header-center">
          <span className="cw-header-label">Doctor Consultation</span>
          <div className="cw-patient-id">
            <span className="cw-patient-avatar-sm">
              {(patientData?.name || '?')[0].toUpperCase()}
            </span>
            <span className="cw-patient-name-sm">{patientData?.name || 'Patient'}</span>
            <span className="cw-patient-meta-sm">
              {patientData?.age ? `${patientData.age} yrs` : ''}&nbsp;&bull;&nbsp;
              {genderLabels[patientData?.gender] || patientData?.gender || ''}
            </span>
          </div>
        </div>

        <span className="cw-status-badge cw-status-active">In Consultation</span>
      </div>

      {/* Completion banner */}
      {completed && (
        <div className="cw-completion-banner" role="status">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span>Consultation completed. Returning to dashboard…</span>
        </div>
      )}

      {/* 2-column body */}
      <div className="cw-body">

        {/* ── LEFT COLUMN: Patient History ── */}
        <div className="cw-left-col">

          {/* Pre-consultation history header */}
          <div className="cw-section-header">
            <h2 className="cw-section-title">Pre-Consultation History</h2>
            <p className="cw-section-sub">Click <strong>Edit</strong> on any field to correct inaccurate information. Edits are labelled and do not affect the original AI conversation.</p>
          </div>

          {/* Urgent flag */}
          {history?.is_urgent && (
            <div className="cw-urgent-box">
              <span className="cw-urgent-icon">⚠️</span>
              <div>
                <strong>Potential Urgent Information</strong>
                <p>{history.urgent_reason}</p>
              </div>
            </div>
          )}

          {/* ── Primary complaint section ── */}
          <div className="cw-card">
            <h3 className="cw-card-title">Chief Complaint</h3>
            <EditableField
              label="Chief Complaint"
              fieldKey="chief_complaint"
              rawVal={history?.chief_complaint || patientData?.complaint}
              wide
            />
            <div className="cw-field-row">
              <EditableField label="Category" fieldKey="category" rawVal={history?.category ? history.category.replace(/_/g, ' ') : null} />
              <EditableField label="Duration" fieldKey="duration" rawVal={history?.duration} />
              <EditableField label="Onset" fieldKey="onset" rawVal={history?.onset} />
              <EditableField label="Location" fieldKey="location" rawVal={history?.location} />
              <EditableField label="Severity" fieldKey="severity" rawVal={history?.severity} />
            </div>
          </div>

          {/* ── Associated symptoms ── */}
          {associatedList.length > 0 && (
            <div className="cw-card">
              <h3 className="cw-card-title">Associated Symptoms</h3>
              <div className="cw-field-row">
                {associatedList.map((item) => (
                  <EditableField
                    key={item.fieldKey}
                    label={item.key}
                    fieldKey={item.fieldKey}
                    rawVal={item.val}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Medical background ── */}
          <div className="cw-card">
            <h3 className="cw-card-title">Medical Background</h3>
            <div className="cw-field-row">
              <EditableField label="Past Medical History" fieldKey="medical_history" rawVal={history?.medical_history} wide />
              <EditableField label="Current Medications" fieldKey="medications" rawVal={history?.medications} />
              <EditableField label="Allergies" fieldKey="allergies" rawVal={history?.allergies} />
            </div>
          </div>

          {/* ── Original conversation ── */}
          {conversation && conversation.length > 0 && (
            <div className="cw-card cw-card--transcript">
              <button
                type="button"
                className="cw-transcript-toggle"
                onClick={() => setShowTranscript((v) => !v)}
                aria-expanded={showTranscript}
                id="btn-workspace-transcript"
              >
                <span>💬 Original Conversation ({conversation.length} messages)</span>
                <span className="cw-toggle-arrow">{showTranscript ? '▲ Hide' : '▼ View'}</span>
              </button>

              {showTranscript && (
                <div className="cw-transcript-box">
                  {conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`cw-msg ${msg.role === 'assistant' ? 'cw-msg-ai' : 'cw-msg-patient'}`}
                    >
                      <div className="cw-msg-header">
                        <strong>{msg.role === 'assistant' ? 'PreCare AI' : patientData?.name || 'Patient'}</strong>
                        <span className="cw-msg-time">{msg.timestamp}</span>
                      </div>
                      <p className="cw-msg-content">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Doctor Notes ── */}
        <div className="cw-right-col">

          {/* Patient snapshot */}
          <div className="cw-card cw-card--info">
            <h3 className="cw-card-title">Patient</h3>
            <div className="cw-info-rows">
              <div className="cw-info-row"><span>Name</span><strong>{patientData?.name || '—'}</strong></div>
              <div className="cw-info-row"><span>Age</span><strong>{patientData?.age ? `${patientData.age} yrs` : '—'}</strong></div>
              <div className="cw-info-row"><span>Gender</span><strong>{genderLabels[patientData?.gender] || patientData?.gender || '—'}</strong></div>
              <div className="cw-info-row"><span>Language</span><strong>{languageLabels[patientData?.language] || patientData?.language || '—'}</strong></div>
            </div>
          </div>

          {/* SOAP Notes */}
          <div className="cw-card">
            <h3 className="cw-card-title">SOAP Notes</h3>
            <p className="cw-soap-note">All fields are entered by the doctor. PreCare does not generate clinical decisions.</p>

            {/* Subjective — pre-populated with patient's chief complaint as reference */}
            <div className="cw-soap-field">
              <label className="cw-soap-label" htmlFor="soap-subjective">
                <span className="cw-soap-letter">S</span> Subjective
                <span className="cw-soap-hint">Patient's reported history</span>
              </label>
              <textarea
                id="soap-subjective"
                className="cw-soap-textarea"
                rows={4}
                value={soap.subjective}
                onChange={(e) => updateSoap('subjective', e.target.value)}
                placeholder={
                  history?.chief_complaint
                    ? `e.g. Patient reports ${history.chief_complaint}${history?.duration ? ` for ${history.duration}` : ''}.`
                    : 'Enter subjective findings…'
                }
                disabled={completed}
              />
            </div>

            <div className="cw-soap-field">
              <label className="cw-soap-label" htmlFor="soap-objective">
                <span className="cw-soap-letter">O</span> Objective
                <span className="cw-soap-hint">Examination findings</span>
              </label>
              <textarea
                id="soap-objective"
                className="cw-soap-textarea"
                rows={4}
                value={soap.objective}
                onChange={(e) => updateSoap('objective', e.target.value)}
                placeholder="Vital signs, physical examination findings…"
                disabled={completed}
              />
            </div>

            <div className="cw-soap-field">
              <label className="cw-soap-label" htmlFor="soap-assessment">
                <span className="cw-soap-letter">A</span> Assessment
                <span className="cw-soap-hint">Doctor's clinical assessment</span>
              </label>
              <textarea
                id="soap-assessment"
                className="cw-soap-textarea"
                rows={4}
                value={soap.assessment}
                onChange={(e) => updateSoap('assessment', e.target.value)}
                placeholder="Clinical assessment (entered by doctor only)…"
                disabled={completed}
              />
            </div>

            <div className="cw-soap-field">
              <label className="cw-soap-label" htmlFor="soap-plan">
                <span className="cw-soap-letter">P</span> Plan
                <span className="cw-soap-hint">Management plan</span>
              </label>
              <textarea
                id="soap-plan"
                className="cw-soap-textarea"
                rows={4}
                value={soap.plan}
                onChange={(e) => updateSoap('plan', e.target.value)}
                placeholder="Treatment plan (entered by doctor only)…"
                disabled={completed}
              />
            </div>
          </div>

          {/* Additional doctor notes */}
          <div className="cw-card">
            <h3 className="cw-card-title">Doctor Notes</h3>
            <textarea
              id="doctor-notes"
              className="cw-notes-textarea"
              rows={5}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Enter your clinical notes, observations, or additional information…"
              disabled={completed}
            />
          </div>

          {/* Complete button */}
          {!completed ? (
            <button
              type="button"
              id="btn-complete-consultation"
              className="cw-complete-btn"
              onClick={handleComplete}
              disabled={completing}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              {completing ? 'Completing…' : 'Complete Consultation'}
            </button>
          ) : (
            <div className="cw-completed-notice">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Consultation completed
            </div>
          )}

          {/* Disclaimer */}
          <p className="cw-disclaimer">
            PreCare collects pre-consultation history via AI. Clinical assessment and treatment decisions are the sole responsibility of the doctor.
          </p>
        </div>
      </div>
    </div>
  );
}
