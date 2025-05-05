// src/screens/InitScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { setupAxiosToken } from '../services/setupAxiosToken';

const InitScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');

      if (token) {
        await setupAxiosToken(); // ✅ applique le token globalement

        // (facultatif) Si workspaceId absent, tu peux en mettre un par défaut
        const existingWsId = await AsyncStorage.getItem('workspaceId');
        if (!existingWsId) {
          await AsyncStorage.setItem('workspaceId', '67ea71feb8cb2cb2440c7dd8');
        }

        navigation.replace('Main');
      } else {
        // Pas de token → retour login
        navigation.replace('Login');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5865f2" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1522' },
});

export default InitScreen;
