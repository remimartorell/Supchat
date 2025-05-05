import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import InitScreen from '../screens/InitScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import WorkspaceSettingsScreen from '../screens/WorkspaceSettingsScreen';
import DrawerLayout from './DrawerLayout';

export type RootStackParamList = {
  Init: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  SearchResults: { query: string };
  WorkspaceSettings: { workspaceId: string };
  Main: undefined; // c’est là que se lance le DrawerLayout
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => (
    <NavigationContainer>
      <Stack.Navigator
          initialRouteName="Init"
          screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Init" component={InitScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="WorkspaceSettings" component={WorkspaceSettingsScreen} />
        <Stack.Screen name="Main" component={DrawerLayout} />
      </Stack.Navigator>
    </NavigationContainer>
);

export default AppNavigator;
