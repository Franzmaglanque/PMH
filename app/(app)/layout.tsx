'use client';

import { AppShell, Burger, Group, Text, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconPackage, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="lg" fw={700}>Your App Name</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          href="/batch"
          label="Batch Management"
          leftSection={<IconPackage size={20} />}
        />
        <NavLink
          component={Link}
          href="/dashboard"
          label="Dashboard"
          leftSection={<IconDashboard size={20} />}
        />
        <NavLink
          component={Link}
          href="/settings"
          label="Settings"
          leftSection={<IconSettings size={20} />}
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}