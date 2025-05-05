// src/components/SidebarDrawer.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import axios from '../services/axiosConfig';
import { useChannel } from '../context/ChannelContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import UserList from './UserList';
import { Ionicons } from '@expo/vector-icons';
import { initSocket } from '../services/socket';
import Constants from 'expo-constants';
import defaultAvatar from '../assets/default-avatar.png';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RootStackParamList, DrawerParamList } from '../types/navigationTypes';
import { User } from '../types/User';

interface Channel {
  _id: string;
  name: string;
  type: string;
}

const SidebarDrawer: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const { selectedChannelId, setSelectedChannelId } = useChannel();

  // Ici, nous utilisons un CompositeNavigationProp pour combiner le drawer et le stack navigation
  const navigation = useNavigation<
    CompositeNavigationProp<DrawerNavigationProp<DrawerParamList>, StackNavigationProp<RootStackParamList>>
  >();

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get('/api/auth/user');
      setCurrentUser(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('⛔️ Token expiré (user), déconnexion...');
        await AsyncStorage.multiRemove(['token', 'userId', 'workspaceId']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
      } else {
        console.error('Erreur getMe:', err);
      }
    }
  };

  const fetchChannels = async () => {
    try {
      const workspaceId = await AsyncStorage.getItem('workspaceId');
      if (!workspaceId) return;

      const res = await axios.get(`/api/workspaces/${workspaceId}/channels`);
      setChannels(res.data);

      const wsRes = await axios.get(`/api/workspaces/${workspaceId}`);
      const userId = await AsyncStorage.getItem('userId');
      const member = wsRes.data.members.find((m: any) => m.user._id === userId);
      if (member?.role) setCurrentUserRole(member.role);
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('⛔️ Token expiré (channels), déconnexion...');
        await AsyncStorage.multiRemove(['token', 'userId', 'workspaceId']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
      } else {
        console.error('Erreur récupération channels ou rôle:', err);
      }
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      await axios.post('/api/workspaces', { name: newWsName.trim() });
      setNewWsName('');
      setShowCreateWs(false);
      alert('Workspace créé !');
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('⛔️ Token expiré (create WS), déconnexion...');
        await AsyncStorage.multiRemove(['token', 'userId', 'workspaceId']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
      } else {
        console.error('Erreur création workspace:', err);
        alert("Erreur lors de la création");
      }
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'userId', 'workspaceId']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    navigation.navigate('Chat');
  };

  const getUserAvatar = (user: User) => {
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;
    if (user.profilePicture) {
      return { uri: `${apiUrl}${user.profilePicture}` };
    } else if (user.avatarFileId) {
      return { uri: `${apiUrl}/api/users/${user._id}/avatar` };
    }
    return defaultAvatar;
  };

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
        return;
      }

      await fetchCurrentUser();
      await fetchChannels();

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const socket = initSocket(userId);
      if (!socket) return;

      socket.on('channel-added', fetchChannels);
      socket.on('channel-updated', fetchChannels);
      socket.on('channel-deleted', fetchChannels);

      return () => {
        socket.off('channel-added', fetchChannels);
        socket.off('channel-updated', fetchChannels);
        socket.off('channel-deleted', fetchChannels);
      };
    };

    init();
  }, []);

  const renderItem = ({ item }: { item: Channel }) => (
    <View key={item._id}>
      <TouchableOpacity
        style={[
          styles.channelButton,
          selectedChannelId === item._id && styles.activeChannel,
        ]}
        onPress={() => handleSelectChannel(item._id)}
      >
        <Text style={styles.channelText}>
          {item.type === 'private' ? '🔒 ' : '# '}
          {item.name}
        </Text>
      </TouchableOpacity>

      {item.type === 'private' && ['admin', 'owner'].includes(currentUserRole) && (
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() =>
            navigation.navigate('ManageChannelMembers', { channelId: item._id })
          }
        >
          <Text style={styles.manageBtnText}>
            <Ionicons name="people" size={16} color="#ccc" /> Gérer les membres
          </Text>
        </TouchableOpacity>
      )}
      {['admin', 'owner'].includes(currentUserRole) && (
        <TouchableOpacity
          style={[styles.manageBtn, { marginLeft: 10, backgroundColor: '#263159' }]}
          onPress={() =>
            navigation.navigate('EditChannel', { channelId: item._id })
          }
        >
          <Text style={styles.manageBtnText}>
            <Ionicons name="create-outline" size={16} color="#ccc" /> Modifier
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <FlatList
      data={channels}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Utilisateurs</Text>
          <UserList />
          <Text style={styles.title}>Créer un Workspace</Text>
          {!showCreateWs && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateWs(true)}
            >
              <Text style={styles.createBtnText}>+ Créer un workspace</Text>
            </TouchableOpacity>
          )}
          {showCreateWs && (
            <View style={{ marginBottom: 20 }}>
              <TextInput
                placeholder="Nom du workspace"
                value={newWsName}
                onChangeText={setNewWsName}
                placeholderTextColor="#aaa"
                style={styles.input}
              />
              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreateWorkspace}
              >
                <Text style={styles.createBtnText}>Créer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCreateWs(false)}>
                <Text style={{ color: '#999', marginTop: 8 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.title}>Vos Channels</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateChannel')}
          >
            <Text style={styles.createBtnText}>+ Créer un channel</Text>
          </TouchableOpacity>
        </View>
      }
      ListFooterComponent={
        currentUser && (
          <View style={styles.footer}>
            <View style={styles.footerUser}>
              <Image
                source={getUserAvatar(currentUser)}
                style={styles.footerAvatar}
              />
              <Text style={styles.footerName}>{currentUser.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('UserSettings')}
            >
              <Text style={styles.settingsBtnText}>⚙️ Paramètres</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <Text style={styles.logoutBtnText}>🚪 Déconnexion</Text>
            </TouchableOpacity>
          </View>
        )
      }
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 15, color: '#fff' },
  channelButton: {
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#1f1f2f',
    marginBottom: 10,
  },
  activeChannel: { backgroundColor: '#5865f2' },
  channelText: { color: '#fff' },
  createBtn: {
    backgroundColor: '#5865f2',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  createBtnText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1f1f2f',
    color: 'white',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  manageBtn: {
    backgroundColor: '#1a1a2e',
    padding: 6,
    paddingLeft: 12,
    borderRadius: 4,
    marginBottom: 8,
    marginTop: -8,
    marginLeft: 10,
  },
  manageBtnText: {
    color: '#ccc',
    fontSize: 13,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#333',
  },
  footerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  footerName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingsBtn: {
    paddingVertical: 6,
    backgroundColor: '#263159',
    borderRadius: 6,
    marginBottom: 10,
  },
  settingsBtnText: {
    color: '#fff',
    textAlign: 'center',
  },
  logoutBtn: {
    paddingVertical: 6,
    backgroundColor: '#991b1b',
    borderRadius: 6,
  },
  logoutBtnText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default SidebarDrawer;
