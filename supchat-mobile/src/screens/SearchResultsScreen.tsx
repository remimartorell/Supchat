// src/screens/SearchResultsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SearchResultsScreenProps } from '../types/navigationTypes';


const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({ route }) => {
  const { query } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Résultats pour : {query}</Text>
      {/* Tu pourras intégrer ici la vraie logique de recherche */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1522' },
  text: { color: '#fff', fontSize: 18 },
});

export default SearchResultsScreen;
