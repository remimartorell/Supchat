// src/components/ChatWindow.tsx
import React from 'react';
import { FlatList } from 'react-native';
import { Message } from '../types/Message';
import MessageBubble from './MessageBubble';

interface Props {
  messages: Message[];
  userId: string;
}

const ChatWindow: React.FC<Props> = ({ messages, userId }) => {
  return (
    <FlatList
      data={messages}
      keyExtractor={item => item._id}
      renderItem={({ item }) => (
        <MessageBubble message={item} isMine={item.sender._id === userId} />
      )}
    />
  );
};

export default ChatWindow;
