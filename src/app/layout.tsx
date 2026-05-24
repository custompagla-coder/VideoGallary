import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DarkWebXYoruWeb — Serverless Video Gallery',
  description:
    'A lightweight, serverless video sharing platform. Upload MP4 files, auto-generate thumbnails, and share your videos instantly via Catbox.moe.',
  keywords: ['video gallery', 'serverless', 'catbox', 'video sharing'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DarkWebXYoruWeb',
  },
  openGraph: {
    title: 'DarkWebXYoruWeb — Serverless Video Gallery',
    description: 'Upload and share videos instantly with automatic thumbnail generation.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-theme="dark">
      <body className="antialiased font-sans">
        <AuthProvider>
          <ThemeProvider>
            <Toaster 
              position="top-right" 
              toastOptions={{ 
                style: { 
                  background: 'var(--bg-card)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border)' 
                } 
              }} 
            />
            {children}
          </ThemeProvider>
        </AuthProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.log('SW registration failed:', err);
              });
            });
          }
        ` }} />
      </body>
    </html>
  );
}
