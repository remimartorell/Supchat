// src/screens/ProfileSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import axios from '../services/axiosConfig';
import * as ImagePicker from 'expo-image-picker';

const ProfileSettingsScreen: React.FC = () => {
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('/img/default-avatar.png');
  const [avatarFile, setAvatarFile] = useState<any>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/user');
      const data = res.data;
      setPseudo(data.name);
      setEmail(data.email);
      if (data.avatarFileId) {
        setAvatarUrl(`${process.env.REACT_APP_API_URL}/api/users/${data._id}/avatar?time=${Date.now()}`);
      }
    } catch (error) {
      console.error('Erreur fetchUser:', error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission refusée", "Permission d'accéder à la médiathèque est requise!");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      setAvatarFile(asset);
      setAvatarUrl(asset.uri);
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', pseudo);
      formData.append('email', email);
      if (avatarFile) {
        const filename = avatarFile.uri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('avatarFile', { uri: avatarFile.uri, name: filename, type } as any);
      }
      await axios.put('/api/auth/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Succès', 'Profil mis à jour');
      fetchUser();
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paramètres du Profil</Text>
      <TouchableOpacity onPress={pickImage}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <Text style={styles.changeAvatar}>Changer l'avatar</Text>
      </TouchableOpacity>
      <TextInput
        value={pseudo}
        onChangeText={setPseudo}
        placeholder="Pseudo"
        style={styles.input}
        placeholderTextColor="#aaa"
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#aaa"
      />
      <Button title="Enregistrer" onPress={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f1522', justifyContent: 'center' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, textAlign: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 10 },
  changeAvatar: { color: '#6e8efb', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#1f1f2f', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 15 },
});

export default ProfileSettingsScreen;
