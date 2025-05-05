// src/components/EditMessageModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

interface EditMessageModalProps {
  visible: boolean;
  initialContent: string;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

const EditMessageModal: React.FC<EditMessageModalProps> = ({ visible, initialContent, onClose, onSave }) => {
  const [newContent, setNewContent] = useState(initialContent);

  useEffect(() => {
    setNewContent(initialContent);
  }, [initialContent]);

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Modifier le message</Text>
          <TextInput
            value={newContent}
            onChangeText={setNewContent}
            style={styles.input}
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(newContent)} style={[styles.button, styles.saveButton]}>
              <Text style={styles.buttonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditMessageModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1f1f2f',
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  saveButton: {
    backgroundColor: '#5865f2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
