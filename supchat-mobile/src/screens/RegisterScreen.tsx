// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import axios from '../services/axiosConfig';
import type { RegisterScreenProps } from '../types/navigationTypes';

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const res = await axios.post('/api/auth/register', {
        name,
        email,
        password,
      });
      Alert.alert('Succès', 'Compte créé ! Connecte-toi.');
      navigation.replace('Login');
    } catch (error: any) {
      console.error('Erreur inscription :', error);
      Alert.alert('Erreur', error.response?.data?.msg || 'Inscription échouée');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>
      <TextInput placeholder="Nom" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
      <TextInput placeholder="Mot de passe" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      <Button title="S'inscrire" onPress={handleRegister} />
      <TouchableOpacity onPress={() => navigation.replace('Login')}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0f1522' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1f1f2f', color: '#fff', padding: 10, marginBottom: 15, borderRadius: 5 },
  link: { color: '#6e8efb', marginTop: 10, textAlign: 'center' },
});

export default RegisterScreen;
