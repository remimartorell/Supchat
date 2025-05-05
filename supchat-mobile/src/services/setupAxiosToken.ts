// src/services/setupAxiosToken.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from './axiosConfig';

export const setupAxiosToken = async () => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
    console.log('🔐 Token appliqué à axios');
  } else {
    delete axios.defaults.headers.common['x-auth-token'];
    console.log('❌ Aucun token, axios nettoyé');
  }
};
