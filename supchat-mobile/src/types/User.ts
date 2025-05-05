export interface User {
  _id: string;
  name: string;
  email: string;
  avatarFileId?: string;
  profilePicture?: string;
  status?: 'online' | 'offline';
}
