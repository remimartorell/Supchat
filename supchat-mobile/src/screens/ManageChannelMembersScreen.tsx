import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { User } from '../types/User';

interface Params {
  channelId: string;
}

const ManageChannelMembersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();
  const { channelId } = route.params as Params;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const workspaceId = await AsyncStorage.getItem('workspaceId');
        const token = await AsyncStorage.getItem('token');
        if (!workspaceId || !token) return;

        axios.defaults.headers.common['x-auth-token'] = token;

        const [allUsersRes, channelRes] = await Promise.all([
          axios.get('/api/auth/allUsers'),
          axios.get(`/api/workspaces/${workspaceId}/channels`),
        ]);

        setUsers(allUsersRes.data);

        const currentChannel = channelRes.data.find((ch: any) => ch._id === channelId);
        if (currentChannel?.members) {
          const memberIds = currentChannel.members.map((m: any) => m._id || m);
          setSelected(memberIds);
        }
      } catch (err) {
        console.error('Erreur récupération users/channels :', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [channelId]);

  const toggleSelection = (userId: string) => {
    setSelected(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    try {
      const workspaceId = await AsyncStorage.getItem('workspaceId');
      const token = await AsyncStorage.getItem('token');
      if (!workspaceId || !token) return;

      axios.defaults.headers.common['x-auth-token'] = token;

      await Promise.all(selected.map(userId =>
        axios.post(`/api/workspaces/${workspaceId}/channels/${channelId}/members`, { memberId: userId })
      ));

      Alert.alert('Succès', 'Membres mis à jour');
      navigation.goBack();
    } catch (err) {
      console.error('Erreur mise à jour membres :', err);
      Alert.alert('Erreur', 'Impossible de mettre à jour les membres');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gérer les membres</Text>
      {loading ? (
        <Text style={styles.text}>Chargement...</Text>
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.name}>{item.name}</Text>
                <Switch
                  value={selected.includes(item._id)}
                  onValueChange={() => toggleSelection(item._id)}
                />
              </View>
            )}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Enregistrer</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1522', padding: 20 },
  title: { color: '#fff', fontSize: 22, marginBottom: 20 },
  text: { color: '#aaa', fontSize: 16 },
  item: {
    backgroundColor: '#1f1f2f',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#5865f2',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  saveText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ManageChannelMembersScreen;
