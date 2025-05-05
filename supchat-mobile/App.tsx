import * as React from 'react';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import AppNavigator from './src/navigation/AppNavigator';
import { ChannelProvider } from './src/context/ChannelContext';
import { ChatProvider } from './src/context/ChatContext';

export default function App() {
  return (
    <ChannelProvider>
      <ChatProvider>
        <AppNavigator />
      </ChatProvider>
    </ChannelProvider>
  );
}