import React, { useState, useEffect } from 'react';
import caseStore from '../services/caseStore';
import './DoctorDashboard.css';

/**
 * DoctorDashboard component
 *
 * Displays the patient queue for the doctor.
 * Cases appear here immediately when a patient clicks "Submit to Doctor".
 *
 * @param {Object} props
 * @param {(caseId: string) => void} props.onOpenCase - Open a specific patient case
 */
export default function DoctorDashboard({ onOpenCase }) {
  const [cases, setCases] = useState(() => caseStore.getCases());

  // Subscribe to caseStore updates so the queue is reactive
  useEffect(() => {
    const unsub = caseStore.subscribe((updated) => setCases(updated));
    return unsub;
  }, []);

  const statusMeta = {
    Waiting: { label: 'Waiting', cls: 'status-waiting' },
    'In Consultation': { label: 'In Consultation', cls: 'status-active' },
    Completed: { label: 'Completed', cls: 'status-completed' },
    Reviewed: { label: 'Reviewed', cls: 'status-reviewed' },
  };

  const languageLabels = {
    english: 'English',
    hindi: 'Hindi',
    marathi: 'Marathi',
  };

  const genderLabels = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  };

  return (
    <div className="doctor-dashboard">
      {/* Page header */}
      <div className="dd-page-header">
        <div>
          <h1 className="dd-page-title">Patient Queue</h1>
          <p className="dd-page-sub">
            Pre-consultation cases submitted today
          </p>
        </div>
        <div className="dd-queue-count">
          <span className="dd-count-num">{cases.length}</span>
          <span className="dd-count-label">
            {cases.length === 1 ? 'Patient' : 'Patients'}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {cases.length === 0 && (
        <div className="dd-empty-state">
          <div className="dd-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="dd-empty-title">No patients in queue</h2>
          <p className="dd-empty-desc">
            Patient cases will appear here as soon as a pre-consultation is submitted.
          </p>
        </div>
      )}

      {/* Patient case cards */}
      {cases.length > 0 && (
        <div className="dd-case-list">
          {cases.map((c) => {
            const meta = statusMeta[c.status] || statusMeta.Waiting;
            const chiefComplaint =
              c.history?.chief_complaint || c.patientData?.complaint || '—';
            const duration = c.history?.duration || null;
            const severity = c.history?.severity || null;
            const gender =
              genderLabels[c.patientData?.gender] || c.patientData?.gender || '—';
            const language =
              languageLabels[c.patientData?.language] ||
              c.patientData?.language ||
              '—';

            return (
              <div key={c.id} className="dd-case-card">
                {/* Card left: patient identity */}
                <div className="dd-card-identity">
                  <div className="dd-patient-avatar" aria-hidden="true">
                    {(c.patientData?.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="dd-patient-name">
                      {c.patientData?.name || 'Unknown Patient'}
                    </div>
                    <div className="dd-patient-meta">
                      {c.patientData?.age
                        ? `${c.patientData.age} yrs`
                        : '— yrs'}{' '}
                      &bull; {gender} &bull; {language}
                    </div>
                  </div>
                </div>

                {/* Card center: clinical snapshot */}
                <div className="dd-card-clinical">
                  <div className="dd-clinical-row">
                    <span className="dd-clinical-label">Chief Complaint</span>
                    <span className="dd-clinical-value dd-complaint-highlight">
                      {chiefComplaint}
                    </span>
                  </div>
                  <div className="dd-clinical-pills">
                    {duration && (
                      <span className="dd-pill">
                        <span className="dd-pill-icon">⏱</span> {duration}
                      </span>
                    )}
                    {severity && (
                      <span className="dd-pill dd-pill-severity">
                        <span className="dd-pill-icon">📊</span> Severity: {severity}
                      </span>
                    )}
                    {c.history?.is_urgent && (
                      <span className="dd-pill dd-pill-urgent">⚠️ Flagged</span>
                    )}
                  </div>
                </div>

                {/* Card right: status + action */}
                <div className="dd-card-actions">
                  <div className="dd-status-row">
                    <span className={`dd-status-badge ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="dd-submitted-time">
                      {c.submittedTimeLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    id={`btn-open-case-${c.id}`}
                    className="dd-open-btn"
                    onClick={() => onOpenCase(c.id)}
                  >
                    Open Case
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="dd-footer-note">
        <svg className="dd-footer-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          PreCare patient history is collected via AI-assisted pre-consultation. It does not constitute a diagnosis or clinical assessment.
        </span>
      </div>
    </div>
  );
}
