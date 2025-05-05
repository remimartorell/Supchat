import React, { createContext, useState, useContext } from 'react';

interface ChannelContextType {
  selectedChannelId: string | null;
  setSelectedChannelId: (id: string | null) => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const useChannel = (): ChannelContextType => {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error('useChannel must be used within a ChannelProvider');
  }
  return context;
};

export const ChannelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <ChannelContext.Provider value={{ selectedChannelId, setSelectedChannelId }}>
      {children}
    </ChannelContext.Provider>
  );
};
