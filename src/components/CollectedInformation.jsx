import React, { useState } from 'react';
import './CollectedInformation.css';
import { getCategoryConfig } from '../services/questionEngine';

/**
 * CollectedInformation panel
 * Collapsible dev/audit inspection panel showing structured patient data live
 *
 * @param {Object} props
 * @param {Object} props.history - Structured history object
 * @param {string} props.category - Active complaint category
 */
export default function CollectedInformation({ history, category }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!history) return null;

  const flow = getCategoryConfig(category || history.category);

  // Count collected fields
  const fields = flow.fields || [];
  let collectedCount = 0;
  if (history.chief_complaint) collectedCount++;

  fields.forEach((f) => {
    if (
      history[f.id] ||
      (history.associated_symptoms && history.associated_symptoms[f.id])
    ) {
      collectedCount++;
    }
  });

  return (
    <div className="collected-info-panel">
      <button
        type="button"
        className="collected-info-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="toggle-left">
          <span className="toggle-icon">📊</span>
          <span className="toggle-title">Collected Information</span>
          <span className="toggle-count">
            {collectedCount} of {fields.length + 1} fields
          </span>
        </div>

        <div className="toggle-right">
          {history.is_urgent && (
            <span className="urgent-badge" title={history.urgent_reason}>
              Clinician Flag
            </span>
          )}
          <span className="toggle-chevron">{isOpen ? '▲ Hide' : '▼ View'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="collected-info-body">
          <div className="info-grid">
            {/* Chief Complaint */}
            <div className="info-item">
              <span className="info-key">Chief Complaint</span>
              {history.chief_complaint ? (
                <span className="info-val collected">
                  <span className="check-icon">✓</span> {history.chief_complaint}
                </span>
              ) : (
                <span className="info-val empty">— Not collected</span>
              )}
            </div>

            {/* Category */}
            <div className="info-item">
              <span className="info-key">Inquiry Category</span>
              <span className="info-val collected">
                <span className="check-icon">✓</span> {flow.name || 'General'}
              </span>
            </div>

            {/* Category Flow Fields */}
            {fields.map((f) => {
              const val =
                history[f.id] ||
                (history.associated_symptoms &&
                  history.associated_symptoms[f.id]);

              return (
                <div key={f.id} className="info-item">
                  <span className="info-key">{f.label}</span>
                  {val ? (
                    <span className="info-val collected">
                      <span className="check-icon">✓</span> {val}
                    </span>
                  ) : (
                    <span className="info-val empty">— Not collected</span>
                  )}
                </div>
              );
            })}
          </div>

          {history.is_urgent && (
            <div className="urgent-alert-box">
              <strong>⚠️ Urgent Note for Clinician:</strong>
              <p>{history.urgent_reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
