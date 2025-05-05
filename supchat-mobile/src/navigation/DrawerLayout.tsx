// src/navigation/DrawerLayout.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import SidebarDrawer from '../components/SidebarDrawer';
import ChatScreen from '../screens/ChatScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import CreateWorkspaceScreen from '../screens/CreateWorkspaceScreen';
import CreateChannelScreen from '../screens/CreateChannelScreen';
import ManageChannelMembersScreen from '../screens/ManageChannelMembersScreen';
import EditChannelScreen from '../screens/EditChannelScreen';

const Drawer = createDrawerNavigator();

const DrawerLayout: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={() => <SidebarDrawer />} // ✅ Ici c’est correct
      screenOptions={{ headerShown: false }}
    >
      {/* Les écrans DOIVENT être dans des <Drawer.Screen /> */}
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="DirectMessage" component={DirectMessageScreen} />
      <Drawer.Screen name="CreateWorkspace" component={CreateWorkspaceScreen} />
      <Drawer.Screen name="CreateChannel" component={CreateChannelScreen} />
      <Drawer.Screen name="ManageChannelMembers" component={ManageChannelMembersScreen} />
      <Drawer.Screen name="EditChannel" component={EditChannelScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerLayout;
