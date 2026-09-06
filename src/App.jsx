import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressIndicator from './components/ProgressIndicator';
import PatientDetailsForm from './components/PatientDetailsForm';
import ComplaintScreen from './components/ComplaintScreen';
import ChatInterface from './components/ChatInterface';
import IntakeSummary from './components/IntakeSummary';
import DoctorCaseView from './components/DoctorCaseView';
import ConsultationWorkspace from './components/ConsultationWorkspace';
import LandingPage from './components/LandingPage';
import ClinicSignUp from './components/ClinicSignUp';
import ClinicSetup from './components/ClinicSetup';
import ClinicLogin from './components/ClinicLogin';
import ClinicDashboard from './components/ClinicDashboard';
import caseStore from './services/caseStore';
import clinicAuthStore from './services/clinicAuthStore';
import './App.css';

/**
 * Helper to determine route from current browser URL pathname
 */
function getRouteFromLocation() {
  const path = window.location.pathname;
  if (path.startsWith('/intake/')) {
    const parts = path.split('/').filter(Boolean);
    return { view: 'patient', clinicId: parts[1] || 'default-clinic' };
  }
  if (path === '/signup') return { view: 'signup' };
  if (path === '/login') return { view: 'login' };
  if (path === '/onboarding') return { view: 'onboarding' };
  if (path === '/dashboard') return { view: 'dashboard' };
  return { view: 'landing' };
}

/**
 * PreCare SaaS Platform — Step 2 (Clinic Onboarding & Account Creation)
 *
 * Routes supported:
 *   /                 → Landing page
 *   /signup           → Clinic signup
 *   /login            → Clinic login
 *   /onboarding       → Clinic setup
 *   /dashboard        → Clinic dashboard (with case review and workspace)
 *   /intake/:clinicId → Clinic-scoped patient intake (no login needed)
 */
function App() {
  // ── Route State ───────────────────────────────────────────────────────────
  const [currentRoute, setCurrentRoute] = useState(() => getRouteFromLocation());
  const [activeClinic, setActiveClinic] = useState(() => clinicAuthStore.getCurrentClinic());
  const [intakeClinicInfo, setIntakeClinicInfo] = useState(null);

  // Sync active clinic session
  useEffect(() => {
    const unsub = clinicAuthStore.subscribe((clinic) => {
      setActiveClinic(clinic);
    });
    return unsub;
  }, []);

  // Listen for browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getRouteFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch clinic info when on patient intake route
  useEffect(() => {
    if (currentRoute.view === 'patient' && currentRoute.clinicId) {
      clinicAuthStore.getClinicById(currentRoute.clinicId).then((info) => {
        setIntakeClinicInfo(info);
      });
    } else {
      setIntakeClinicInfo(null);
    }
  }, [currentRoute.view, currentRoute.clinicId]);

  // Navigate helper that updates URL and state
  const navigate = (view, params = {}) => {
    let path = '/';
    if (view === 'signup') path = '/signup';
    else if (view === 'login') path = '/login';
    else if (view === 'onboarding') path = '/onboarding';
    else if (view === 'dashboard') path = '/dashboard';
    else if (view === 'patient') path = `/intake/${params.clinicId || activeClinic?.id || 'default-clinic'}`;
    else path = '/';

    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentRoute({ view, ...params });
  };

  // ── Patient flow state ────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [patientData, setPatientData] = useState({
    name: '', age: '', gender: '', language: '', complaint: '',
  });
  const [structuredHistory, setStructuredHistory] = useState(null);
  const [conversationTranscript, setConversationTranscript] = useState([]);

  // ── Doctor / Clinic Flow State ────────────────────────────────────────────
  const [cases, setCases] = useState(() => caseStore.getCases(activeClinic?.id));
  const [doctorScreen, setDoctorScreen] = useState('queue'); // 'queue' | 'case' | 'workspace'
  const [activeCaseId, setActiveCaseId] = useState(null);

  // Subscribe to caseStore and sync from backend
  useEffect(() => {
    if (activeClinic?.id) {
      caseStore.syncClinicCases(activeClinic.id);
    }
    const unsub = caseStore.subscribe((all) => {
      if (activeClinic?.id) {
        setCases(all.filter((c) => c.clinicId === activeClinic.id));
      } else {
        setCases(all);
      }
    });
    return unsub;
  }, [activeClinic?.id]);

  // If a case is opened, ensure fresh data from server
  useEffect(() => {
    if (activeCaseId && activeClinic?.id) {
      caseStore.fetchCaseById(activeCaseId);
    }
  }, [activeCaseId, activeClinic?.id]);

  const activeCase = activeCaseId
    ? cases.find((c) => c.id === activeCaseId) ?? null
    : null;

  // ── Patient flow handlers ─────────────────────────────────────────────────
  const handleStart = () => setCurrentScreen('details');

  const handleDetailsSubmit = (details) => {
    setPatientData((prev) => ({ ...prev, ...details }));
    setCurrentScreen('complaint');
  };

  const handleComplaintSubmit = (complaintText) => {
    setPatientData((prev) => ({ ...prev, complaint: complaintText }));
    setCurrentScreen('consultation');
  };

  const handleConsultationComplete = ({ history, conversation }) => {
    setStructuredHistory(history);
    setConversationTranscript(conversation);
    setCurrentScreen('summary');
  };

  const handleBackToWelcome = () => setCurrentScreen('welcome');
  const handleBackToDetails = () => setCurrentScreen('details');
  const handleBackToComplaint = () => setCurrentScreen('complaint');
  const handleEditFromSummary = () => setCurrentScreen('consultation');

  const handleReset = () => {
    setPatientData({ name: '', age: '', gender: '', language: '', complaint: '' });
    setStructuredHistory(null);
    setConversationTranscript([]);
    setCurrentScreen('welcome');
  };

  // ── Doctor Flow Handlers ──────────────────────────────────────────────────
  const handleOpenCase = (caseId) => {
    setActiveCaseId(caseId);
    setDoctorScreen('case');
  };

  const handleBackToQueue = () => {
    setDoctorScreen('queue');
    setActiveCaseId(null);
  };

  const handleStartConsultation = (caseId) => {
    setActiveCaseId(caseId);
    setDoctorScreen('workspace');
  };

  const handleConsultationComplete2 = () => {
    setDoctorScreen('queue');
    setActiveCaseId(null);
  };

  const handleBackFromWorkspace = () => {
    setDoctorScreen('case');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ROUTE RENDERING
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Landing Page
  if (currentRoute.view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => navigate('signup')}
        onDoctorLogin={() => navigate('login')}
      />
    );
  }

  // 2. Clinic Sign Up (/signup)
  if (currentRoute.view === 'signup') {
    return (
      <ClinicSignUp
        onNavigateToLogin={() => navigate('login')}
        onNavigateToSetup={() => navigate('onboarding')}
        onNavigateToHome={() => navigate('landing')}
      />
    );
  }

  // 3. Clinic Setup (/onboarding)
  if (currentRoute.view === 'onboarding') {
    return (
      <ClinicSetup
        onCompleteSetup={() => navigate('dashboard')}
      />
    );
  }

  // 4. Clinic Sign In (/login)
  if (currentRoute.view === 'login') {
    return (
      <ClinicLogin
        onLoginSuccess={() => navigate('dashboard')}
        onNavigateToSignUp={() => navigate('signup')}
        onNavigateToHome={() => navigate('landing')}
      />
    );
  }

  // 5. Clinic Dashboard (/dashboard)
  if (currentRoute.view === 'dashboard') {
    // If not logged in, redirect to login
    if (!activeClinic) {
      return (
        <ClinicLogin
          onLoginSuccess={() => navigate('dashboard')}
          onNavigateToSignUp={() => navigate('signup')}
          onNavigateToHome={() => navigate('landing')}
        />
      );
    }

    // Inside dashboard, handle sub-screens: queue, case, workspace
    if (doctorScreen === 'case' && activeCase) {
      return (
        <div className="app-container app-container--wide">
          <header className="app-header">
            <button
              type="button"
              className="brand-badge brand-badge--btn"
              onClick={handleBackToQueue}
              title="Return to Clinic Dashboard"
            >
              <div className="brand-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
              </div>
              <span className="brand-name">PreCare</span>
            </button>
            <div className="header-right">
              <span className="brand-tag brand-tag--doctor">Case Review · {activeClinic.clinicName}</span>
              <button
                type="button"
                className="home-nav-btn"
                onClick={handleBackToQueue}
              >
                ← Back to Queue
              </button>
            </div>
          </header>

          <main id="doctor-main-content">
            <DoctorCaseView
              caseId={activeCaseId}
              caseData={activeCase}
              onBack={handleBackToQueue}
              onStartConsultation={handleStartConsultation}
            />
          </main>
        </div>
      );
    }

    if (doctorScreen === 'workspace' && activeCase) {
      return (
        <div className="app-container app-container--wide">
          <main id="doctor-main-content">
            <ConsultationWorkspace
              caseId={activeCaseId}
              caseData={activeCase}
              onComplete={handleConsultationComplete2}
              onBack={handleBackFromWorkspace}
            />
          </main>
        </div>
      );
    }

    // Default: Main Clinic Dashboard
    return (
      <ClinicDashboard
        onOpenCase={handleOpenCase}
        onSignOut={() => {
          clinicAuthStore.logout();
          navigate('login');
        }}
        onOpenIntake={(clinicId) => navigate('patient', { clinicId })}
      />
    );
  }

  // 6. Patient Intake (/intake/:clinicId)
  const patientClinicId = currentRoute.clinicId || activeClinic?.id || 'default-clinic';
  const clinicDisplay = intakeClinicInfo?.clinicName || (activeClinic?.id === patientClinicId ? activeClinic?.clinicName : 'Clinic Intake');
  const doctorDisplay = intakeClinicInfo?.doctorName || (activeClinic?.id === patientClinicId ? activeClinic?.doctorName : '');

  return (
    <div className="app-container">
      {/* Patient Intake Header */}
      <header className="app-header">
        <button
          type="button"
          className="brand-badge brand-badge--btn"
          onClick={() => navigate('landing')}
          title="PreCare Home"
        >
          <div className="brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          </div>
          <span className="brand-name">PreCare</span>
        </button>

        <div className="header-right">
          <div className="patient-clinic-tag" title={`Intake for ${clinicDisplay}`}>
            <span className="patient-clinic-dot" />
            <strong>{clinicDisplay}</strong>
            {doctorDisplay && <span className="patient-clinic-doc"> · {doctorDisplay}</span>}
          </div>

          {activeClinic && (
            <button
              type="button"
              className="home-nav-btn"
              onClick={() => navigate('dashboard')}
              title="Return to Clinic Dashboard"
            >
              ← Dashboard
            </button>
          )}
        </div>
      </header>

      {/* Patient Flow Progress Indicator */}
      {currentScreen === 'details' && <ProgressIndicator currentStep={1} />}
      {currentScreen === 'complaint' && <ProgressIndicator currentStep={2} />}
      {currentScreen === 'consultation' && <ProgressIndicator currentStep={3} />}

      {/* Patient Screens */}
      <main id="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {currentScreen === 'welcome' && (
          <WelcomeScreen onStart={handleStart} />
        )}
        {currentScreen === 'details' && (
          <PatientDetailsForm
            initialData={patientData}
            onSubmit={handleDetailsSubmit}
            onBack={handleBackToWelcome}
          />
        )}
        {currentScreen === 'complaint' && (
          <ComplaintScreen
            patientInfo={patientData}
            initialComplaint={patientData.complaint}
            onSubmit={handleComplaintSubmit}
            onBack={handleBackToDetails}
          />
        )}
        {currentScreen === 'consultation' && (
          <ChatInterface
            patientInfo={patientData}
            initialComplaint={patientData.complaint}
            savedHistory={structuredHistory}
            savedMessages={conversationTranscript}
            onComplete={handleConsultationComplete}
            onBack={handleBackToComplaint}
          />
        )}
        {currentScreen === 'summary' && (
          <IntakeSummary
            patientData={patientData}
            history={structuredHistory}
            conversation={conversationTranscript}
            clinicId={patientClinicId}
            onEdit={handleEditFromSummary}
            onReset={handleReset}
            onSubmitToDoctor={() => {
              // Patient completed submission to clinic
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
