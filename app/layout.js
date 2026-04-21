import { DM_Sans } from 'next/font/google';
import './globals.css';
import ServiceWorker from '@/components/ServiceWorker';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
});

export const metadata = {
  title: 'Task Manager',
  description: 'Personal task manager with calendar',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tasks',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  themeColor: '#111110',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={dmSans.className}>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="mask-icon" href="/icon.svg" color="#8b5cf6" />
      </head>
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
