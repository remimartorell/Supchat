// src/screens/WorkspaceSettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WorkspaceSettingsScreen: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const workspaceId = await AsyncStorage.getItem('workspaceId');
        const token = await AsyncStorage.getItem('token');
        const currentUserId = await AsyncStorage.getItem('userId'); // 👈 enregistré au login

        if (!workspaceId || !token || !currentUserId) return;

        axios.defaults.headers.common['x-auth-token'] = token;
        const res = await axios.get(`/api/workspaces/${workspaceId}`);
        const workspace = res.data;

        const member = workspace.members.find((m: any) => m.user._id === currentUserId);
        setRole(member?.role || 'member');
      } catch (err) {
        console.error('Erreur récupération rôle:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#5865f2" />
      ) : (
        <>
          <Text style={styles.title}>Paramètres du Workspace</Text>
          <Text style={styles.text}>Votre rôle : <Text style={styles.role}>{role}</Text></Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1522' },
  title: { color: '#fff', fontSize: 22, marginBottom: 16 },
  text: { color: '#ccc', fontSize: 18 },
  role: { color: '#fff', fontWeight: 'bold' },
});

export default WorkspaceSettingsScreen;
