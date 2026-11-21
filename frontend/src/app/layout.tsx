import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Beeline',
  applicationName: 'Beeline',
  description: 'Multi-modal transit booking and journey planning across Romania with the Romanian Transfer Shield and dynamic route optimization.',
  openGraph: {
    title: 'Beeline',
    siteName: 'Beeline',
    description: 'Multi-modal transit booking and journey planning across Romania with the Romanian Transfer Shield and dynamic route optimization.',
  },
  twitter: {
    title: 'Beeline',
    card: 'summary',
    description: 'Multi-modal transit booking and journey planning across Romania with the Romanian Transfer Shield and dynamic route optimization.',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.svg'],
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body className="antialiased selection:bg-amber-500 selection:text-stone-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
