import React from 'react';
import './ProgressIndicator.css';

/**
 * ProgressIndicator component
 * Step 1: Basic Information
 * Step 2: Health Problem
 * Step 3: AI Consultation
 *
 * @param {Object} props
 * @param {number} props.currentStep - Current active step (1, 2, or 3)
 */
export default function ProgressIndicator({ currentStep }) {
  const steps = [
    { number: 1, title: 'Basic Info', longLabel: 'Basic Information' },
    { number: 2, title: 'Health Problem', longLabel: 'Health Problem' },
    { number: 3, title: 'AI Follow-up', longLabel: 'AI Consultation' },
  ];

  // Calculate percentage fill based on 3 steps
  let fillPercent = '20%';
  if (currentStep === 1) fillPercent = '20%';
  if (currentStep === 2) fillPercent = '50%';
  if (currentStep >= 3) fillPercent = '100%';

  return (
    <nav className="progress-container" aria-label="Intake progress">
      <div className="progress-track" />
      <div className="progress-fill" style={{ width: fillPercent }} />
      <div className="progress-steps">
        {steps.map((step) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          let stepClass = 'step-item';
          if (isCompleted) stepClass += ' step-completed';
          if (isCurrent) stepClass += ' step-current';

          return (
            <div key={step.number} className={stepClass}>
              <div
                className="step-circle"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg
                    className="step-check-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <div className="step-label-group">
                <span className="step-tag">Step {step.number}</span>
                <span className="step-name">{step.title}</span>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
