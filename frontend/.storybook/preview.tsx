import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TripProvider } from '../src/context/TripContext';

export const decorators = [
  (Story: React.ComponentType) => (
    <TripProvider>
      <View style={styles.container}>
        <Story />
      </View>
    </TripProvider>
  ),
];

export const parameters = {
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
