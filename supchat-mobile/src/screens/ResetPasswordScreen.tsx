import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from '../services/axiosConfig';
import type { ResetPasswordScreenProps } from '../types/navigationTypes';


const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ route, navigation }) => {
  const { token } = route.params;
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      Alert.alert('Succès', 'Mot de passe réinitialisé. Connecte-toi.');
      navigation.replace('Login');
    } catch (error: any) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.response?.data?.msg || 'Impossible de réinitialiser le mot de passe.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nouveau mot de passe</Text>
      <TextInput
        placeholder="Nouveau mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title="Réinitialiser" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0f1522' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1f1f2f', color: '#fff', padding: 10, marginBottom: 15, borderRadius: 5 },
});

export default ResetPasswordScreen;
