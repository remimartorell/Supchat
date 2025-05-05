// src/screens/ChatScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { initSocket } from '../services/socket';
import { useChannel } from '../context/ChannelContext';
import { Message } from '../types/Message';
import EditMessageModal from '../components/EditMessageModal';
import MessageBubble from '../components/MessageBubble';

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const [userId, setUserId] = useState<string>('');
  const { selectedChannelId } = useChannel();
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      const uid = await AsyncStorage.getItem('userId');
      if (!token || !uid) {
        navigation.navigate('Login' as never);
        return;
      }
      setUserId(uid);

      const socket = initSocket(uid);
      if (!socket) return;
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connecté au serveur');
      });

      socket.on('new-channel-message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
      });

      socket.on('message-edited', (updatedMessage) => {
        setMessages(prev =>
          prev.map(msg => (msg._id === updatedMessage._id ? updatedMessage : msg))
        );
      });

      socket.on('message-deleted', ({ messageId }) => {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      });

      socket.on('message-reacted', (updatedMessage: Message) => {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
        );
      });
    };

    initAuth();
    return () => {
      socketRef.current?.off('new-channel-message');
      socketRef.current?.off('message-edited');
      socketRef.current?.off('message-deleted');
      socketRef.current?.off('message-reacted');
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChannelId) return;
      try {
        const res = await axios.get(`/api/channels/${selectedChannelId}/messages`);
        setMessages(res.data);
      } catch (error) {
        console.error('Erreur fetchMessages:', error);
      }
    };

    fetchMessages();
  }, [selectedChannelId]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = await AsyncStorage.getItem('token');
      const workspaceId = await AsyncStorage.getItem('workspaceId');
      const userId = await AsyncStorage.getItem('userId');

      const res = await axios.get(`/api/workspaces/${workspaceId}`);
      const member = res.data.members.find((m: any) => m.user._id === userId);
      setIsAdminOrOwner(['admin', 'owner'].includes(member?.role));
    };

    fetchUserRole();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !selectedChannelId) return;
    try {
      const res = await axios.post(`/api/channels/${selectedChannelId}/messages`, { content: input });
      setInput('');
      setMessages(prev => [...prev, res.data]);
    } catch (error) {
      console.error('Erreur sendMessage:', error);
    }
  };

  const handleEdit = (message: Message) => {
    setMessageToEdit(message);
    setEditModalVisible(true);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await axios.put(`/api/channels/${selectedChannelId}/messages/${messageId}`, { newContent });
      setEditModalVisible(false);
      setMessageToEdit(null);
    } catch (err) {
      console.error('Erreur modification:', err);
      Alert.alert('Erreur', 'Impossible de modifier ce message');
    }
  };

  const handleDelete = async (messageId: string) => {
    Alert.alert('Confirmation', 'Supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`/api/channels/${selectedChannelId}/messages/${messageId}`);
          } catch (err) {
            console.error('Erreur suppression:', err);
            Alert.alert('Erreur', 'Impossible de supprimer ce message');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender._id === userId ? styles.myMessage : styles.otherMessage,
      ]}
    >
      <MessageBubble message={item} isMine={item.sender._id === userId} />
  
      {item.edited && (
        <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
          (modifié)
        </Text>
      )}
  
      {(item.sender._id === userId || isAdminOrOwner) && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <TouchableOpacity onPress={() => handleEdit(item)}>
            <Text style={{ color: '#999' }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)}>
            <Text style={{ color: '#999' }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
  
      <Text style={styles.timestamp}>
        {new Date(item.createdAt).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Votre message..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
      {messageToEdit && (
        <EditMessageModal
          visible={editModalVisible}
          initialContent={messageToEdit.content}
          onClose={() => {
            setEditModalVisible(false);
            setMessageToEdit(null);
          }}
          onSave={(newContent) => handleEditMessage(messageToEdit._id, newContent)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1522' },
  messageContainer: { margin: 10, padding: 10, borderRadius: 5 },
  myMessage: { backgroundColor: '#2c2c44', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#1f1f2f', alignSelf: 'flex-start' },
  senderName: { fontWeight: 'bold', color: '#fff' },
  messageContent: { color: '#fff' },
  timestamp: { fontSize: 10, color: '#aaa', alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#444' },
  input: { flex: 1, backgroundColor: '#1f1f2f', color: '#fff', borderRadius: 5, paddingHorizontal: 10 },
  sendButton: { marginLeft: 10, backgroundColor: '#5865f2', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 5 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default ChatScreen;
