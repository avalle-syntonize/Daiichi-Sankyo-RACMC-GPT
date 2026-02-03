import React from 'react';
import './ChatContainer.css';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatContainerProps {
  messages: Message[];
  userInitials?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, userInitials = 'U' }) => {
  return (
    <div className="chat-area">
      <div className="messages-container">
        {messages.length === 0 ? (
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
          messages.map(message => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar">{message.role === 'user' ? userInitials : 'AI'}</div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                {message.timestamp && (
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
