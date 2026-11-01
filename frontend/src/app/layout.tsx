import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Beeline | Smart Romanian Transit Planner',
  description: 'Multi-modal transit booking and journey planning across Romania with the Romanian Transfer Shield and dynamic route optimization.',
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
