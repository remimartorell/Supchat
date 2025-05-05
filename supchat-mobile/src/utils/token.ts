import AsyncStorage from '@react-native-async-storage/async-storage';

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('token');
};

export const clearToken = async () => {
  await AsyncStorage.removeItem('token');
};
