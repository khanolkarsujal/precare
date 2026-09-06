import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

/**
 * ChatInput component
 * Handles text input with Enter key submission and disabled states during AI thinking.
 *
 * @param {Object} props
 * @param {(text: string) => void} props.onSend - Callback with entered text
 * @param {boolean} props.disabled - True when AI is processing or conversation is complete
 * @param {string} [props.placeholder]
 */
export default function ChatInput({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit} noValidate>
      <input
        ref={inputRef}
        id="chat-input-field"
        type="text"
        className="chat-input"
        placeholder={placeholder || 'Type your answer here...'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        aria-label="Your response"
      />

      <button
        type="submit"
        id="btn-send-message"
        className="chat-send-btn"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
