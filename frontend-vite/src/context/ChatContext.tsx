import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Message } from '../components/ChatContainer/ChatContainer';

interface ChatContextType {
  messages: Message[];
  selectedFilters: string[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, newContent: string) => void;
  setSelectedFilters: (filters: string[]) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateMessage = (id: string, newContent: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === id ? { ...msg, content: newContent } : msg
      )
    );
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value: ChatContextType = {
    messages,
    selectedFilters,
    addMessage,
    updateMessage,
    setSelectedFilters,
    clearMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
