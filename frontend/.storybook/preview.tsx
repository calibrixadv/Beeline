import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TripProvider } from '../src/context/TripContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { ScreenTransitionProvider } from '../src/context/ScreenTransitionContext';

const ThemedPreviewContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );
};

export const decorators = [
  (Story: React.ComponentType) => (
    <ThemeProvider>
      <ScreenTransitionProvider>
        <TripProvider>
          <ThemedPreviewContainer>
            <Story />
          </ThemedPreviewContainer>
        </TripProvider>
      </ScreenTransitionProvider>
    </ThemeProvider>
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
