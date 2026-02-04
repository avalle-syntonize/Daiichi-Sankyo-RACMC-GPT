import React, { useState, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import './ChatInput.css';

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
  hasFiltersSelected?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  hasFiltersSelected = false,
}) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((message.trim() || selectedFiles.length > 0) && hasFiltersSelected) {
      onSendMessage(message, selectedFiles);
      setMessage('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && hasFiltersSelected) {
      e.preventDefault();
      handleSend();
    }
  };

  // Button is disabled if: disabled prop, no filters selected, or no content
  const isSendDisabled =
    disabled || !hasFiltersSelected || (!message.trim() && selectedFiles.length === 0);

  // Dynamic placeholder based on filter selection
  const placeholder = hasFiltersSelected
    ? 'Ask a question about your regulatory documentation...'
    : 'Select at least one project filter to start asking questions...';

  return (
    <div className="input-area">
      {selectedFiles.length > 0 && (
        <div className="file-preview-area">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-badge">
              📄 {file.name}
              <button onClick={() => handleRemoveFile(index)}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="input-wrapper">
        <input
          type="text"
          className="input-field"
          placeholder={placeholder}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        <div className="input-actions">
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload document"
            disabled={disabled}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </button>
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={isSendDisabled}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        id="fileInput"
        accept="image/*,.pdf,.doc,.docx,.xlsx,.txt,.pptx,.xls,.csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ChatInput;
