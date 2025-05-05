// src/services/socket.ts
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.23.99.109:3000';
let socket: Socket | null = null;

export const initSocket = (userId: string): Socket | null => {
  if (!userId) {
    console.warn('[Socket] userId manquant, annulation de la connexion');
    return null;
  }

  if (!socket) {
    socket = io(BASE_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connecté au serveur');
      socket?.emit('join', { userId }); // 🔁 ou 'user-connected' si ton backend écoute ça
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => socket;
