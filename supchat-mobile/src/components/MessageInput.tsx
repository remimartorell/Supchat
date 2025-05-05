// src/components/MessageInput.tsx
import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

const MessageInput: React.FC<Props> = ({ value, onChangeText, onSend }) => {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Votre message..."
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="#aaa"
      />
      <TouchableOpacity onPress={onSend} style={styles.button}>
        <Text style={styles.buttonText}>Envoyer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#444' },
  input: { flex: 1, backgroundColor: '#1f1f2f', color: '#fff', borderRadius: 5, paddingHorizontal: 10 },
  button: { marginLeft: 10, backgroundColor: '#5865f2', padding: 10, borderRadius: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default MessageInput;
