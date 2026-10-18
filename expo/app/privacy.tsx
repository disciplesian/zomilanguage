import React from 'react';
import { View, StyleSheet } from 'react-native';
import InfoPageScreen from '@/components/InfoPageScreen';
import Colors from '@/constants/colors';

/** Privacy Policy — rendered from the shared info-pages catalog. */
export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <InfoPageScreen page="privacy" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
