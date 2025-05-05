// src/services/axiosConfig.ts
import axios from 'axios';
import Constants from 'expo-constants';

const instance = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl || 'http://10.23.99.109:3000',
});

export default instance;