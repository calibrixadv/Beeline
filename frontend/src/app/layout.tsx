import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'VoyageRail | Beeline Transit Planner',
  description: 'Multi-modal transit booking and journey planning across Romania and Europe with the Romanian Transfer Shield.',
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
