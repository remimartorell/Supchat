// src/components/NotificationHub.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationHub: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Notifications à venir 🔔</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: '#232c3d', borderRadius: 5, margin: 10 },
  text: { color: '#fff', fontSize: 16 },
});

export default NotificationHub;
