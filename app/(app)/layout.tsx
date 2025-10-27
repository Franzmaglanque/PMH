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
  IconToggleLeft,
  IconCurrencyDollar,
  IconFileDescription,
  IconBox,
  IconBarcode,
  IconPhoto,
  IconBuildingStore,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setUser(JSON.parse(userString));
    }
  }, []);

  // Check if a nav item is active based on current path
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Important for cookie handling
      });

      const data = await response.json();

      if (response.ok && data.status) {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        showSuccessNotification(
          'Logout Successful',
          data.message || 'You have been logged out successfully'
        );

        // Redirect to login page
        router.push('/login');
      } else {
        showErrorNotification(
          'Logout Failed',
          data.message || 'Failed to logout'
        );
      }
    } catch (error) {
      showErrorNotification(
        'Error',
        'Something went wrong during logout'
      );
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'JD';
    const firstName = user.first_name || user.name?.split(' ')[0] || 'J';
    const lastName = user.last_name || user.name?.split(' ')[1] || 'D';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get user display name
  const getUserName = () => {
    if (!user) return 'John Doe';
    return user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  };

  // Get user role
  const getUserRole = () => {
    if (!user) return 'Admin';
    return user.role || user.user_type || 'User';
  };

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
                      {getUserInitials()}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600} style={{ lineHeight: 1.2 }}>
                        {getUserName()}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                        {getUserRole()}
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
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
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
              label="Batch Management"
              leftSection={<IconPackage size={20} stroke={1.5} />}
              childrenOffset={28}
              defaultOpened={isActive('/batch')}
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
            >
              <NavLink
                component={Link}
                href="/batch?request_type=change_status"
                label="Change Item Status"
                leftSection={<IconToggleLeft size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'change_status'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
              <NavLink
                component={Link}
                href="/batch?request_type=change_price_cost"
                label="Change Price/Cost"
                leftSection={<IconCurrencyDollar size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'change_price_cost'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
              <NavLink
                component={Link}
                href="/batch?request_type=change_description"
                label="Change Description"
                leftSection={<IconFileDescription size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'change_description'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
              <NavLink
                component={Link}
                href="/batch?request_type=change_packaging"
                label="Change Packaging"
                leftSection={<IconBox size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'change_packaging'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
              <NavLink
                component={Link}
                href="/batch?request_type=new_barcode"
                label="New Barcode"
                leftSection={<IconBarcode size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'new_barcode'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
              <NavLink
                component={Link}
                href="/batch?request_type=new_image"
                label="New Image"
                leftSection={<IconPhoto size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'new_image'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
              <NavLink
                component={Link}
                href="/batch?request_type=change_store_listing"
                label="Change Store Listing"
                leftSection={<IconBuildingStore size={18} stroke={1.5} />}
                active={pathname === '/batch' && new URLSearchParams(window.location.search).get('request_type') === 'change_store_listing'}
                styles={{
                  root: {
                    borderRadius: rem(6),
                    fontSize: rem(13),
                    '&[data-active]': {
                      backgroundColor: '#e5dbff',
                      color: '#5f3dc4',
                    },
                  },
                }}
              />
            </NavLink>

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