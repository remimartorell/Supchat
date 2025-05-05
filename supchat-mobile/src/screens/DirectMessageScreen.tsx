// src/screens/DirectMessageScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../services/axiosConfig';
import { Message } from '../types/Message';
import { useChat } from '../context/ChatContext';
import EditMessageModal from '../components/EditMessageModal';
import { getSocket, initSocket } from '../services/socket';
import MessageBubble from '../components/MessageBubble';

const DirectMessageScreen: React.FC = () => {
  const { selectedUserId } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchData = async () => {
      const uid = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');
      if (!uid || !token || !selectedUserId) return;
      setUserId(uid);
      axios.defaults.headers.common['x-auth-token'] = token;

      const res = await axios.get(`/api/direct-messages/${selectedUserId}`);
      setMessages(res.data);

      console.log('📨 selectedUserId modifié :', selectedUserId);
      console.log('Messages privés récupérés pour :', selectedUserId, res.data);
    };

    fetchData();
  }, [selectedUserId]);

  useEffect(() => {
    const setupSocket = async () => {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) return;
  
      const socket = initSocket(uid);
      if (!socket) return;
  
      socket.on('dm-message-added', (newMessage) => {
        if (
          newMessage?.sender?._id === selectedUserId ||
          newMessage?.receiver === selectedUserId
        ) {
          setMessages((prev) => [...prev, newMessage]);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
  
      socket.on('dm-message-updated', (updatedMessage) => {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
        );
      });
  
      socket.on('dm-message-reacted', (updatedMessage: Message) => {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
        );
      });

      return () => {
        socket.off('dm-message-added');
        socket.off('dm-message-updated');
        socket.off('dm-message-reacted');
      };
    };
  
    setupSocket();
  }, [selectedUserId]);
  

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await axios.post('/api/direct-messages', {
        receiverId: selectedUserId,
        content: input,
      });
      setInput('');
    } catch (err) {
      console.error('Erreur envoi DM:', err);
    }
  };

  const handleEdit = (message: Message) => {
    setMessageToEdit(message);
    setEditModalVisible(true);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await axios.put(`/api/direct-messages/${messageId}`, {
        newContent,
      });
      setEditModalVisible(false);
      setMessageToEdit(null);
    } catch (err) {
      console.error('Erreur modification DM:', err);
      Alert.alert('Erreur', 'Impossible de modifier le message');
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.message, item.sender._id === userId ? styles.my : styles.other]}>
      <MessageBubble message={item} isMine={item.sender._id === userId} />
  
      {item.edited && (
        <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
          (modifié)
        </Text>
      )}
  
      {item.sender._id === userId && (
        <TouchableOpacity onPress={() => handleEdit(item)} style={{ marginTop: 4 }}>
          <Text style={{ color: '#999' }}>✏️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Votre message..."
          placeholderTextColor="#aaa"
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={styles.sendText}>Envoyer</Text>
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
  message: { margin: 10, padding: 10, borderRadius: 5 },
  my: { backgroundColor: '#2c2c44', alignSelf: 'flex-end' },
  other: { backgroundColor: '#1f1f2f', alignSelf: 'flex-start' },
  name: { fontWeight: 'bold', color: '#fff' },
  content: { color: '#fff' },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#444',
  },
  input: {
    flex: 1,
    color: '#fff',
    backgroundColor: '#1f1f2f',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#5865f2',
    padding: 10,
    borderRadius: 5,
  },
  sendText: { color: '#fff' },
});

export default DirectMessageScreen;
