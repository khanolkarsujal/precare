import React, { useState } from 'react';
import './PatientDetailsForm.css';

/**
 * PatientDetailsForm component
 * Collects Name, Age, Gender, and Preferred Language with validation.
 *
 * @param {Object} props
 * @param {Object} props.initialData - Pre-existing patient details
 * @param {(data: Object) => void} props.onSubmit - Callback when valid data is submitted
 * @param {() => void} props.onBack - Callback to return to welcome screen
 */
export default function PatientDetailsForm({ initialData, onSubmit, onBack }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    age: initialData?.age || '',
    gender: initialData?.gender || '',
    language: initialData?.language || '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const genderOptions = [
    { value: 'male', label: 'Male', sublabel: 'पुरुष' },
    { value: 'female', label: 'Female', sublabel: 'महिला' },
    { value: 'other', label: 'Other', sublabel: 'अन्य' },
  ];

  const languageOptions = [
    { value: 'english', label: 'English', sublabel: 'English' },
    { value: 'hindi', label: 'Hindi', sublabel: 'हिंदी' },
    { value: 'marathi', label: 'Marathi', sublabel: 'मराठी' },
  ];

  const validate = (data) => {
    const newErrors = {};

    // Name validation
    if (!data.name || !data.name.trim()) {
      newErrors.name = 'Please enter patient name';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Age validation
    const parsedAge = parseInt(data.age, 10);
    if (!data.age && data.age !== 0) {
      newErrors.age = 'Please enter age';
    } else if (isNaN(parsedAge) || !Number.isInteger(Number(data.age)) || parsedAge < 1 || parsedAge > 125) {
      newErrors.age = 'Age must be a valid number between 1 and 125';
    }

    // Gender validation
    if (!data.gender) {
      newErrors.gender = 'Please select a gender';
    }

    // Language validation
    if (!data.language) {
      newErrors.language = 'Please select your preferred language';
    }

    return newErrors;
  };

  const handleInputChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (errors[field]) {
      const newErrors = validate(updated);
      setErrors((prev) => {
        const next = { ...prev };
        if (!newErrors[field]) {
          delete next[field];
        }
        return next;
      });
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentErrors = validate(formData);
    if (currentErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: currentErrors[field] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    setTouched({
      name: true,
      age: true,
      gender: true,
      language: true,
    });

    if (Object.keys(validationErrors).length === 0) {
      onSubmit({
        ...formData,
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
      });
    }
  };

  return (
    <div className="screen-card">
      <div className="form-screen-header">
        <h2 className="screen-heading">Step 1: Patient Information</h2>
        <p className="screen-subheading">
          Please provide basic details so your doctor can identify and review your file.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="patient-name" className="form-label">
            Full Name <span className="required-star">*</span>
          </label>
          <input
            id="patient-name"
            type="text"
            className={`form-input ${errors.name ? 'has-error' : ''}`}
            placeholder="e.g. Ramesh Sharma"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <div id="name-error" className="form-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{errors.name}</span>
            </div>
          )}
        </div>

        {/* Age */}
        <div className="form-group">
          <label htmlFor="patient-age" className="form-label">
            Age (years) <span className="required-star">*</span>
          </label>
          <input
            id="patient-age"
            type="number"
            min="1"
            max="125"
            className={`form-input ${errors.age ? 'has-error' : ''}`}
            placeholder="e.g. 34"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            onBlur={() => handleBlur('age')}
            aria-invalid={Boolean(errors.age)}
            aria-describedby={errors.age ? 'age-error' : undefined}
          />
          {errors.age && (
            <div id="age-error" className="form-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{errors.age}</span>
            </div>
          )}
        </div>

        {/* Gender */}
        <div className="form-group">
          <label className="form-label">
            Gender <span className="required-star">*</span>
          </label>
          <div className="options-grid" role="radiogroup" aria-label="Gender selection">
            {genderOptions.map((item) => {
              const isSelected = formData.gender === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  id={`gender-${item.value}`}
                  className={`option-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleInputChange('gender', item.value)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="option-pill-label">{item.label}</span>
                  <span className="option-pill-sublabel">{item.sublabel}</span>
                </button>
              );
            })}
          </div>
          {errors.gender && (
            <div className="form-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{errors.gender}</span>
            </div>
          )}
        </div>

        {/* Preferred Language */}
        <div className="form-group">
          <label className="form-label">
            Preferred Language <span className="required-star">*</span>
          </label>
          <div className="options-grid" role="radiogroup" aria-label="Language selection">
            {languageOptions.map((lang) => {
              const isSelected = formData.language === lang.value;
              return (
                <button
                  key={lang.value}
                  type="button"
                  id={`lang-${lang.value}`}
                  className={`option-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleInputChange('language', lang.value)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="option-pill-label">{lang.label}</span>
                  <span className="option-pill-sublabel">{lang.sublabel}</span>
                </button>
              );
            })}
          </div>
          {errors.language && (
            <div className="form-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{errors.language}</span>
            </div>
          )}
        </div>

        {/* Navigation Actions */}
        <div className="action-buttons">
          <button
            type="button"
            id="btn-back-to-welcome"
            className="btn btn-secondary"
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="submit"
            id="btn-submit-patient-details"
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <span>Start Health History</span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
