// app/register/page.tsx

'use client';

import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Button,
  Group,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { IconBriefcase, IconBuilding } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <Container size={700} my={60}>
      <Title ta="center" fw={900} style={{ fontSize: '2.5rem' }}>
        Welcome to Our Platform
      </Title>
      <Text c="dimmed" size="lg" ta="center" mt={10} mb={40}>
        Please select your account type to get started
      </Text>

      <Stack gap="lg">
        <Paper withBorder shadow="md" p={30} radius="md">
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon size={60} radius="md" variant="light" color="blue">
              <IconBriefcase size={30} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Title order={3} size="h4" mb="xs">
                Employee Registration
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Register as an employee if you work directly for the company. You will be assigned to a specific category and position within the organization.
              </Text>
              <Button 
                fullWidth 
                variant="filled"
                onClick={() => router.push('/register/employee')}
              >
                Register as Employee
              </Button>
            </Box>
          </Group>
        </Paper>

        <Paper withBorder shadow="md" p={30} radius="md">
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon size={60} radius="md" variant="light" color="green">
              <IconBuilding size={30} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Title order={3} size="h4" mb="xs">
                Supplier Registration
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Register as a supplier if you are an external vendor or partner. You will need your unique supplier code to complete the registration.
              </Text>
              <Button 
                fullWidth 
                variant="filled"
                color="green"
                onClick={() => router.push('/register/supplier')}
              >
                Register as Supplier
              </Button>
            </Box>
          </Group>
        </Paper>
      </Stack>

      <Text ta="center" size="sm" c="dimmed" mt={30}>
        Already have an account?{' '}
        <Text component="a" href="/login" c="blue" style={{ cursor: 'pointer' }}>
          Sign in here
        </Text>
      </Text>
    </Container>
  );
}