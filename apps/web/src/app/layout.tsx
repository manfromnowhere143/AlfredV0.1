import type { Metadata } from 'next';
import { SessionProvider } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alfred - AI Product Architect',
  description: 'A product architect with taste',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
