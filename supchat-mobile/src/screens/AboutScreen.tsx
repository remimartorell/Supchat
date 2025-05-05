// src/screens/AboutScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AboutScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>À propos de SUPCHAT</Text>
      <Text style={styles.text}>SUPCHAT est une application de messagerie collaborative créée par des étudiants passionnés. 🚀</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f1522' },
  title: { fontSize: 24, color: '#fff', marginBottom: 15, textAlign: 'center' },
  text: { fontSize: 16, color: '#ccc' },
});

export default AboutScreen;
