import React, { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '../services/apiClient.js';
import './DevPanel.css';

/**
 * DevPanel — Hidden developer-only AI provider switch.
 *
 * Activation: Click the tiny "⚙" icon 5 times rapidly in the bottom-right corner.
 * Protection: Requires DEV_SECRET (entered once per session, stored only in sessionStorage).
 * Security: Never exposes API keys, database URLs, or passwords.
 *
 * The panel sends only a safe provider name ('openrouter' or 'ollama') to the backend.
 * The backend validates the developer secret and switches the runtime AI provider.
 */

const DEV_TAP_COUNT = 5;
const DEV_TAP_WINDOW_MS = 3000;
const DEV_SECRET_SESSION_KEY = 'precare_dev_secret';

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);

  // Auth: prefill default dev secret in development mode for convenience
  const [devSecret, setDevSecret] = useState(() => {
    return (
      sessionStorage.getItem(DEV_SECRET_SESSION_KEY) ||
      (import.meta.env.DEV ? 'precare-dev-secret-key' : '')
    );
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Provider state
  const [providerInfo, setProviderInfo] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [switching, setSwitching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch provider info from backend
  const fetchProvider = useCallback(async (secret) => {
    const res = await safeFetch('/api/dev/ai/provider', {
      headers: { 'X-Dev-Secret': secret },
    });
    if (res.ok) {
      setProviderInfo(res);
      setSelectedProvider(res.active || 'openrouter');
      setIsAuthenticated(true);
    }
    return res;
  }, []);

  // Keyboard shortcuts: F2, Alt + Shift + D, or Ctrl + Shift + X
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      const isF2 = e.key === 'F2';
      const isAltShiftD = e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.code === 'KeyD');
      const isCtrlShiftX = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x' || e.code === 'KeyX');

      if (isF2 || isAltShiftD || isCtrlShiftX) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Restore session / auto-authenticate when opened
  useEffect(() => {
    if (isOpen && !isAuthenticated && devSecret) {
      fetchProvider(devSecret);
    }
  }, [isOpen, isAuthenticated, devSecret, fetchProvider]);

  // Authenticate with dev secret
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const trimmed = devSecret.trim();
    if (!trimmed) {
      setAuthError('Enter a developer secret.');
      return;
    }
    const res = await fetchProvider(trimmed);
    if (res.ok) {
      setIsAuthenticated(true);
      sessionStorage.setItem(DEV_SECRET_SESSION_KEY, trimmed);
    } else {
      setAuthError(res.error || 'Invalid developer secret.');
    }
  };

  // Fetch provider on authenticated panel open
  useEffect(() => {
    if (isOpen && isAuthenticated && devSecret) {
      fetchProvider(devSecret);
    }
  }, [isOpen, isAuthenticated, devSecret, fetchProvider]);

  // Switch provider
  const handleSwitch = async () => {
    setSwitching(true);
    setStatusMsg('');
    const res = await safeFetch('/api/dev/ai/provider', {
      method: 'POST',
      headers: { 'X-Dev-Secret': devSecret },
      body: JSON.stringify({ provider: selectedProvider }),
    });
    setSwitching(false);
    if (res.ok) {
      setProviderInfo(res);
      setStatusMsg(`Switched to ${res.active === 'local' ? 'Local Ollama' : 'Online API'}`);
    } else {
      setStatusMsg(res.error || 'Switch failed.');
    }
  };

  // Reset to default
  const handleReset = async () => {
    setSwitching(true);
    setStatusMsg('');
    const res = await safeFetch('/api/dev/ai/provider/reset', {
      method: 'POST',
      headers: { 'X-Dev-Secret': devSecret },
    });
    setSwitching(false);
    if (res.ok) {
      setProviderInfo(res);
      setSelectedProvider(res.active || res.default || 'openrouter');
      setStatusMsg('Reset to environment default.');
    } else {
      setStatusMsg(res.error || 'Reset failed.');
    }
  };

  // Close panel
  const handleClose = () => {
    setIsOpen(false);
    setStatusMsg('');
  };

  const activeLabel = providerInfo?.active === 'local' ? 'Local Ollama' : 'Online API (OpenRouter)';

  return (
    <>
      {/* Floating Developer Access Button — 1 click to open */}
      <button
        type="button"
        className="dev-floating-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Developer Mode (Click to open, or press F2 / Alt+Shift+D)"
        aria-label="Developer Mode"
      >
        <span className="dev-floating-icon">⚙️</span>
        <span className="dev-floating-text">AI Dev</span>
      </button>

      {/* Dev Panel Overlay */}
      {isOpen && (
        <div className="dev-panel-overlay" onClick={handleClose}>
          <div className="dev-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dev-panel-header">
              <span className="dev-panel-title">Developer Mode</span>
              <button type="button" className="dev-panel-close" onClick={handleClose}>×</button>
            </div>

            {!isAuthenticated ? (
              <form className="dev-auth-form" onSubmit={handleAuth}>
                <label className="dev-label">Dev Secret</label>
                <input
                  type="password"
                  className="dev-input"
                  value={devSecret}
                  onChange={(e) => setDevSecret(e.target.value)}
                  placeholder="Enter developer secret..."
                  autoComplete="off"
                />
                {authError && <div className="dev-error">{authError}</div>}
                <button type="submit" className="dev-btn dev-btn-primary">Authenticate</button>
              </form>
            ) : (
              <div className="dev-content">
                <div className="dev-section">
                  <label className="dev-label">AI Provider</label>
                  <div className="dev-radio-group">
                    <label className="dev-radio">
                      <input
                        type="radio"
                        name="dev-provider"
                        value="openrouter"
                        checked={selectedProvider === 'openrouter'}
                        onChange={() => setSelectedProvider('openrouter')}
                      />
                      <span>Online API</span>
                      {providerInfo?.openrouter?.configured && (
                        <span className="dev-badge dev-badge-ok">configured</span>
                      )}
                    </label>
                    <label className="dev-radio">
                      <input
                        type="radio"
                        name="dev-provider"
                        value="local"
                        checked={selectedProvider === 'local'}
                        onChange={() => setSelectedProvider('local')}
                      />
                      <span>Local Ollama</span>
                    </label>
                  </div>
                </div>

                <div className="dev-current">
                  <span className="dev-current-label">Current:</span>
                  <span className={`dev-current-value ${providerInfo?.active === 'local' ? 'dev-local' : 'dev-online'}`}>
                    {activeLabel}
                  </span>
                  {providerInfo?.isOverridden && (
                    <span className="dev-badge dev-badge-warn">overridden</span>
                  )}
                </div>

                {providerInfo?.active === 'openrouter' && providerInfo?.openrouter?.model && (
                  <div className="dev-detail">Model: {providerInfo.openrouter.model}</div>
                )}
                {providerInfo?.active === 'local' && providerInfo?.ollama?.model && (
                  <div className="dev-detail">Model: {providerInfo.ollama.model}</div>
                )}

                {statusMsg && <div className="dev-status">{statusMsg}</div>}

                <div className="dev-actions">
                  <button
                    type="button"
                    className="dev-btn dev-btn-primary"
                    onClick={handleSwitch}
                    disabled={switching}
                  >
                    {switching ? 'Switching...' : 'Apply'}
                  </button>
                  {providerInfo?.isOverridden && (
                    <button
                      type="button"
                      className="dev-btn dev-btn-secondary"
                      onClick={handleReset}
                      disabled={switching}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
