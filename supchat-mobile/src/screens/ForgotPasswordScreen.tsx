// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import axios from '../services/axiosConfig';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    try {
      await axios.post('/api/auth/forgot-password', { email });
      Alert.alert('Succès', 'Un email de réinitialisation a été envoyé.');
    } catch (error: any) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.response?.data?.msg || 'Une erreur est survenue.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mot de passe oublié</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title="Envoyer" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0f1522' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1f1f2f', color: '#fff', padding: 10, marginBottom: 15, borderRadius: 5 },
});

export default ForgotPasswordScreen;
