import React, { useState } from 'react';
import clinicAuthStore from '../services/clinicAuthStore';
import './ClinicSetup.css';

/**
 * ClinicSetup Component (Onboarding)
 *
 * Route: /onboarding
 * Heading: "Set up your clinic"
 * Fields: Clinic Name, Doctor Name, Specialization, Clinic Location, Consultation Languages
 * Button: "Continue to Dashboard"
 */
export default function ClinicSetup({ onCompleteSetup }) {
  const currentClinic = clinicAuthStore.getCurrentClinic();

  const [clinicName, setClinicName] = useState(currentClinic?.clinicName || '');
  const [doctorName, setDoctorName] = useState(currentClinic?.doctorName || '');
  const [specialization, setSpecialization] = useState(currentClinic?.specialization || 'General Practice');
  const [location, setLocation] = useState(currentClinic?.location || '');
  const [languages, setLanguages] = useState(
    currentClinic?.languages && currentClinic.languages.length > 0
      ? currentClinic.languages
      : ['English', 'Hindi']
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableLanguages = [
    { id: 'English', label: 'English' },
    { id: 'Hindi', label: 'Hindi (हिंदी)' },
    { id: 'Marathi', label: 'Marathi (मराठी)' },
  ];

  const toggleLanguage = (lang) => {
    if (languages.includes(lang)) {
      if (languages.length === 1) return; // keep at least one
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clinicName.trim()) {
      setError('Clinic name is required.');
      return;
    }
    if (!doctorName.trim()) {
      setError('Doctor name is required.');
      return;
    }

    setLoading(true);

    const clinicId = currentClinic?.id;
    if (!clinicId) {
      setError('Active clinic session not found.');
      setLoading(false);
      return;
    }

    const res = await clinicAuthStore.updateClinic(clinicId, {
      clinicName: clinicName.trim(),
      doctorName: doctorName.trim(),
      specialization: specialization.trim(),
      location: location.trim(),
      languages,
    });

    setLoading(false);

    if (res.ok) {
      onCompleteSetup();
    } else {
      setError(res.error || 'Failed to complete clinic setup.');
    }
  };

  return (
    <div className="setup-page-root">
      <div className="setup-card-container">
        <div className="setup-card">
          <div className="setup-card-header">
            <span className="setup-step-pill">Step 2 of 2 · Quick Setup</span>
            <h1 className="setup-title">Set up your clinic</h1>
            <p className="setup-subtitle">
              Configure basic details so your patient intake links and doctor dashboard reflect your practice.
            </p>
          </div>

          {error && (
            <div className="setup-error-banner" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="setup-form-group">
              <label htmlFor="setup-clinic-name">Clinic Name</label>
              <input
                type="text"
                id="setup-clinic-name"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Apex Health Clinic"
                disabled={loading}
              />
            </div>

            <div className="setup-form-group">
              <label htmlFor="setup-doctor-name">Doctor Name</label>
              <input
                type="text"
                id="setup-doctor-name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Kumar"
                disabled={loading}
              />
            </div>

            <div className="setup-form-row">
              <div className="setup-form-group">
                <label htmlFor="setup-specialization">Specialization</label>
                <select
                  id="setup-specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  disabled={loading}
                >
                  <option value="General Practice">General Practice (GP)</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Family Medicine">Family Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Other">Other Specialty</option>
                </select>
              </div>

              <div className="setup-form-group">
                <label htmlFor="setup-location">Clinic Location</label>
                <input
                  type="text"
                  id="setup-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bandra West, Mumbai"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="setup-form-group">
              <label>Consultation Languages</label>
              <p className="setup-hint">Select the languages your clinic supports for patient intake:</p>
              <div className="setup-lang-chips">
                {availableLanguages.map((lang) => {
                  const selected = languages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      className={`setup-lang-chip ${selected ? 'setup-lang-chip--active' : ''}`}
                      onClick={() => toggleLanguage(lang.id)}
                    >
                      <span>{selected ? '✓' : '+'}</span>
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="setup-btn-submit"
              id="btn-continue-dashboard"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Continue to Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
