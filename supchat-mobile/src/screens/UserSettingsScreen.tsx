// src/screens/UserSettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import defaultAvatar from '../assets/default-avatar.png';

const UserSettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<any>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [userId, setUserId] = useState('');

  const apiUrl = Constants.expoConfig?.extra?.apiUrl;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const uid = await AsyncStorage.getItem('userId');
        setUserId(uid || '');
        axios.defaults.headers.common['x-auth-token'] = token;

        const res = await axios.get('/api/auth/user');
        setName(res.data.name);
        setEmail(res.data.email);

        if (res.data.avatarFileId) {
          setAvatarUri(`${apiUrl}/api/users/${res.data._id}/avatar`);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erreur récupération profil:', err);
        Alert.alert('Erreur', 'Impossible de récupérer les informations utilisateur');
      }
    };

    fetchUser();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return Alert.alert("Permission requise", "L'accès à la galerie est nécessaire.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: false,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      const image = result.assets[0];
      setAvatarUri(image.uri);
      setAvatarFile({
        uri: image.uri,
        name: image.fileName || 'avatar.jpg',
        type: image.type || 'image/jpeg',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);

    if (oldPassword || newPassword || confirmPassword) {
      formData.append('oldPassword', oldPassword);
      formData.append('newPassword', newPassword);
      formData.append('confirmPassword', confirmPassword);
    }

    if (avatarFile) {
      formData.append('avatarFile', {
        uri: avatarFile.uri,
        name: avatarFile.name,
        type: avatarFile.type,
      } as any);
    }

    try {
      await axios.put('/api/auth/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAvatarFile(null);
    } catch (err: any) {
      console.error('Erreur update:', err);
      Alert.alert('Erreur', err?.response?.data?.msg || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5865f2" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={avatarUri ? { uri: avatarUri } : defaultAvatar}
          style={styles.avatar}
        />
        <Text style={styles.changeAvatarText}>Changer d’avatar</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nom"
        placeholderTextColor="#aaa"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.sectionTitle}>Modifier le mot de passe</Text>
      <TextInput
        style={styles.input}
        placeholder="Ancien mot de passe"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Nouveau mot de passe"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmer nouveau mot de passe"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>💾 Enregistrer</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#0f1522',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0f1522',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
  },
  changeAvatarText: {
    textAlign: 'center',
    color: '#5865f2',
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#1f1f2f',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#aaa',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#5865f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default UserSettingsScreen;
