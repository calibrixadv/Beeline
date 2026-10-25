import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TripProvider } from '../src/context/TripContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import {
  ScreenTransitionProvider,
  useScreenTransition,
} from '../src/context/ScreenTransitionContext';
import { Navbar } from '../src/components/Navbar';
import { ScreenLoader } from '../src/components/ScreenLoader';

function AppShell() {
  const { theme, isDark } = useTheme();
  const { isTransitioning, transitionMessage, triggerTransition } = useScreenTransition();

  let pathname = '/';
  try {
    const p = usePathname();
    if (p) {
      pathname = p;
    }
  } catch {
    pathname = '/';
  }

  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && prevPathRef.current !== null && prevPathRef.current !== pathname) {
      if (!isTransitioning) {
        const screenName = pathname === '/' ? 'Home' : pathname.replace('/', '');
        triggerTransition(`Loading Beeline ${screenName}...`);
      }
    }
    prevPathRef.current = pathname;
  }, [pathname, isTransitioning, triggerTransition]);

  return (
    <View style={[styles.shell, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Navbar />
      <View style={styles.mainContent}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Beeline - Home',
            }}
          />
          <Stack.Screen
            name="trips"
            options={{
              title: 'Beeline - Multi-Modal Trips & Bookings',
            }}
          />
          <Stack.Screen
            name="trains"
            options={{
              title: 'Beeline - Train Schedules',
            }}
          />
          <Stack.Screen
            name="schedules"
            options={{
              title: 'Beeline - Transit Schedules',
            }}
          />
          <Stack.Screen
            name="my-trip"
            options={{
              title: 'Beeline - My Trip',
            }}
          />
        </Stack>
      </View>
      <ScreenLoader visible={isTransitioning} message={transitionMessage} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TripProvider>
          <ScreenTransitionProvider>
            <AppShell />
          </ScreenTransitionProvider>
        </TripProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
});
