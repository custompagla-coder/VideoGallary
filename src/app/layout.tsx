import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VideoVault — Serverless Video Gallery',
  description:
    'A lightweight, serverless video sharing platform. Upload MP4 files, auto-generate thumbnails, and share your videos instantly via Catbox.moe.',
  keywords: ['video gallery', 'serverless', 'catbox', 'video sharing'],
  openGraph: {
    title: 'VideoVault — Serverless Video Gallery',
    description: 'Upload and share videos instantly with automatic thumbnail generation.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
