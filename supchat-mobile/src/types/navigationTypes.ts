import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

// Props pour les écrans de la Stack principale
export type LoginScreenProps      = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type RegisterScreenProps   = NativeStackScreenProps<RootStackParamList, 'Register'>;
export type ResetPasswordProps    = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;
export type SearchResultsProps    = NativeStackScreenProps<RootStackParamList, 'SearchResults'>;
export type WorkspaceSettingsProps = NativeStackScreenProps<RootStackParamList, 'WorkspaceSettings'>;

// Types du Drawer (Main) — utilisé pour useNavigation<...> dans les composants du Drawer
export type DrawerParamList = {
  Chat: undefined;
  DirectMessage: undefined;
  CreateChannel: undefined;
  ManageChannelMembers: { channelId: string };
  EditChannel: { channelId: string };
  UserSettings: undefined;
};
