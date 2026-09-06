import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import CollectedInformation from './CollectedInformation';
import aiService from '../services/aiService';
import './ChatInterface.css';

/**
 * ChatInterface component
 * AI-Assisted Conversation Engine powered by local Ollama + qwen3:8b.
 *
 * @param {Object} props
 * @param {Object} props.patientInfo - { name, age, gender, language }
 * @param {string} props.initialComplaint - Main complaint entered on Step 2
 * @param {Object} [props.savedHistory] - Existing structured history if returning
 * @param {Array} [props.savedMessages] - Existing messages if returning
 * @param {(result: { history: Object, conversation: Array }) => void} props.onComplete - Proceed to review
 * @param {() => void} props.onBack - Return to complaint screen
 */
export default function ChatInterface({
  patientInfo,
  initialComplaint,
  savedHistory,
  savedMessages,
  onComplete,
  onBack,
}) {
  const [messages, setMessages] = useState(savedMessages || []);
  const [history, setHistory] = useState(savedHistory || null);
  const [currentTargetField, setCurrentTargetField] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [ollamaError, setOllamaError] = useState(null);
  const [modelName, setModelName] = useState('qwen3:8b');

  const messagesEndRef = useRef(null);
  const initializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Initial session startup
  const initSession = async () => {
    setIsThinking(true);
    setOllamaError(null);

    // 1. Verify Ollama & qwen3:8b availability
    const status = await aiService.checkStatus();
    if (!status.ok) {
      setIsThinking(false);
      setOllamaError(
        status.error ||
          'Local AI is unavailable. Please make sure Ollama is running.'
      );
      return;
    }

    if (status.model) {
      setModelName(status.model);
    }

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 2. Initial patient complaint message in conversation
    const initialPatientMsg = {
      id: 'msg-0',
      role: 'patient',
      content: initialComplaint,
      timestamp: nowTime,
    };

    try {
      // 3. Parse initial complaint using Ollama qwen3:8b
      const initialHistory = await aiService.analyzeInitialComplaint(
        initialComplaint
      );
      setHistory(initialHistory);

      // 4. Determine first follow-up question
      const nextStep = await aiService.getNextQuestion(initialHistory, 0);

      // 5. Formulate opening AI greeting and first question
      let openingContent = '';
      if (initialHistory.duration) {
        openingContent = `I understand you have been experiencing ${initialHistory.chief_complaint} (${initialHistory.duration}). Let's collect a few key details for your doctor.\n\n${nextStep.question}`;
      } else {
        openingContent = `Thank you, ${
          patientInfo.name || 'there'
        }. I have noted: "${initialComplaint}".\n\n${nextStep.question}`;
      }

      const initialAssistantMsg = {
        id: 'msg-1',
        role: 'assistant',
        content: openingContent,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages([initialPatientMsg, initialAssistantMsg]);
      setCurrentTargetField(nextStep.targetField);
    } catch (err) {
      setOllamaError(
        err.message ||
          'Local AI is unavailable. Please make sure Ollama is running.'
      );
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (initializedRef.current || (savedMessages && savedMessages.length > 0)) {
      return;
    }
    initializedRef.current = true;
    initSession();
  }, [initialComplaint, patientInfo, savedMessages]);

  // Handle patient answer submission
  const handleSendMessage = async (text) => {
    if (!text.trim() || isThinking || isComplete) return;

    const timeString = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const patientMsg = {
      id: `msg-${Date.now()}-patient`,
      role: 'patient',
      content: text,
      timestamp: timeString,
    };

    const updatedMessages = [...messages, patientMsg];
    setMessages(updatedMessages);
    setIsThinking(true);
    setOllamaError(null);

    try {
      // 1. Process answer using Ollama qwen3:8b
      const { updatedHistory, acknowledgement } = await aiService.processAnswer(
        text,
        currentTargetField,
        history
      );
      setHistory(updatedHistory);

      const nextCount = questionCount + 1;
      setQuestionCount(nextCount);

      // 2. Select next adaptive question
      const nextStep = await aiService.getNextQuestion(
        updatedHistory,
        nextCount
      );

      if (nextStep.isComplete) {
        setIsComplete(true);
        setCurrentTargetField(null);

        const completionMsg = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `${acknowledgement}\n\nYour health history is now complete. Please click 'Review History' below to verify your information before the doctor's consultation.`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages([...updatedMessages, completionMsg]);
      } else {
        setCurrentTargetField(nextStep.targetField);

        const assistantMsg = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `${acknowledgement} ${nextStep.question}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages([...updatedMessages, assistantMsg]);
      }
    } catch (err) {
      console.error('Error in Ollama conversation step:', err);
      setOllamaError(
        err.message ||
          'Local AI is unavailable. Please make sure Ollama is running.'
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleReviewClick = () => {
    onComplete({
      history,
      conversation: messages,
    });
  };

  return (
    <div className="screen-card chat-screen-card">
      {/* Consultation Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div className="chat-header-title-row">
              <h2 className="chat-header-title">PreCare AI Assistant</h2>
              <span className="ollama-model-badge" title="Running locally via Ollama">
                Ollama: {modelName}
              </span>
            </div>
            <p className="chat-header-sub">
              Patient: <strong>{patientInfo?.name || 'Patient'}</strong> ({patientInfo?.age} yrs, {patientInfo?.gender})
            </p>
          </div>
        </div>

        <button
          type="button"
          className="chat-back-btn"
          onClick={onBack}
          title="Back to health problem"
        >
          Back
        </button>
      </div>

      {/* Ollama Error Banner */}
      {ollamaError && (
        <div className="ollama-error-card" role="alert">
          <div className="ollama-error-content">
            <span className="ollama-error-icon">⚠️</span>
            <div className="ollama-error-text">
              <strong>Local AI Error</strong>
              <p>{ollamaError}</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-retry-ollama"
            className="btn-retry-ollama"
            onClick={initSession}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Collapsible Structured Information Inspection Panel */}
      <CollectedInformation history={history} category={history?.category} />

      {/* Chat Messages Log */}
      <div
        className="chat-messages-scroll"
        role="log"
        aria-live="polite"
        aria-label="Health intake conversation"
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isThinking && (
          <div className="chat-thinking-indicator" role="status">
            <div className="thinking-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="thinking-text">Ollama (qwen3:8b) is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Completion Banner or Input Box */}
      {isComplete ? (
        <div className="completion-card">
          <div className="completion-banner">
            <div className="completion-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="completion-text">
              <strong>Your health history is complete.</strong>
              <span>All key pre-consultation information has been recorded for your doctor.</span>
            </div>
          </div>

          <button
            type="button"
            id="btn-review-history"
            className="btn btn-primary btn-block"
            onClick={handleReviewClick}
          >
            <span>Review History</span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="chat-input-container">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isThinking || Boolean(ollamaError)}
            placeholder={
              ollamaError
                ? 'Ollama is unavailable. Please resolve error above.'
                : currentTargetField === 'severity'
                ? 'Rate 1 to 10 (e.g. 6)...'
                : 'Type your answer...'
            }
          />
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="disclaimer-banner" role="note">
        <svg className="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          PreCare assists your doctor with history collection using local Ollama (qwen3:8b). It does not diagnose or prescribe treatment.
        </span>
      </div>
    </div>
  );
}
