import { Box } from '@mantine/core';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      {children}
    </Box>
  );
}