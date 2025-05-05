import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { Message } from '../types/Message';
import axios from '../services/axiosConfig';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';

interface Props {
  message: Message;
  isMine: boolean;
}

const emojiOptions = ['❤️', '🔥', '😂', '👍', '😢', '👏'];

const MessageBubble: React.FC<Props> = ({ message, isMine }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState<{
    emoji: string;
    users: string[];
  } | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const groupedReactions = (message.reactions || []).reduce<
    Record<string, { count: number; users: string[] }>
  >((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [] };
    }
    acc[reaction.emoji].count += 1;
    acc[reaction.emoji].users.push(reaction.userName || 'Inconnu');
    return acc;
  }, {});

  const userReaction = (message.reactions || []).find(
    (reaction) => reaction.userId === message.sender._id
  );

  const handleAddReaction = async (emoji: string) => {
    const isSameEmoji = userReaction?.emoji === emoji;

    try {
      await axios.post('/api/reactions', {
        messageId: message._id,
        emoji,
      });

      setShowEmojiPicker(false);

      if (isSameEmoji) {
        Toast.show('Réaction supprimée !', { duration: Toast.durations.SHORT });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Toast.show('Réaction ajoutée !', { duration: Toast.durations.SHORT });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => fadeAnim.setValue(0));
      }
    } catch (err) {
      console.error('Erreur ajout réaction :', err);
    }
  };

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.other]}>
      <Text style={styles.name}>{message.sender.name}</Text>
      <Text style={styles.text}>{message.content}</Text>

      <View style={styles.reactionsContainer}>
        {Object.entries(groupedReactions).map(([emoji, { count, users }]) => (
          <TouchableOpacity
            key={emoji}
            onLongPress={() => setShowReactionDetails({ emoji, users })}
          >
            <Animated.Text style={[styles.reaction, { opacity: fadeAnim }]}>
              {emoji} {count}
            </Animated.Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
          <Text style={styles.reactionAdd}>➕ Réagir</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Picker Emoji */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiPicker}>
            <FlatList
              data={emojiOptions}
              keyExtractor={(item) => item}
              numColumns={3}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleAddReaction(item)}
                  style={styles.emojiOption}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Détail des utilisateurs */}
      <Modal
        visible={!!showReactionDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionDetails(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowReactionDetails(null)}
        >
          <View style={styles.reactionDetailBox}>
            <Text style={styles.reactionDetailTitle}>
              {showReactionDetails?.emoji} :
            </Text>
            {showReactionDetails?.users.map((user, index) => (
              <Text key={index} style={styles.reactionDetailUser}>
                • {user}
              </Text>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, margin: 5, borderRadius: 5, maxWidth: '80%' },
  mine: { backgroundColor: '#2c2c44', alignSelf: 'flex-end' },
  other: { backgroundColor: '#1f1f2f', alignSelf: 'flex-start' },
  name: { fontWeight: 'bold', color: '#fff' },
  text: { color: '#fff', marginBottom: 5 },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  reaction: {
    color: '#ccc',
    marginRight: 6,
    fontSize: 13,
    opacity: 1,
  },
  reactionAdd: { color: '#aaa', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPicker: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  emojiOption: { padding: 10, margin: 5 },
  emojiText: { fontSize: 24 },
  reactionDetailBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    minWidth: 200,
    maxWidth: '80%',
  },
  reactionDetailTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  reactionDetailUser: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
});

export default MessageBubble;
