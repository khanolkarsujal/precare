import React from 'react';
import './ChatMessage.css';

/**
 * ChatMessage component
 * Renders an AI or patient chat bubble.
 *
 * @param {Object} props
 * @param {Object} props.message
 * @param {'assistant'|'patient'} props.message.role
 * @param {string} props.message.content
 * @param {string} [props.message.timestamp]
 */
export default function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`chat-message-row ${isAssistant ? 'msg-assistant' : 'msg-patient'}`}>
      {isAssistant && (
        <div className="msg-avatar assistant-avatar" aria-hidden="true">
          <span>AI</span>
        </div>
      )}

      <div className="msg-bubble-container">
        <div className="msg-sender-label">
          {isAssistant ? 'PreCare Assistant' : 'You'}
        </div>
        <div className={`msg-bubble ${isAssistant ? 'bubble-assistant' : 'bubble-patient'}`}>
          <p className="msg-text">{message.content}</p>
        </div>
        {message.timestamp && (
          <span className="msg-time">{message.timestamp}</span>
        )}
      </div>

      {!isAssistant && (
        <div className="msg-avatar patient-avatar" aria-hidden="true">
          <span>You</span>
        </div>
      )}
    </div>
  );
}
