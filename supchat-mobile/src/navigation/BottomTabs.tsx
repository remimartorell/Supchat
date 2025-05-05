// src/navigation/BottomTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ChatScreen from '../screens/ChatScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import AboutScreen from '../screens/AboutScreen';

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profil" component={ProfileSettingsScreen} />
      <Tab.Screen name="À propos" component={AboutScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabs;
