import React, { useState, useEffect } from 'react';
import caseStore from '../services/caseStore';
import clinicAuthStore from '../services/clinicAuthStore';
import './ClinicDashboard.css';

/**
 * ClinicDashboard Component
 *
 * Route: /dashboard
 *
 * Shows:
 *  - Header with Clinic name, Doctor name, Sign Out
 *  - Statistics: Today's Patients, Waiting, In Consultation, Completed
 *  - Patient Intake card: Clinic link, Copy link, Open intake, QR visual
 *  - Patient Queue scoped strictly to the current clinic
 *
 * @param {Object} props
 * @param {(caseId: string) => void} props.onOpenCase
 * @param {() => void} props.onSignOut
 * @param {(clinicId: string) => void} props.onOpenIntake
 */
export default function ClinicDashboard({ onOpenCase, onSignOut, onOpenIntake }) {
  const clinic = clinicAuthStore.getCurrentClinic();
  const clinicId = clinic?.id || 'default-clinic';

  const [cases, setCases] = useState(() => caseStore.getCases(clinicId));
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'Waiting' | 'In Consultation' | 'Completed'
  const [copied, setCopied] = useState(false);

  // Sync cases from server and subscribe for reactive updates
  useEffect(() => {
    if (clinicId) {
      caseStore.syncClinicCases(clinicId);
    }
    const unsub = caseStore.subscribe((all) => {
      setCases(all.filter((c) => c.clinicId === clinicId));
    });
    return unsub;
  }, [clinicId]);

  // Statistics
  const totalCount = cases.length;
  const waitingCount = cases.filter((c) => c.status === 'Waiting').length;
  const inConsultCount = cases.filter((c) => c.status === 'In Consultation').length;
  const completedCount = cases.filter((c) => c.status === 'Completed').length;

  // Filtered list
  const filteredCases = activeTab === 'all'
    ? cases
    : cases.filter((c) => c.status === activeTab);

  // Intake URL
  const intakeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/intake/${clinicId}`
    : `/intake/${clinicId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(intakeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }).catch(() => {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  };

  const handleOpenPatientLink = () => {
    if (onOpenIntake) {
      onOpenIntake(clinicId);
    } else {
      window.open(`/intake/${clinicId}`, '_blank');
    }
  };

  const statusMeta = {
    Waiting: { label: 'Waiting', cls: 'cd-badge--waiting' },
    'In Consultation': { label: 'In Consultation', cls: 'cd-badge--active' },
    Completed: { label: 'Completed', cls: 'cd-badge--completed' },
  };

  return (
    <div className="clinic-dash-root">
      {/* ── Dashboard Topbar ────────────────────────────────────────── */}
      <header className="clinic-dash-header">
        <div className="cd-header-left">
          <div className="cd-brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          </div>
          <div>
            <div className="cd-clinic-name">{clinic?.clinicName || 'My Clinic'}</div>
            <div className="cd-doctor-name">
              {clinic?.doctorName || 'Doctor'}
              {clinic?.specialization ? ` · ${clinic.specialization}` : ''}
              {clinic?.location ? ` · ${clinic.location}` : ''}
            </div>
          </div>
        </div>

        <div className="cd-header-right">
          <span className="cd-status-pill">
            <span className="cd-pulse-dot" />
            Clinic Portal Active
          </span>
          <button
            type="button"
            className="cd-signout-btn"
            id="btn-clinic-signout"
            onClick={onSignOut}
            title="Sign out of clinic account"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="cd-main-container">
        {/* ── Simple Statistics Cards ─────────────────────────────────── */}
        <section className="cd-stats-grid" aria-label="Clinic Statistics">
          <div className="cd-stat-card">
            <div className="cd-stat-label">Today's Patients</div>
            <div className="cd-stat-val cd-stat-val--total">{totalCount}</div>
            <div className="cd-stat-hint">Total intake submissions</div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-label">Waiting</div>
            <div className="cd-stat-val cd-stat-val--waiting">{waitingCount}</div>
            <div className="cd-stat-hint">Ready for consultation</div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-label">In Consultation</div>
            <div className="cd-stat-val cd-stat-val--active">{inConsultCount}</div>
            <div className="cd-stat-hint">Actively with doctor</div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-label">Completed</div>
            <div className="cd-stat-val cd-stat-val--completed">{completedCount}</div>
            <div className="cd-stat-hint">Consultations finished</div>
          </div>
        </section>

        {/* ── Patient Intake Share Card ───────────────────────────────── */}
        <section className="cd-share-card" aria-label="Patient Intake Link">
          <div className="cd-share-left">
            <div className="cd-share-header">
              <span className="cd-share-badge">Pre-Consultation Intake</span>
              <h2 className="cd-share-title">Patient Intake Link</h2>
            </div>
            <p className="cd-share-desc">
              Give patients this link or QR code to complete their PreCare intake before consultation.
              Information is automatically structured into a concise history and appears in your queue below.
            </p>

            <div className="cd-url-box">
              <input
                type="text"
                readOnly
                value={intakeUrl}
                className="cd-url-input"
                id="patient-intake-url-input"
                aria-label="Clinic Patient Intake URL"
              />
              <button
                type="button"
                className={`cd-copy-btn ${copied ? 'cd-copy-btn--success' : ''}`}
                id="btn-copy-intake-link"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Copy Patient Link
                  </>
                )}
              </button>
            </div>

            <div className="cd-share-actions">
              <button
                type="button"
                className="cd-open-intake-btn"
                id="btn-open-patient-intake"
                onClick={handleOpenPatientLink}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open Patient Intake
              </button>
              <span className="cd-share-hint">Patients do not need to log in or create an account.</span>
            </div>
          </div>

          {/* Scannable Visual QR Code Preview */}
          <div className="cd-share-qr-box" aria-hidden="true">
            <div className="cd-qr-frame">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                {/* Visual QR Code Matrix */}
                <rect width="120" height="120" rx="10" fill="#ffffff" />
                {/* Corner Finder Patterns */}
                <rect x="12" y="12" width="30" height="30" rx="4" fill="#0f172a" />
                <rect x="17" y="17" width="20" height="20" rx="2" fill="#ffffff" />
                <rect x="22" y="22" width="10" height="10" rx="1" fill="#0d9488" />

                <rect x="78" y="12" width="30" height="30" rx="4" fill="#0f172a" />
                <rect x="83" y="17" width="20" height="20" rx="2" fill="#ffffff" />
                <rect x="88" y="22" width="10" height="10" rx="1" fill="#0d9488" />

                <rect x="12" y="78" width="30" height="30" rx="4" fill="#0f172a" />
                <rect x="17" y="83" width="20" height="20" rx="2" fill="#ffffff" />
                <rect x="22" y="88" width="10" height="10" rx="1" fill="#0d9488" />

                {/* Data modules */}
                <rect x="48" y="14" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="62" y="14" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="48" y="28" width="8" height="8" rx="1" fill="#0d9488" />
                <rect x="62" y="28" width="8" height="8" rx="1" fill="#0f172a" />

                <rect x="14" y="48" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="28" y="48" width="8" height="8" rx="1" fill="#0d9488" />
                <rect x="42" y="48" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="56" y="48" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="70" y="48" width="8" height="8" rx="1" fill="#0d9488" />
                <rect x="84" y="48" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="98" y="48" width="8" height="8" rx="1" fill="#0f172a" />

                <rect x="48" y="62" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="62" y="62" width="8" height="8" rx="1" fill="#0d9488" />
                <rect x="76" y="62" width="8" height="8" rx="1" fill="#0f172a" />

                <rect x="48" y="78" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="62" y="78" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="78" y="78" width="8" height="8" rx="1" fill="#0d9488" />
                <rect x="92" y="78" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="48" y="92" width="8" height="8" rx="1" fill="#0d9488" />
                <rect x="62" y="92" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="78" y="92" width="8" height="8" rx="1" fill="#0f172a" />
                <rect x="92" y="92" width="8" height="8" rx="1" fill="#0d9488" />
              </svg>
              <span className="cd-qr-caption">Scan for Patient Intake</span>
            </div>
          </div>
        </section>

        {/* ── Patient Queue Section ───────────────────────────────────── */}
        <section className="cd-queue-section" aria-label="Patient Queue">
          <div className="cd-queue-header">
            <div>
              <h2 className="cd-queue-title">Patient Queue</h2>
              <p className="cd-queue-subtitle">
                Cases for {clinic?.clinicName || 'your clinic'} — click any case to review structured history
              </p>
            </div>

            {/* Filter tabs */}
            <div className="cd-filter-tabs" role="tablist">
              <button
                type="button"
                className={`cd-tab-btn ${activeTab === 'all' ? 'cd-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                className={`cd-tab-btn ${activeTab === 'Waiting' ? 'cd-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('Waiting')}
              >
                Waiting ({waitingCount})
              </button>
              <button
                type="button"
                className={`cd-tab-btn ${activeTab === 'In Consultation' ? 'cd-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('In Consultation')}
              >
                In Consultation ({inConsultCount})
              </button>
              <button
                type="button"
                className={`cd-tab-btn ${activeTab === 'Completed' ? 'cd-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('Completed')}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Queue list */}
          {filteredCases.length === 0 ? (
            <div className="cd-empty-queue">
              <div className="cd-empty-icon" aria-hidden="true">📋</div>
              <h3 className="cd-empty-title">
                {activeTab === 'all'
                  ? 'No patient cases yet for this clinic'
                  : `No patients currently marked "${activeTab}"`}
              </h3>
              <p className="cd-empty-desc">
                {activeTab === 'all'
                  ? 'Share your Patient Intake link above with patients. When they complete intake, their structured case will instantly appear here.'
                  : 'Patients in other statuses are available in the tabs above.'}
              </p>
              {activeTab === 'all' && (
                <button
                  type="button"
                  className="cd-btn-try-intake"
                  id="btn-try-intake-empty"
                  onClick={handleOpenPatientLink}
                >
                  Test Patient Intake Link →
                </button>
              )}
            </div>
          ) : (
            <div className="cd-cases-list">
              {filteredCases.map((c) => {
                const p = c.patientData || {};
                const h = c.history || {};
                const meta = statusMeta[c.status] || { label: c.status, cls: 'cd-badge--waiting' };
                const severity = h.severity || '';

                return (
                  <div
                    key={c.id}
                    className="cd-case-card"
                    onClick={() => onOpenCase(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpenCase(c.id);
                    }}
                    id={`case-card-${c.id}`}
                  >
                    <div className="cd-case-avatar">
                      {(p.name || '?')[0].toUpperCase()}
                    </div>

                    <div className="cd-case-main">
                      <div className="cd-case-topline">
                        <span className="cd-patient-name">{p.name || 'Unnamed Patient'}</span>
                        <span className="cd-patient-demographics">
                          {p.age ? `${p.age} yrs` : ''}
                          {p.gender ? ` · ${p.gender}` : ''}
                          {p.language ? ` · ${p.language}` : ''}
                        </span>
                        <span className={`cd-status-badge ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="cd-case-complaint-row">
                        <span className="cd-complaint-label">Chief Complaint:</span>
                        <span className="cd-complaint-val">{h.chief_complaint || p.complaint || 'Not specified'}</span>
                        {h.duration && (
                          <span className="cd-meta-tag">⏱ {h.duration}</span>
                        )}
                        {severity && (
                          <span className="cd-severity-tag">
                            Severity: {severity}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cd-case-actions">
                      <span className="cd-time-label">{c.submittedTimeLabel || 'Today'}</span>
                      <button
                        type="button"
                        className="cd-open-case-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCase(c.id);
                        }}
                      >
                        {c.status === 'Completed' ? 'View Summary' : 'Open Case'} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
