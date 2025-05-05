import React, { createContext, useContext, useState } from 'react';

interface ChatContextType {
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedUserId, setSelectedUserId] = useState('');

  return (
    <ChatContext.Provider value={{ selectedUserId, setSelectedUserId }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
