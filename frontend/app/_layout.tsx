import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TripProvider } from '../src/context/TripContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TripProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0F172A',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
            },
            contentStyle: {
              backgroundColor: '#F8FAFC',
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Trip Planner',
            }}
          />
          <Stack.Screen
            name="trains"
            options={{
              title: 'Train Schedules',
            }}
          />
          <Stack.Screen
            name="my-trip"
            options={{
              title: 'My Trip Itinerary',
            }}
          />
        </Stack>
      </TripProvider>
    </SafeAreaProvider>
  );
}
