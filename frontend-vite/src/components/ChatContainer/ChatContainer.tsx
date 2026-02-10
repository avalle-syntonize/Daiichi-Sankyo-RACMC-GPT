import React, { useState, useEffect, useRef } from 'react';
import './ChatContainer.css';
import type { Citation } from '../../models';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  citations?: Citation[];
}

interface ChatContainerProps {
  messages: Message[];
  userInitials?: string;
  isLoading?: boolean;
}

const CopyIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, userInitials = 'U', isLoading = false }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="chat-area">
      <div className="messages-container" ref={containerRef}>
        {messages.length === 0 && !isLoading ? (
          <div className="placeholder-message">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00B4ED"
              strokeWidth="1.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>Welcome to RA CMC-GPT</p>
            <p>Select filters and start asking questions about your regulatory documentation.</p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-avatar">{message.role === 'user' ? userInitials : 'AI'}</div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                    <div className="citations-container">
                      <div className="citations-title">📄 Sources:</div>
                      <ul className="citations-list">
                        {message.citations.map((citation, index) => (
                          <li key={index} className="citation-item">
                            {citation.url ? (
                              <a href={citation.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                                {citation.filepath || citation.title || `Source ${index + 1}`}
                              </a>
                            ) : (
                              <span className="citation-filename">
                                {citation.filepath || citation.title || `Source ${index + 1}`}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="message-footer">
                    {message.timestamp && (
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    {message.role === 'assistant' && (
                      <button
                        className={`copy-button ${copiedId === message.id ? 'copied' : ''}`}
                        onClick={() => handleCopy(message.content, message.id)}
                        title={copiedId === message.id ? 'Copied!' : 'Copy response'}
                      >
                        {copiedId === message.id ? <CheckIcon /> : <CopyIcon />}
                        <span>{copiedId === message.id ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">AI</div>
                <div className="message-content">
                  <div className="message-text generating-placeholder">
                    <span className="generating-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                    Generating answer...
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
