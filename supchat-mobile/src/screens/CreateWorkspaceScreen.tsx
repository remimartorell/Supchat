import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateWorkspaceScreen: React.FC = () => {
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      axios.defaults.headers.common['x-auth-token'] = token;

      await axios.post('/api/workspaces', { name: name.trim() });
      Alert.alert('Succès', 'Workspace créé !');
      setName('');
    } catch (err) {
      console.error('Erreur création workspace:', err);
      Alert.alert('Erreur', 'Impossible de créer le workspace.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un workspace</Text>
      <TextInput
        placeholder="Nom du workspace"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Créer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 20 },
  title: { color: '#fff', fontSize: 20, marginBottom: 20 },
  input: {
    backgroundColor: '#1f1f2f',
    color: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#5865f2',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default CreateWorkspaceScreen;
