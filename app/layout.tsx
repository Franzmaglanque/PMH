import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css'; // Don't forget Mantine styles
import MainLayout from '../components/Layout/MainLayout'; // Import your new layout
import { Providers } from './providers';
import '@mantine/notifications/styles.css'; // This line is critical
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PMH - Product Management Hub',
  description: 'Puregold Product Management Hub',
  icons: {
    icon: '/puregold_cms_logo.png',
    shortcut: '/puregold_cms_logo.png',
    apple: '/puregold_cms_logo.png',
  },
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        {/* <ColorSchemeScript /> */}
      </head>
      <body>
        {/* Wrap your entire application with MantineProvider */}
        <MantineProvider>
          {/* Wrap the content (children) with your custom layout */}
            <Providers>
              {children}
            </Providers>
        </MantineProvider>
      </body>
    </html>
  );
}