'use client';

import { 
  AppShell, 
  Burger, 
  Group, 
  Text, 
  NavLink, 
  Stack,
  Divider,
  Avatar,
  Menu,
  UnstyledButton,
  Box,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconDashboard, 
  IconPackage, 
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconUser,
  IconBell,
  IconFileText,
  IconChartBar,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { logout } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  // Check if a nav item is active based on current path
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ 
        width: 280, 
        breakpoint: 'sm', 
        collapsed: { mobile: !opened } 
      }}
      padding="md"
      styles={{
        main: {
          background: '#f8f9fa',
        },
      }}
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="xl" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            
            {/* Logo/Brand */}
            <Group gap="xs">
              <Box
                style={{
                  width: rem(36),
                  height: rem(36),
                  borderRadius: rem(8),
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: rem(18),
                }}
              >
                PG
              </Box>
              <div>
                <Text size="lg" fw={700} style={{ lineHeight: 1.2 }}>
                  Puregold
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                  Cash-in System
                </Text>
              </div>
            </Group>
          </Group>

          {/* User Menu */}
          <Group gap="md">
            {/* Notifications */}
            <UnstyledButton
              style={{
                width: rem(40),
                height: rem(40),
                borderRadius: rem(8),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: '#f1f3f5',
                },
              }}
            >
              <IconBell size={20} stroke={1.5} />
            </UnstyledButton>

            {/* User Profile Menu */}
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton
                  style={{
                    padding: rem(8),
                    borderRadius: rem(8),
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Group gap="sm">
                    <Avatar
                      radius="xl"
                      color="violet"
                      size="md"
                    >
                      JD
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600} style={{ lineHeight: 1.2 }}>
                        John Doe
                      </Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                        Admin
                      </Text>
                    </div>
                    <IconChevronDown size={16} stroke={1.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={16} />}>
                  Profile
                </Menu.Item>
                <Menu.Item leftSection={<IconSettings size={16} />}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  color="red" 
                  leftSection={<IconLogout size={16} />}
                  // onClick={}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar 
        p="md"
        style={{
          backgroundColor: 'white',
          borderRight: '1px solid #e9ecef',
        }}
      >
        <AppShell.Section grow>
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed" px="md" mb="xs" tt="uppercase">
              Main Menu
            </Text>

            <NavLink
              component={Link}
              href="/dashboard"
              label="Dashboard"
              leftSection={<IconDashboard size={20} stroke={1.5} />}
              active={isActive('/dashboard')}
              styles={{
                root: {
                  borderRadius: rem(8),
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: '#f3f0ff',
                    color: '#5f3dc4',
                    '&:hover': {
                      backgroundColor: '#f3f0ff',
                    },
                  },
                },
                label: {
                  fontSize: rem(14),
                },
              }}
            />

            <NavLink
              component={Link}
              href="/batch"
              label="Batch Management"
              leftSection={<IconPackage size={20} stroke={1.5} />}
              active={isActive('/batch')}
              styles={{
                root: {
                  borderRadius: rem(8),
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: '#f3f0ff',
                    color: '#5f3dc4',
                    '&:hover': {
                      backgroundColor: '#f3f0ff',
                    },
                  },
                },
                label: {
                  fontSize: rem(14),
                },
              }}
            />

            <NavLink
              component={Link}
              href="/reports"
              label="Reports"
              leftSection={<IconFileText size={20} stroke={1.5} />}
              active={isActive('/reports')}
              styles={{
                root: {
                  borderRadius: rem(8),
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: '#f3f0ff',
                    color: '#5f3dc4',
                    '&:hover': {
                      backgroundColor: '#f3f0ff',
                    },
                  },
                },
                label: {
                  fontSize: rem(14),
                },
              }}
            />

            <NavLink
              component={Link}
              href="/analytics"
              label="Analytics"
              leftSection={<IconChartBar size={20} stroke={1.5} />}
              active={isActive('/analytics')}
              styles={{
                root: {
                  borderRadius: rem(8),
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: '#f3f0ff',
                    color: '#5f3dc4',
                    '&:hover': {
                      backgroundColor: '#f3f0ff',
                    },
                  },
                },
                label: {
                  fontSize: rem(14),
                },
              }}
            />

            <Divider my="sm" />

            <Text size="xs" fw={600} c="dimmed" px="md" mb="xs" tt="uppercase">
              Settings
            </Text>

            <NavLink
              component={Link}
              href="/settings"
              label="Settings"
              leftSection={<IconSettings size={20} stroke={1.5} />}
              active={isActive('/settings')}
              styles={{
                root: {
                  borderRadius: rem(8),
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: '#f3f0ff',
                    color: '#5f3dc4',
                    '&:hover': {
                      backgroundColor: '#f3f0ff',
                    },
                  },
                },
                label: {
                  fontSize: rem(14),
                },
              }}
            />
          </Stack>
        </AppShell.Section>

        {/* Sidebar Footer */}
        <AppShell.Section>
          <Box
            p="md"
            style={{
              borderRadius: rem(8),
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <Text size="sm" fw={600} mb={4}>
              Need Help?
            </Text>
            <Text size="xs" mb="md" opacity={0.9}>
              Check our documentation or contact support
            </Text>
            <UnstyledButton
              style={{
                width: '100%',
                padding: `${rem(8)} ${rem(12)}`,
                borderRadius: rem(6),
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: rem(13),
                fontWeight: 500,
                textAlign: 'center',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Contact Support
            </UnstyledButton>
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}