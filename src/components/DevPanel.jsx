import React, { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '../services/apiClient.js';
import './DevPanel.css';

/**
 * DevPanel — Developer-only AI provider switch.
 *
 * Position: Top right corner, just below navigation.
 * Unlock Password: dev
 *
 * Safe provider switcher: communicates provider name to backend,
 * validated with developer secret.
 */

const DEV_AUTH_SESSION_KEY = 'precare_dev_unlocked';

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(DEV_AUTH_SESSION_KEY) === 'true';
  });
  const [authError, setAuthError] = useState('');

  // Provider state
  const [providerInfo, setProviderInfo] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [switching, setSwitching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch provider info from backend with secret 'dev'
  const fetchProvider = useCallback(async () => {
    const res = await safeFetch('/api/dev/ai/provider', {
      headers: { 'X-Dev-Secret': 'dev' },
    });
    if (res.ok) {
      setProviderInfo(res);
      setSelectedProvider(res.active || 'openrouter');
    }
    return res;
  }, []);

  // Keyboard shortcut: F2 or Alt+Shift+D or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }
      const isF2 = e.key === 'F2';
      const isAltShiftD = e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.code === 'KeyD');
      if (isF2 || isAltShiftD) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // When panel is opened and already authenticated, refresh provider info
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchProvider();
    }
  }, [isOpen, isAuthenticated, fetchProvider]);

  // Authenticate with password 'dev'
  const handleUnlock = async (e) => {
    e.preventDefault();
    setAuthError('');
    const trimmed = passwordInput.trim();
    if (trimmed !== 'dev') {
      setAuthError('Incorrect password. Password is: dev');
      return;
    }

    // Password is 'dev' -> Unlock!
    setIsAuthenticated(true);
    sessionStorage.setItem(DEV_AUTH_SESSION_KEY, 'true');
    setPasswordInput('');
    await fetchProvider();
  };

  // Switch provider
  const handleSwitch = async () => {
    setSwitching(true);
    setStatusMsg('');
    const res = await safeFetch('/api/dev/ai/provider', {
      method: 'POST',
      headers: { 'X-Dev-Secret': 'dev' },
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
      headers: { 'X-Dev-Secret': 'dev' },
    });
    setSwitching(false);
    if (res.ok) {
      setProviderInfo(res);
      setSelectedProvider(res.active || res.default || 'openrouter');
      setStatusMsg('Reset to default.');
    } else {
      setStatusMsg(res.error || 'Reset failed.');
    }
  };

  // Lock Dev Mode
  const handleLock = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(DEV_AUTH_SESSION_KEY);
    setStatusMsg('');
    setPasswordInput('');
  };

  // Close panel
  const handleClose = () => {
    setIsOpen(false);
    setStatusMsg('');
    setAuthError('');
  };

  const activeLabel = providerInfo?.active === 'local' ? 'Local Ollama' : 'Online API (OpenRouter)';

  return (
    <>
      {/* Dev Mode Button — Top-Right Corner Below Navigation */}
      <button
        type="button"
        id="dev-mode-toggle-btn"
        className="dev-mode-btn-top"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Developer Mode (Password: dev)"
        aria-label="Developer Mode"
      >
        <span className="dev-mode-icon">🛠️</span>
        <span className="dev-mode-text">Dev Mode</span>
        {isAuthenticated && <span className="dev-mode-unlocked-dot" title="Dev Mode Unlocked" />}
      </button>

      {/* Dev Panel Modal Overlay */}
      {isOpen && (
        <div className="dev-panel-overlay" onClick={handleClose}>
          <div className="dev-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dev-panel-header">
              <span className="dev-panel-title">
                🛠️ Developer Mode
                {isAuthenticated && <span className="dev-badge dev-badge-ok">Unlocked</span>}
              </span>
              <button type="button" className="dev-panel-close" onClick={handleClose}>×</button>
            </div>

            {!isAuthenticated ? (
              <form className="dev-auth-form" onSubmit={handleUnlock}>
                <div className="dev-warning-box">
                  🔒 Enter password to unlock Developer Mode.
                </div>
                <label className="dev-label" htmlFor="dev-password-input">Password</label>
                <input
                  id="dev-password-input"
                  type="password"
                  className="dev-input"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter dev password (dev)"
                  autoComplete="off"
                  autoFocus
                />
                {authError && <div className="dev-error">{authError}</div>}
                <button type="submit" className="dev-btn dev-btn-primary">Unlock</button>
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
                      <span>Online API (OpenRouter)</span>
                      {providerInfo?.openrouter?.configured && (
                        <span className="dev-badge dev-badge-ok">ready</span>
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
                  <button
                    type="button"
                    className="dev-btn dev-btn-lock"
                    onClick={handleLock}
                    title="Lock Dev Mode"
                  >
                    Lock
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
