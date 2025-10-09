// app/layout.js

import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css'; // Don't forget Mantine styles
import MainLayout from '../components/Layout/MainLayout'; // Import your new layout
// Import your global CSS if applicable

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
          <MainLayout>
            {children}
          </MainLayout>
        </MantineProvider>
      </body>
    </html>
  );
}