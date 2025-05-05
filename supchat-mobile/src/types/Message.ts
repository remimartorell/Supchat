// types/Message.ts
import { User } from './User';

export interface Reaction {
  userId: string;
  emoji: string;
  userName?: string; // 👈 on ajoute ce champ facultatif pour le frontend
}

export interface Message {
  _id: string;
  content: string;
  sender: User;
  createdAt: string;
  updatedAt?: string;
  channelId?: string;
  fileUrl?: string;
  edited?: boolean;
  reactions?: Reaction[]; // ✅ Ajouté pour les emojis
}