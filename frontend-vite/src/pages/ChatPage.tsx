import React, { useEffect, useState } from 'react';
import { useChatContext } from '../context/ChatContext';
import { useAuth } from '../auth';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatContainer from '../components/ChatContainer/ChatContainer';
import ChatInput from '../components/ChatInput/ChatInput';
import Modal from '../components/Modal/Modal';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const { messages, selectedFilters, addMessage, setSelectedFilters } = useChatContext();
  // const { user, logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSendMessage = (text: string) => {
    // Add user message
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    });

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. Backend integration is not yet implemented.',
        timestamp: new Date(),
      });
    }, 1000);
  };

  const handleExport = () => {
    setIsModalOpen(true);
  };

  const getUserInfo = async () => {
    const response = await fetch('/.auth/me');
    const { clientPrincipal } = await response.json();
    setUser(clientPrincipal);
  };

  const handleConfirmExport = () => {
    // Create a simple text export of the conversation
    const conversationText = messages
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsModalOpen(false);
  };

  const handleLogout = () => {
    // e.preventDefault();
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/chat';
  };

  function getInitialsFromEmail(email: string) {

    if (!email) return '??';
    
    const namePart = email.split('@')[0]; // "mgarciap"

    return namePart.slice(0, 2).toUpperCase();
  }

  useEffect(() => {
    getUserInfo();
  }, []);

  return (
    <div className="chat-page">
      <Header
        userName={user?.userDetails || 'User'}
        userInitials={getInitialsFromEmail(user?.userDetails) || '??'}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        <Sidebar
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
          onExport={handleExport}
        />

        <div className="main-content">
          <div className="container">
            <div className="info-box">
              <p>
                <strong>ℹ️ Important: </strong>
                This system is designed for Regulatory Affairs - Chemistry, Manufacturing and
                Controls (RA CMC) use only. All responses are based on internal documentation and
                should be verified before regulatory submission.
              </p>
            </div>

            <ChatContainer messages={messages} userInitials={getInitialsFromEmail(user?.userDetails) || '??'} />
            <ChatInput
              onSendMessage={handleSendMessage}
              hasFiltersSelected={selectedFilters.length > 0}
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmExport}
        title="Export Conversation History"
        subtitle="Download as Plain Text"
      >
        <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
          Your conversation will be downloaded as a Plain Text file (.txt), suitable for
          documentation and archiving. This file includes your conversation with all citations.
        </p>
        <div className="privacy-notice">
          <strong>🔒 Privacy Notice:</strong> Conversation histories are not stored on our servers.
          This export is a one-time download of your current session only. Once you close this
          session, the conversation will not be retrievable.
        </div>
      </Modal>
    </div>
  );
};

export default ChatPage;
