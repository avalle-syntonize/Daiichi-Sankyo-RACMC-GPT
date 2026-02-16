import React, { useEffect, useState, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import { useAuth } from '../auth';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatContainer from '../components/ChatContainer/ChatContainer';
import ChatInput from '../components/ChatInput/ChatInput';
import Modal from '../components/Modal/Modal';
import { conversationApi } from '../services/conversationService';
import type { ChatMessage, ConversationRequest, ChatResponse, Conversation, ToolMessageContent, Citation } from '../models';
import './ChatPage.css';

// Generate unique ID
const generateId = (): string => {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const enum MessageStatus {
  NotRunning = 'Not Running',
  Processing = 'Processing',
  Done = 'Done'
}

const ChatPage: React.FC = () => {
  const { messages, selectedFilters, addMessage, updateMessage, setSelectedFilters, clearMessages } = useChatContext();
  // const { user, logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
  const [processMessages, setProcessMessages] = useState<MessageStatus>(MessageStatus.NotRunning);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const abortFuncs = useRef<AbortController[]>([]);

  const ASSISTANT = 'assistant';
  const TOOL = 'tool';
  const ERROR = 'error';

  /**
   * Convert file to base64
   */
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  /**
   * Convert ArrayBuffer to base64
   */
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  /**
   * Stop generating response
   */
  const stopGenerating = () => {
    abortFuncs.current.forEach(a => a.abort());
    setShowLoadingMessage(false);
    setIsLoading(false);
  };

  /**
   * Parse error message and extract meaningful information
   */
  const parseErrorMessage = (errorMessage: string): string => {
    let errorCodeMessage = errorMessage.substring(0, errorMessage.indexOf('-') + 1);
    const innerErrorCue = "{\\'error\\': {\\'message\\': ";

    if (errorMessage.includes(innerErrorCue)) {
      try {
        let innerErrorString = errorMessage.substring(errorMessage.indexOf(innerErrorCue));
        if (innerErrorString.endsWith("'}}")) {
          innerErrorString = innerErrorString.substring(0, innerErrorString.length - 3);
        }
        innerErrorString = innerErrorString.replaceAll("\\'", "'");
        errorMessage = errorCodeMessage + ' ' + innerErrorString;
      } catch (e) {
        console.error('Error parsing inner error message: ', e);
      }
    }

    return tryGetRaiPrettyError(errorMessage);
  };

  /**
   * Try to get a pretty error message for RAI (Responsible AI) content filtering
   */
  const tryGetRaiPrettyError = (errorMessage: string): string => {
    try {
      const match = errorMessage.match(/'innererror': ({.*})\}\}/);
      if (match) {
        const fixedJson = match[1]
          .replace(/'/g, '"')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');
        const innerErrorJson = JSON.parse(fixedJson);
        let reason = '';

        const jailbreak = innerErrorJson.content_filter_result?.jailbreak;
        if (jailbreak?.filtered === true) {
          reason = 'Jailbreak';
        }

        if (reason !== '') {
          return (
            'The prompt was filtered due to triggering Azure OpenAI\'s content filtering system.\n' +
            'Reason: This prompt contains content flagged as ' +
            reason +
            '\n\n' +
            'Please modify your prompt and retry. Learn more: https://go.microsoft.com/fwlink/?linkid=2198766'
          );
        }
      }
    } catch (e) {
      console.error('Failed to parse the error:', e);
    }
    return errorMessage;
  };

  /**
   * Main function to get AI completions
   * Based on makeApiRequestWithoutCosmosDB from the old implementation
   */
  const getCompletions = async (
    question: string,
    conversationId?: string,
    imageFile?: File | null,
    docFile?: File | null
  ) => {
    setIsLoading(true);
    setShowLoadingMessage(true);
    const abortController = new AbortController();
    abortFuncs.current.unshift(abortController);

    // Create user message with file attachment if present
    let userMessage: ChatMessage;

    if (imageFile) {
      // Handle image attachment
      const base64Image = await toBase64(imageFile);
      userMessage = {
        id: generateId(),
        role: 'user',
        content: question,
        image_content: base64Image,
        date: new Date().toISOString()
      };
    } else if (docFile) {
      // Handle file attachment (PDF, DOCX, etc.)
      const arrayBuffer = await docFile.arrayBuffer();
      const base64String = arrayBufferToBase64(arrayBuffer);
      userMessage = {
        id: generateId(),
        role: 'user',
        content: question + ' _(retrieved using ' + docFile.name + ')_',
        attachment_type: docFile.type,
        file_content: base64String,
        attachment_name: docFile.name,
        date: new Date().toISOString()
      };
    } else {
      // No attachment
      userMessage = {
        id: generateId(),
        role: 'user',
        content: question,
        date: new Date().toISOString()
      };
    }

    // Create or update conversation
    let conversation: Conversation;
    if (!conversationId) {
      conversation = {
        id: generateId(),
        title: question,
        messages: [userMessage],
        date: new Date().toISOString()
      };
    } else {
      if (!currentConversation) {
        console.error('Conversation not found.');
        setIsLoading(false);
        setShowLoadingMessage(false);
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
        return;
      }
      conversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, userMessage]
      };
    }

    setCurrentConversation(conversation);

    // Add user message to UI
    addMessage({
      id: userMessage.id,
      role: 'user',
      content: userMessage.content,
      timestamp: new Date(),
    });

    // Prepare request
    const request: ConversationRequest = {
      messages: [...conversation.messages.filter(msg => msg.role !== ERROR)],
      ...(selectedFilters.length > 0 && { filters: selectedFilters }),
    };

    let result = {} as ChatResponse;
    let assistantContent = '';
    let assistantMessage: ChatMessage | null = null;
    let toolMessage: ChatMessage | null = null;

    // ID para el mensaje del asistente que vamos a ir actualizando en streaming
    const assistantMessageId = generateId();
    let hasAddedAssistantMessage = false;

    try {
      const response = await conversationApi(request, abortController.signal);

      if (response?.body) {
        const reader = response.body.getReader();
        let runningText = '';

        while (true) {
          setProcessMessages(MessageStatus.Processing);
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder('utf-8').decode(value);
          const lines = text.split('\n');

          lines.forEach(line => {
            try {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]' || trimmed === 'data: {}') return;

              // Extraer JSON quitando el prefijo "data: " de SSE
              const jsonStr = trimmed.startsWith('data: ')
                ? trimmed.slice(6)
                : trimmed;

              if (!jsonStr || jsonStr === '{}') return;

              runningText += jsonStr;
              result = JSON.parse(runningText);

              if (result.choices?.length > 0) {
                result.choices[0].messages.forEach(msg => {
                  msg.id = result.id;
                  msg.date = new Date().toISOString();

                  if (msg.role === ASSISTANT) {
                    assistantContent += msg.content;
                    assistantMessage = {
                      ...msg,
                      id: assistantMessageId,
                      content: assistantContent
                    };

                    if (!hasAddedAssistantMessage) {
                      addMessage({
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: new Date(),
                      });
                      hasAddedAssistantMessage = true;
                      setShowLoadingMessage(false);
                    } else {
                      updateMessage(assistantMessageId, assistantContent);
                    }

                    if (msg.context) {
                      toolMessage = {
                        id: generateId(),
                        role: TOOL,
                        content: msg.context,
                        date: new Date().toISOString()
                      };
                    }
                  }

                  if (msg.role === TOOL) {
                    toolMessage = msg;
                  }
                });
              } else if (result.error) {
                throw Error(result.error);
              }
              runningText = '';
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e);
                throw e;
              } else {
                console.log('Incomplete message. Continuing...');
              }
            }
          });
        }

        if (assistantMessage !== null) {
          const finalAssistantMessage = assistantMessage as ChatMessage;

          // Extract citations from toolMessage
          let citations: Citation[] = [];
          if (toolMessage) {
            try {
              const tm = toolMessage as ChatMessage;
              const toolContent: ToolMessageContent = JSON.parse(tm.content);
              const seen = new Set<string>();
              citations = (toolContent.citations || []).filter(c => {
                const key = c.filepath || c.title || c.content || c.page_label || c.page_index;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            } catch (e) {
              console.warn('Could not parse tool message citations:', e);
            }
          }

          // Update assistant message with citations
          updateMessage(assistantMessageId, assistantContent, citations);

          const updatedMessages = toolMessage
            ? [...conversation.messages, toolMessage, finalAssistantMessage]
            : [...conversation.messages, finalAssistantMessage];

          setCurrentConversation({
            ...conversation,
            messages: updatedMessages
          });
        }
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage =
          'An error occurred. Please try again. If the problem persists, please contact the site administrator.';

        if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (typeof result.error === 'string') {
          errorMessage = result.error;
        }

        errorMessage = parseErrorMessage(errorMessage);

        // Add error message to UI
        addMessage({
          id: generateId(),
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        });
      }
    } finally {
      setIsLoading(false);
      setShowLoadingMessage(false);
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
      setProcessMessages(MessageStatus.Done);
    }
  };

  const handleSendMessage = (text: string, files?: File[]) => {
    let imageFile: File | null = null;
    let docFile: File | null = null;

    // Process files if provided
    if (files && files.length > 0) {
      const file = files[0]; // Take the first file
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];

      if (imageTypes.includes(file.type)) {
        imageFile = file;
      } else {
        docFile = file;
      }
    }

    getCompletions(text, currentConversation?.id, imageFile, docFile);
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
    // Get user initials for the export
    const userInitials = getInitialsFromEmail(user?.userDetails) || 'USER';

    // Create formatted text export of the conversation
    const conversationText = messages
      .map(msg => {
        const sender = msg.role === 'user' ? userInitials : 'RACMC-GPT';
        return `${sender}:\n${msg.content}`;
      })
      .join('\n\n');

    const blob = new Blob([conversationText], { type: 'text/plain;charset=utf-8' });
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

            <ChatContainer messages={messages} userInitials={getInitialsFromEmail(user?.userDetails) || '??'} isLoading={showLoadingMessage} />
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
