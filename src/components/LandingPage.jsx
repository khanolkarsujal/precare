import React, { useState, useEffect } from 'react';
import './LandingPage.css';

/**
 * PreCare SaaS Public Landing Page
 *
 * Sections:
 *  1. Navbar (Logo, How it works, For Clinics, Benefits, FAQ, Doctor Login, Get Started)
 *  2. Hero (Headline, Subheadline, CTAs, Split preview: Patient Chat & Structured Case)
 *  3. Problem (Traditional Clinic Intake vs PreCare Intake comparison)
 *  4. How It Works (Step 1-4 intake to consultation pipeline)
 *  5. For Clinics (Value propositions & Doctor Dashboard preview)
 *  6. Doctor Preview (Structured History, Timeline/Severity, Doctor control callout)
 *  7. Patient Experience (Conversational, Multilingual, Audio input, No jargon)
 *  8. Trust & Safety (Explicit boundaries: No AI diagnosis, Doctor control)
 *  9. FAQ (Interactive accordion)
 * 10. Final Call to Action (Start Patient Intake, Explore Doctor Dashboard)
 * 11. Footer (Navigation links, Copyright, Clinical disclaimer)
 *
 * @param {() => void} props.onGetStarted  Navigate to patient intake flow
 * @param {() => void} props.onDoctorLogin Navigate to doctor dashboard flow
 */
export default function LandingPage({ onGetStarted, onDoctorLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);

  // Navbar shadow on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const faqs = [
    {
      q: 'Does PreCare diagnose patients?',
      a: 'No. PreCare collects and structures patient history before the consultation. Clinical assessment, differential diagnosis, and all medical decisions remain exclusively with the consulting physician.',
    },
    {
      q: 'What information does PreCare collect?',
      a: 'PreCare collects chief complaint, duration, onset, pain/symptom location, severity scale (1-10), associated symptoms, past medical history, current medications, and known allergies through an adaptive conversational interview.',
    },
    {
      q: 'Can the doctor edit the AI-generated history?',
      a: 'Yes. Doctors have full control to edit or correct any field in the structured history during the consultation. Corrected fields are clearly indicated, while preserving the original conversation transcript for clinical auditing.',
    },
    {
      q: 'Which languages are supported?',
      a: 'PreCare currently supports English, Hindi (हिंदी), and Marathi (मराठी). Patients can respond naturally in their language of choice or use voice input.',
    },
    {
      q: 'Is patient data secure?',
      a: 'PreCare processes intake data in a session-scoped manner for the active clinical consultation. Enterprise on-premises deployments and HIPAA/data-privacy compliant configurations are available for healthcare organizations.',
    },
  ];

  return (
    <div className="lp-root">

      {/* ══════════════════════════════════════════════
          1. NAVBAR
      ══════════════════════════════════════════════ */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="lp-nav-inner">
          {/* Logo */}
          <button type="button" className="lp-logo" onClick={() => scrollTo('lp-hero')} aria-label="PreCare home">
            <span className="lp-logo-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            </span>
            <span className="lp-logo-text">PreCare</span>
          </button>

          {/* Desktop nav links */}
          <div className="lp-nav-links" role="menubar">
            <button type="button" className="lp-nav-link" onClick={() => scrollTo('lp-how')}>How it works</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollTo('lp-clinics')}>For Clinics</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollTo('lp-benefits')}>Benefits</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollTo('lp-faq')}>FAQ</button>
          </div>

          {/* Right actions */}
          <div className="lp-nav-actions">
            <button type="button" className="lp-nav-ghost" onClick={onDoctorLogin} id="nav-doctor-login">
              Doctor Login
            </button>
            <button type="button" className="lp-nav-cta" onClick={onGetStarted} id="nav-get-started">
              Get Started
            </button>
            {/* Mobile hamburger */}
            <button
              type="button"
              className="lp-hamburger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="lp-mobile-menu" role="menu">
            <button type="button" className="lp-mobile-link" onClick={() => scrollTo('lp-how')}>How it works</button>
            <button type="button" className="lp-mobile-link" onClick={() => scrollTo('lp-clinics')}>For Clinics</button>
            <button type="button" className="lp-mobile-link" onClick={() => scrollTo('lp-benefits')}>Benefits</button>
            <button type="button" className="lp-mobile-link" onClick={() => scrollTo('lp-faq')}>FAQ</button>
            <div className="lp-mobile-divider" />
            <button type="button" className="lp-mobile-link" onClick={onDoctorLogin}>Doctor Login</button>
            <button type="button" className="lp-mobile-cta" onClick={onGetStarted}>Get Started</button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════
          2. HERO SECTION
      ══════════════════════════════════════════════ */}
      <section id="lp-hero" className="lp-hero" aria-label="PreCare Hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Pre-Consultation Clinical Intake Platform
            </div>
            <h1 className="lp-hero-h1">
              AI-Assisted Patient Intake <br />
              <span className="lp-h1-accent">for Modern Clinics</span>
            </h1>
            <p className="lp-hero-sub">
              Collect, structure, and summarize patient history before the doctor consultation begins.
              Save doctors time on history-taking so they can focus more on patient care.
            </p>
            <div className="lp-hero-actions">
              <button type="button" className="lp-btn-primary" onClick={onGetStarted} id="hero-get-started">
                Start Patient Intake
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
              <button type="button" className="lp-btn-secondary" onClick={onDoctorLogin} id="hero-doctor-portal">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Open Doctor Dashboard
              </button>
            </div>
            <div className="lp-hero-meta-bullets">
              <span>✓ No AI diagnosis or prescribing</span>
              <span>✓ Multilingual (EN, HI, MR)</span>
              <span>✓ Doctor remains in full control</span>
            </div>
          </div>

          {/* Hero supporting visual — Clean split preview: Conversation on one side, Structured Case on the other */}
          <div className="lp-hero-split-preview" aria-hidden="true">
            <div className="lp-split-container">
              {/* Left pane: Patient Intake Chat */}
              <div className="lp-split-pane lp-split-pane--chat">
                <div className="lp-pane-header">
                  <div className="lp-pane-title">
                    <span className="lp-pane-dot lp-pane-dot--chat" />
                    Patient Intake Conversation
                  </div>
                  <span className="lp-pane-pill">Voice & Text</span>
                </div>
                <div className="lp-split-chat-body">
                  <div className="lp-bubble lp-bubble--ai">
                    Hello Ananya, I'm PreCare. What brings you in today?
                  </div>
                  <div className="lp-bubble lp-bubble--patient">
                    I have had a severe throbbing headache for 2 days.
                  </div>
                  <div className="lp-bubble lp-bubble--ai">
                    Understood. On a scale of 1 to 10, how severe is the pain? Any nausea or light sensitivity?
                  </div>
                  <div className="lp-bubble lp-bubble--patient">
                    Around 7 out of 10. Yes, nausea started this morning.
                  </div>
                </div>
              </div>

              {/* Center transformation arrow badge */}
              <div className="lp-split-arrow">
                <span className="lp-split-arrow-badge">AI Structures</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </div>

              {/* Right pane: Structured Doctor Case Summary */}
              <div className="lp-split-pane lp-split-pane--case">
                <div className="lp-pane-header">
                  <div className="lp-pane-title">
                    <span className="lp-pane-dot lp-pane-dot--doctor" />
                    Structured Patient Case
                  </div>
                  <span className="lp-pane-pill lp-pane-pill--waiting">Ready for Doctor</span>
                </div>
                <div className="lp-split-case-body">
                  <div className="lp-case-summary-card">
                    <div className="lp-mini-patient-info">
                      <strong>Ananya R.</strong> · 34y · Female
                    </div>
                    <div className="lp-case-table">
                      <div className="lp-case-row">
                        <span className="lp-k">Chief Complaint</span>
                        <span className="lp-v lp-v--bold">Headache (throbbing)</span>
                      </div>
                      <div className="lp-case-row">
                        <span className="lp-k">Onset & Duration</span>
                        <span className="lp-v">2 days (gradual onset)</span>
                      </div>
                      <div className="lp-case-row">
                        <span className="lp-k">Severity</span>
                        <span className="lp-v lp-v--sev">7 / 10</span>
                      </div>
                      <div className="lp-case-row">
                        <span className="lp-k">Associated</span>
                        <span className="lp-v">Nausea (reported today)</span>
                      </div>
                      <div className="lp-case-row">
                        <span className="lp-k">Past History</span>
                        <span className="lp-v">Patient denied HTN/DM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-hero-fade" aria-hidden="true" />
      </section>

      {/* ══════════════════════════════════════════════
          3. THE PROBLEM SECTION
      ══════════════════════════════════════════════ */}
      <section className="lp-section lp-section--alt" aria-label="Traditional vs PreCare Intake">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <div className="lp-eyebrow">The Intake Bottleneck</div>
            <h2 className="lp-h2">Traditional Clinic Intake vs. PreCare Intake</h2>
            <p className="lp-body lp-body--center">
              Doctors spend up to 40% of standard appointment time extracting routine history questions from scratch.
              PreCare transforms this workflow.
            </p>
          </div>

          <div className="lp-compare-grid">
            {/* Traditional Column */}
            <div className="lp-compare-card lp-compare-card--bad">
              <div className="lp-compare-head">
                <div className="lp-compare-tag lp-compare-tag--bad">Traditional Clinic Intake</div>
                <h3 className="lp-compare-title">Rushed, Fragmented Intake</h3>
              </div>
              <ul className="lp-compare-list">
                <li>
                  <span className="lp-compare-icon lp-compare-icon--bad">✕</span>
                  <div>
                    <strong>Rushed consultations</strong>
                    <p>Valuable clinical time is absorbed by repetitive data-gathering rather than patient evaluation.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-compare-icon lp-compare-icon--bad">✕</span>
                  <div>
                    <strong>Repeating history multiple times</strong>
                    <p>Patients repeat symptoms to receptionist, assistant, nurse, and finally the doctor.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-compare-icon lp-compare-icon--bad">✕</span>
                  <div>
                    <strong>Doctors typing while patients talk</strong>
                    <p>Lack of eye contact as clinicians scramble to transcribe symptoms into the EHR system.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-compare-icon lp-compare-icon--bad">✕</span>
                  <div>
                    <strong>Incomplete intake details</strong>
                    <p>Key details like duration, severity scale, or prior medications get skipped under pressure.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* PreCare Column */}
            <div className="lp-compare-card lp-compare-card--good">
              <div className="lp-compare-head">
                <div className="lp-compare-tag lp-compare-tag--good">PreCare Intake Platform</div>
                <h3 className="lp-compare-title">Structured, Ready Before Consultation</h3>
              </div>
              <ul className="lp-compare-list">
                <li>
                  <span className="lp-compare-icon lp-compare-icon--good">✓</span>
                  <div>
                    <strong>Structured intake before consultation</strong>
                    <p>Patient finishes conversational intake in waiting room or prior to clinic arrival.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-compare-icon lp-compare-icon--good">✓</span>
                  <div>
                    <strong>Doctors review ready-made case</strong>
                    <p>The doctor walks in with a concise clinical timeline, symptom map, and medical background.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-compare-icon lp-compare-icon--good">✓</span>
                  <div>
                    <strong>More face-to-face consultation time</strong>
                    <p>Clinicians maintain uninterrupted personal contact, physical exam, and focused care.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-compare-icon lp-compare-icon--good">✓</span>
                  <div>
                    <strong>Complete, consistent history collection</strong>
                    <p>Systematic coverage of chief complaint, onset, severity, history, medications, and allergies.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. HOW IT WORKS (STEP-BY-STEP)
      ══════════════════════════════════════════════ */}
      <section id="lp-how" className="lp-section" aria-label="How it works">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <div className="lp-eyebrow">Step-by-Step Workflow</div>
            <h2 className="lp-h2">How PreCare Works</h2>
            <p className="lp-body lp-body--center">
              A frictionless four-stage process designed to seamlessly augment existing clinical operations.
            </p>
          </div>

          <div className="lp-steps-grid">
            <div className="lp-step-box">
              <div className="lp-step-badge">Step 1</div>
              <div className="lp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="lp-step-title">Patient Starts Intake</h3>
              <p className="lp-step-desc">
                Patient enters demographics and initial symptoms through a friendly, simple guided interface on phone, tablet, or kiosk.
              </p>
            </div>

            <div className="lp-step-box">
              <div className="lp-step-badge">Step 2</div>
              <div className="lp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="lp-step-title">Adaptive Conversational Follow-Up</h3>
              <p className="lp-step-desc">
                AI asks intelligent, targeted follow-up questions tailored to the reported complaint to clarify onset, duration, severity, and history.
              </p>
            </div>

            <div className="lp-step-box">
              <div className="lp-step-badge">Step 3</div>
              <div className="lp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <h3 className="lp-step-title">Structured Clinical History</h3>
              <p className="lp-step-desc">
                Information is automatically synthesized into chief complaint, onset, duration, severity, medications, and medical background.
              </p>
            </div>

            <div className="lp-step-box">
              <div className="lp-step-badge">Step 4</div>
              <div className="lp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="lp-step-title">Doctor Reviews & Consults</h3>
              <p className="lp-step-desc">
                Doctor opens the case in the dashboard, reviews the organized history, corrects any notes if needed, and conducts the consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. FOR CLINICS SECTION
      ══════════════════════════════════════════════ */}
      <section id="lp-clinics" className="lp-section lp-section--alt" aria-label="For Clinics">
        <div className="lp-section-inner lp-clinics-grid">
          <div className="lp-clinics-text">
            <div className="lp-eyebrow">Value Proposition</div>
            <h2 className="lp-h2">Built Specifically for Modern Healthcare Clinics</h2>
            <p className="lp-body">
              PreCare integrates into daily clinical reality without disrupting staff workflows or adding software friction.
            </p>

            <div id="lp-benefits" className="lp-benefit-list">
              <div className="lp-benefit-item">
                <span className="lp-benefit-icon">⏱</span>
                <div>
                  <strong>Reduces intake time during consultation</strong>
                  <p>Doctors reclaim 5-8 minutes per patient by eliminating redundant question rounds.</p>
                </div>
              </div>
              <div className="lp-benefit-item">
                <span className="lp-benefit-icon">📋</span>
                <div>
                  <strong>Improves consistency of clinical history</strong>
                  <p>Standardized intake protocols ensure crucial questions are never forgotten.</p>
                </div>
              </div>
              <div className="lp-benefit-item">
                <span className="lp-benefit-icon">⚡</span>
                <div>
                  <strong>Helps doctors review cases faster</strong>
                  <p>Clean scannable summaries give clinicians an instant picture before walking in.</p>
                </div>
              </div>
              <div className="lp-benefit-item">
                <span className="lp-benefit-icon">📱</span>
                <div>
                  <strong>Easy for patients to use</strong>
                  <p>Simple mobile or kiosk interface requiring zero technical knowledge or medical vocabulary.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Queue Preview */}
          <div className="lp-clinics-visual" aria-hidden="true">
            <div className="lp-dash-mock">
              <div className="lp-dash-topbar">
                <div className="lp-dash-logo">
                  <span className="lp-dash-logo-icon">+</span> PreCare Doctor Dashboard
                </div>
                <span className="lp-dash-tag">Dr. Sarah Jenkins</span>
              </div>
              <div className="lp-dash-section-label">Patient Queue · 3 Active Cases</div>
              {[
                { name: 'Ananya Sharma', age: '34', gender: 'F', complaint: 'Throbbing Headache', dur: '2 days', sev: '7/10', status: 'Waiting' },
                { name: 'Rajesh Gupta', age: '52', gender: 'M', complaint: 'Persistent Dry Cough', dur: '5 days', sev: '5/10', status: 'In Consultation' },
                { name: 'Priya Mehta', age: '28', gender: 'F', complaint: 'Lower Back Strain', dur: '3 days', sev: '4/10', status: 'Completed' },
              ].map((p, i) => (
                <div key={i} className="lp-dash-row">
                  <div className="lp-dash-avatar">{p.name[0]}</div>
                  <div className="lp-dash-info">
                    <div className="lp-dash-pname">{p.name}</div>
                    <div className="lp-dash-pmeta">{p.age}y · {p.gender} · {p.complaint} · {p.dur} · {p.sev}</div>
                  </div>
                  <span className={`lp-dash-badge lp-dash-badge--${p.status.toLowerCase().replace(' ', '-')}`}>
                    {p.status}
                  </span>
                </div>
              ))}
              <div className="lp-dash-footer-note">
                ⚡ Real-time synchronization as patients finish intake
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. DOCTOR SECTION / CASE REVIEW PREVIEW
      ══════════════════════════════════════════════ */}
      <section className="lp-section" aria-label="Doctor Case Review Preview">
        <div className="lp-section-inner lp-doctor-grid">
          {/* Visual preview of Doctor Case Review */}
          <div className="lp-doctor-visual" aria-hidden="true">
            <div className="lp-case-mock">
              <div className="lp-case-header">
                <div className="lp-case-avatar">A</div>
                <div>
                  <div className="lp-case-pname">Ananya Sharma</div>
                  <div className="lp-case-pmeta">34 yrs · Female · English · ID #PC-4921</div>
                </div>
                <span className="lp-case-badge">Waiting</span>
              </div>
              <div className="lp-case-divider" />
              <div className="lp-case-meta-row">
                <div className="lp-case-title">Structured Health History</div>
                <div className="lp-case-actions-preview">
                  <span className="lp-action-tag">✏️ Editable by Doctor</span>
                  <span className="lp-action-tag">💬 View Conversation</span>
                </div>
              </div>

              <div className="lp-case-fields">
                {[
                  ['Chief Complaint', 'Headache (severe throbbing)'],
                  ['Onset & Duration', 'Started 2 days ago, worsening in morning'],
                  ['Location', 'Bilateral frontal & temple region'],
                  ['Severity Scale', '7 / 10 (moderate-severe)'],
                  ['Associated Symptoms', 'Nausea, mild photophobia reported'],
                  ['Medical History', 'Patient denied hypertension or diabetes'],
                  ['Current Medications', 'Paracetamol 500mg taken once yesterday'],
                  ['Allergies', 'No known drug allergies (NKDA)'],
                ].map(([label, val], i) => (
                  <div key={i} className="lp-case-field">
                    <span className="lp-case-label">{label}</span>
                    <span className={`lp-case-val${label.includes('Severity') ? ' lp-case-val--sev' : ''}`}>{val}</span>
                  </div>
                ))}
              </div>

              <button type="button" className="lp-case-start-btn">
                Start Consultation Workspace →
              </button>
            </div>
          </div>

          <div className="lp-doctor-text">
            <div className="lp-eyebrow">Doctor Case Review</div>
            <h2 className="lp-h2">Walk into the Consultation Fully Prepared</h2>
            <p className="lp-body">
              Before the patient enters the consultation room, the doctor already has a clean, organized case file waiting.
              No sorting through unformatted notes or asking basic preliminary questions.
            </p>

            <ul className="lp-doctor-check-list">
              <li>
                <strong>Chief Complaint & Timeline:</strong> Instant clarity on onset, progression, and trigger factors.
              </li>
              <li>
                <strong>Severity & Associated Symptoms:</strong> Standardized numerical pain/discomfort scores and related clinical flags.
              </li>
              <li>
                <strong>Doctor Edit Control:</strong> Doctors can edit or update any history field during consultation with audit transparency.
              </li>
              <li>
                <strong>Original Transcript Available:</strong> One click toggles the complete unedited conversation with timestamps.
              </li>
            </ul>

            <div className="lp-doctor-callout">
              <div className="lp-callout-icon">🛡️</div>
              <div>
                <strong>Doctors remain in full control.</strong>
                <p>PreCare prepares the history—the doctor makes the medical decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7. PATIENT EXPERIENCE SECTION
      ══════════════════════════════════════════════ */}
      <section className="lp-section lp-section--alt" aria-label="Patient Experience">
        <div className="lp-section-inner lp-patient-grid">
          <div className="lp-patient-text">
            <div className="lp-eyebrow">Patient Experience</div>
            <h2 className="lp-h2">Simple, Empathetic, and Natural for Patients</h2>
            <p className="lp-body">
              Filling out static paper clipboards or tedious multi-page online forms is frustrating.
              PreCare offers an intuitive, conversational interview that feels like talking to a healthcare assistant.
            </p>

            <div className="lp-patient-features">
              <div className="lp-patient-feature">
                <span className="lp-feature-icon">💬</span>
                <div>
                  <div className="lp-feature-label">Conversational, Easy to Use</div>
                  <div className="lp-feature-desc">Guided one-question-at-a-time flow that never overwhelms the patient.</div>
                </div>
              </div>
              <div className="lp-patient-feature">
                <span className="lp-feature-icon">🌐</span>
                <div>
                  <div className="lp-feature-label">Multi-Language Support</div>
                  <div className="lp-feature-desc">Available in English, Hindi (हिंदी), and Marathi (मराठी) so patients speak comfortably.</div>
                </div>
              </div>
              <div className="lp-patient-feature">
                <span className="lp-feature-icon">🎙️</span>
                <div>
                  <div className="lp-feature-label">Audio & Voice Input Option</div>
                  <div className="lp-feature-desc">Patients can speak their answers directly via integrated microphone support.</div>
                </div>
              </div>
              <div className="lp-patient-feature">
                <span className="lp-feature-icon">✨</span>
                <div>
                  <div className="lp-feature-label">No Medical Jargon Needed</div>
                  <div className="lp-feature-desc">Patients describe symptoms in plain everyday words; AI organizes into clinical categories.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Chat Mockup */}
          <div className="lp-patient-visual" aria-hidden="true">
            <div className="lp-chat-mock">
              <div className="lp-chat-header">
                <div className="lp-chat-ai-dot" />
                <div className="lp-chat-title">PreCare AI Assistant</div>
                <div className="lp-chat-lang-badge">English / हिंदी / मराठी</div>
              </div>
              <div className="lp-chat-messages">
                <div className="lp-chat-msg lp-chat-msg--ai">
                  Thank you, Ananya. I've noted your headache. When did it first begin?
                </div>
                <div className="lp-chat-msg lp-chat-msg--patient">
                  It started two days ago in the evening.
                </div>
                <div className="lp-chat-msg lp-chat-msg--ai">
                  Understood — about 2 days ago. Can you point out where the pain is situated, and how severe it feels from 1 to 10?
                </div>
                <div className="lp-chat-msg lp-chat-msg--patient">
                  🎙️ [Voice Input] "Across the front of my forehead and right temple. Feels around a 7."
                </div>
                <div className="lp-chat-msg lp-chat-msg--ai">
                  Got it. Have you noticed any other symptoms alongside, like nausea, dizziness, or light sensitivity?
                </div>
              </div>
              <div className="lp-chat-input-bar">
                <span className="lp-chat-input-ph">Type or speak your answer...</span>
                <span className="lp-chat-mic">🎙️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          8. TRUST & SAFETY SECTION
      ══════════════════════════════════════════════ */}
      <section className="lp-section lp-section--trust" aria-label="Trust and Clinical Safety">
        <div className="lp-section-inner lp-trust">
          <div className="lp-section-header">
            <div className="lp-eyebrow lp-eyebrow--light">Clinical Safety First</div>
            <h2 className="lp-h2 lp-h2--light">Clear Clinical Boundaries You Can Trust</h2>
            <p className="lp-body lp-body--light lp-body--center">
              PreCare is strictly an information intake and history structuring engine.
              We hold firm ethical boundaries regarding clinical decision-making.
            </p>
          </div>

          <div className="lp-trust-cards">
            <div className="lp-trust-card">
              <span className="lp-trust-icon">🚫</span>
              <h3 className="lp-trust-title">No Medical Diagnoses</h3>
              <p className="lp-trust-desc">
                PreCare does NOT provide medical diagnoses or speculate on conditions. Only the licensed physician diagnoses.
              </p>
            </div>

            <div className="lp-trust-card">
              <span className="lp-trust-icon">💊</span>
              <h3 className="lp-trust-title">No Treatment Recommendations</h3>
              <p className="lp-trust-desc">
                PreCare does NOT recommend treatments, drugs, or dosages. Clinical management stays 100% in doctor hands.
              </p>
            </div>

            <div className="lp-trust-card">
              <span className="lp-trust-icon">🩺</span>
              <h3 className="lp-trust-title">Does Not Replace Doctors</h3>
              <p className="lp-trust-desc">
                PreCare is an assistant for intake preparation, designed to empower doctor-patient relationships, never replace them.
              </p>
            </div>

            <div className="lp-trust-card">
              <span className="lp-trust-icon">👨‍⚕️</span>
              <h3 className="lp-trust-title">Physician Authority</h3>
              <p className="lp-trust-desc">
                All clinical assessments, treatment decisions, and prescriptions remain solely with the consulting physician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          9. FAQ SECTION
      ══════════════════════════════════════════════ */}
      <section id="lp-faq" className="lp-section" aria-label="Frequently Asked Questions">
        <div className="lp-section-inner lp-faq">
          <div className="lp-section-header">
            <div className="lp-eyebrow">Frequently Asked Questions</div>
            <h2 className="lp-h2">Everything You Need to Know</h2>
          </div>
          <div className="lp-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`lp-faq-item${faqOpen === i ? ' lp-faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="lp-faq-q"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  aria-expanded={faqOpen === i}
                  id={`faq-btn-${i}`}
                >
                  <span>{faq.q}</span>
                  <span className="lp-faq-icon" aria-hidden="true">
                    {faqOpen === i ? '−' : '+'}
                  </span>
                </button>
                {faqOpen === i && (
                  <div className="lp-faq-a" role="region">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          10. FINAL CALL TO ACTION SECTION
      ══════════════════════════════════════════════ */}
      <section className="lp-section lp-section--cta" aria-label="Call to action">
        <div className="lp-section-inner lp-cta">
          <h2 className="lp-h2 lp-h2--light">Modernize your clinic's patient intake today.</h2>
          <p className="lp-body lp-body--light lp-body--center">
            Save doctors time on patient history-taking so they can focus more on the consultation.
          </p>
          <div className="lp-cta-actions">
            <button type="button" className="lp-btn-primary lp-btn-primary--large" onClick={onGetStarted} id="cta-get-started">
              Start Patient Intake
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button type="button" className="lp-btn-ghost-light" onClick={onDoctorLogin} id="cta-doctor-dashboard">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Explore Doctor Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          11. FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo-row">
                <span className="lp-logo-icon lp-footer-logo-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M5 12h14" />
                  </svg>
                </span>
                <span className="lp-footer-name">PreCare</span>
              </div>
              <p className="lp-footer-tagline">
                AI-assisted pre-consultation platform for clinics. Streamlining patient intake to give clinicians more time for direct patient care.
              </p>
            </div>

            <div className="lp-footer-nav-groups">
              <div className="lp-footer-group">
                <div className="lp-footer-head">Platform</div>
                <button type="button" className="lp-footer-link" onClick={() => scrollTo('lp-how')}>How It Works</button>
                <button type="button" className="lp-footer-link" onClick={() => scrollTo('lp-clinics')}>For Clinics</button>
                <button type="button" className="lp-footer-link" onClick={() => scrollTo('lp-benefits')}>Benefits</button>
                <button type="button" className="lp-footer-link" onClick={() => scrollTo('lp-faq')}>FAQ</button>
              </div>
              <div className="lp-footer-group">
                <div className="lp-footer-head">Access</div>
                <button type="button" className="lp-footer-link" onClick={onGetStarted}>Patient Intake</button>
                <button type="button" className="lp-footer-link" onClick={onDoctorLogin}>Doctor Dashboard</button>
              </div>
            </div>
          </div>

          <div className="lp-footer-divider" />

          <div className="lp-footer-bottom">
            <p className="lp-footer-copy">
              © {new Date().getFullYear()} PreCare. All rights reserved.
            </p>
            {/* Required Legal Disclaimer */}
            <p className="lp-footer-disclaimer">
              Legal Disclaimer: PreCare is an AI-assisted intake and clinical history structuring tool. It does not provide medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
