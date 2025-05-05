// src/components/UserList.tsx
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChat } from '../context/ChatContext';
import { getSocket, initSocket } from '../services/socket';
import Constants from 'expo-constants';
import defaultAvatar from '../assets/default-avatar.png';
import type { User } from '../types/User';
import { useNavigation } from '@react-navigation/native';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, 'online' | 'offline'>>({});
  const { setSelectedUserId } = useChat();
  const navigation = useNavigation<any>(); // ← on évite le conflit de type reset()

  // 1) Récupération des users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/auth/allUsers');
        setUsers(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          await AsyncStorage.multiRemove(['token','userId','workspaceId']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else {
          console.error('❌ Erreur fetch users:', err);
        }
      }
    };
    fetchUsers();
  }, [navigation]);

  // 2) Écoute des statuts via Socket
  useEffect(() => {
    const listenStatus = async () => {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) return;

      const socket = getSocket() || initSocket(uid);
      socket?.on('user-status-changed', ({ userId, status }) => {
        setOnlineStatus(prev => ({ ...prev, [userId]: status }));
      });
    };
    listenStatus();
  }, []);

  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  const getAvatar = (u: User) =>
      u.profilePicture
          ? { uri: apiUrl + u.profilePicture }
          : u.avatarFileId
              ? { uri: `${apiUrl}/api/users/${u._id}/avatar` }
              : defaultAvatar;

  return (
      <FlatList
          data={users}
          keyExtractor={u => u._id}
          contentContainerStyle={styles.container}
          renderItem={({ item }) => {
            const status = onlineStatus[item._id] || 'offline';
            return (
                <TouchableOpacity
                    style={styles.item}
                    onPress={() => {
                      setSelectedUserId(item._id);
                      navigation.navigate('DirectMessage');
                    }}
                >
                  <Text style={styles.emoji}>{status === 'online' ? '🟢' : '🔴'}</Text>
                  <Image source={getAvatar(item)} style={styles.avatar} />
                  <Text style={styles.name}>{item.name}</Text>
                </TouchableOpacity>
            );
          }}
      />
  );
};

const styles = StyleSheet.create({
  container: { padding: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f2f',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  emoji: { marginRight: 8, fontSize: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  name: { color: '#fff', fontWeight: 'bold', flex: 1 },
});

export default UserList;
