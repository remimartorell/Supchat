// src/screens/CreateChannelScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const CreateChannelScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const workspaceId = await AsyncStorage.getItem('workspaceId');
      if (!workspaceId) return;
      await axios.post(`/api/workspaces/${workspaceId}/channels`, {
        name: name.trim(),
        type,
      });
      Alert.alert('Succès', 'Channel créé !');
      setName('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        await AsyncStorage.multiRemove(['token','userId','workspaceId']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        console.error('Erreur création channel :', err);
        Alert.alert('Erreur', 'Impossible de créer le channel.');
      }
    }
  };

  return (
      <View style={styles.container}>
        <Text style={styles.title}>Créer un channel</Text>
        <TextInput
            style={styles.input}
            placeholder="Nom du channel"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
        />
        <View style={styles.typeContainer}>
          <TouchableOpacity
              onPress={() => setType('public')}
              style={[styles.typeBtn, type === 'public' && styles.selected]}
          >
            <Text style={styles.typeText}>Public</Text>
          </TouchableOpacity>
          <TouchableOpacity
              onPress={() => setType('private')}
              style={[styles.typeBtn, type === 'private' && styles.selected]}
          >
            <Text style={styles.typeText}>Privé</Text>
          </TouchableOpacity>
        </View>
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
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  typeBtn: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#5865f2',
    width: '40%',
  },
  selected: {
    backgroundColor: '#5865f2',
  },
  typeText: {
    color: '#fff',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#5865f2',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default CreateChannelScreen;
