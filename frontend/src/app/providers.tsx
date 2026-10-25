'use client';

import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { TripProvider } from '../context/TripContext';
import CozyHoneyBackground from '../components/CozyHoneyBackground';
import Navbar from '../components/Navbar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TripProvider>
          <CozyHoneyBackground>
            <Navbar />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          </CozyHoneyBackground>
        </TripProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default Providers;
