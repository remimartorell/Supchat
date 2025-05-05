// src/screens/EditChannelScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Button } from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrawerParamList } from '../types/navigationTypes';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

type Props = DrawerScreenProps<DrawerParamList, 'EditChannel'>;

const EditChannelScreen = () => {
  const route = useRoute<RouteProp<DrawerParamList, 'EditChannel'>>();
  const { channelId } = route.params;
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const navigation = useNavigation();

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const workspaceId = await AsyncStorage.getItem('workspaceId');
        if (!token || !workspaceId) return;
        axios.defaults.headers.common['x-auth-token'] = token;

        const res = await axios.get(`/api/workspaces/${workspaceId}/channels`);
        const channel = res.data.find((ch: any) => ch._id === channelId);
        if (channel) {
          setName(channel.name);
          setType(channel.type);
        }
      } catch (err) {
        console.error('Erreur chargement channel :', err);
      }
    };

    fetchChannel();
  }, []);

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const workspaceId = await AsyncStorage.getItem('workspaceId');
      if (!token || !workspaceId) return;
      axios.defaults.headers.common['x-auth-token'] = token;

      await axios.put(`/api/workspaces/${workspaceId}/channels/${channelId}`, { name, type });

      Alert.alert('Succès', 'Channel mis à jour');
      navigation.goBack();
    } catch (err) {
      console.error('Erreur modification channel :', err);
      Alert.alert('Erreur', 'Échec de la modification');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer ce channel ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const workspaceId = await AsyncStorage.getItem('workspaceId');
              if (!token || !workspaceId) return;
              axios.defaults.headers.common['x-auth-token'] = token;

              await axios.delete(`/api/workspaces/${workspaceId}/channels/${channelId}`);
              Alert.alert('Channel supprimé');
              navigation.goBack();
            } catch (err) {
              console.error('Erreur suppression channel :', err);
              Alert.alert('Erreur', 'Impossible de supprimer le channel');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nom du channel</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeContainer}>
        <Button
          title="Public"
          onPress={() => setType('public')}
          color={type === 'public' ? '#5865f2' : '#666'}
        />
        <Button
          title="Privé"
          onPress={() => setType('private')}
          color={type === 'private' ? '#5865f2' : '#666'}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Enregistrer" onPress={handleSave} />
        <View style={{ height: 10 }} />
        <Button title="Supprimer" onPress={handleDelete} color="red" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f1522' },
  label: { color: '#fff', marginBottom: 8, fontSize: 16 },
  input: {
    backgroundColor: '#1f1f2f',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default EditChannelScreen;
