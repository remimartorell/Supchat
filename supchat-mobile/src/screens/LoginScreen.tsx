import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import axios from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoginScreenProps } from '../types/navigationTypes';

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      if (!token) {
        Alert.alert('Erreur', 'Échec de la connexion (pas de token)');
        return;
      }
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', user._id);
      navigation.replace('Main');
    } catch (error: any) {
      console.error('Erreur login :', error);
      Alert.alert('Erreur', error.response?.data?.msg || 'Connexion échouée');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Se connecter</Text>
      <TextInput
        placeholder="Adresse email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Se connecter" onPress={handleLogin} />
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Pas de compte ? Inscrivez-vous</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0f1522' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: '#1f1f2f',
    color: '#fff',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  link: { color: '#6e8efb', marginTop: 10, textAlign: 'center' },
});

export default LoginScreen;
