import React from 'react';
import { View, StyleSheet } from 'react-native';
import InfoPageScreen from '@/components/InfoPageScreen';
import Colors from '@/constants/colors';

/** Terms of Service — rendered from the shared info-pages catalog. */
export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <InfoPageScreen page="terms" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
