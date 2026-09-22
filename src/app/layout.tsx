import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grade Business Trainer',
  description:
    'Management flight simulator for agencies and IT teams — hire, deliver, read your P&L and Manager Report.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
