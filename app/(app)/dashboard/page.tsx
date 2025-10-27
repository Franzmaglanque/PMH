'use client';

import {
  Grid,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Card,
  SimpleGrid,
  rem,
  Box,
  ActionIcon,
  ThemeIcon,
  Progress,
  Divider,
} from '@mantine/core';
import {
  IconPackage,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconTrendingUp,
  IconUsers,
  IconFileText,
  IconPlus,
  IconArrowRight,
  IconCalendar,
  IconChartBar,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DataTable } from 'mantine-datatable';
import { getUser } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchRecentBatches, type DashboardStats, type RecentBatch } from '@/app/api/dashboard_api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  // Fetch dashboard statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent batches
  const { data: recentBatches, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['recentBatches'],
    queryFn: () => fetchRecentBatches(5),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      change_status: 'Change Status',
      change_price_cost: 'Price/Cost',
      change_description: 'Description',
      change_packaging: 'Packaging',
      new_barcode: 'New Barcode',
      new_image: 'New Image',
      change_store_listing: 'Store Listing',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'blue',
      SUBMITTED: 'orange',
      APPROVED: 'green',
      REJECTED: 'red',
    };
    return colors[status] || 'gray';
  };

  const handleCreateBatch = (requestType: string) => {
    router.push(`/batch?request_type=${requestType}`);
  };

  return (
    <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
      {/* Welcome Section */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} size="h2" fw={700} mb="xs">
            Welcome back, {user?.first_name || user?.name || 'User'}!
          </Title>
          <Text size="sm" c="dimmed">
            Here's what's happening with your batches today
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => router.push('/batch?request_type=change_status')}
            styles={{
              root: {
                backgroundColor: '#1971c2',
                '&:hover': {
                  backgroundColor: '#1864ab',
                },
              },
            }}
          >
            Create New Batch
          </Button>
        </Group>
      </Group>

      {/* Statistics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
        {/* Total Batches */}
        <Paper p="md" shadow="sm" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Total Batches
            </Text>
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconPackage size={20} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} mb="xs">
            {isLoadingStats ? '...' : stats?.total_batches || 0}
          </Text>
          <Text size="xs" c="dimmed">
            All time batches created
          </Text>
        </Paper>

        {/* Open Batches */}
        <Paper p="md" shadow="sm" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Open Batches
            </Text>
            <ThemeIcon size="lg" variant="light" color="orange">
              <IconClock size={20} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} mb="xs">
            {isLoadingStats ? '...' : stats?.open_batches || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Currently in progress
          </Text>
        </Paper>

        {/* Submitted Batches */}
        <Paper p="md" shadow="sm" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Submitted
            </Text>
            <ThemeIcon size="lg" variant="light" color="yellow">
              <IconFileText size={20} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} mb="xs">
            {isLoadingStats ? '...' : stats?.submitted_batches || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Awaiting approval
          </Text>
        </Paper>

        {/* Approved Batches */}
        <Paper p="md" shadow="sm" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>
              Approved
            </Text>
            <ThemeIcon size="lg" variant="light" color="green">
              <IconCheck size={20} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} mb="xs">
            {isLoadingStats ? '...' : stats?.approved_batches || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Successfully processed
          </Text>
        </Paper>
      </SimpleGrid>

      <Grid gutter="lg">
        {/* Recent Activity */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="lg" shadow="sm" withBorder>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={3} size="h4" fw={600}>
                  Recent Batches
                </Title>
                <Text size="sm" c="dimmed">
                  Latest batch activity
                </Text>
              </div>
              <Button
                variant="light"
                size="sm"
                rightSection={<IconArrowRight size={16} />}
                onClick={() => router.push('/batch')}
              >
                View All
              </Button>
            </Group>

            <DataTable
              withTableBorder={false}
              withColumnBorders
              striped
              highlightOnHover
              records={recentBatches || []}
              fetching={isLoadingBatches}
              columns={[
                {
                  accessor: 'batch_number',
                  title: 'Batch #',
                  render: (record) => (
                    <Text fw={600} size="sm">
                      {record.batch_number}
                    </Text>
                  ),
                },
                {
                  accessor: 'request_type',
                  title: 'Type',
                  render: (record) => (
                    <Badge size="sm" variant="light" color="blue">
                      {getRequestTypeLabel(record.request_type)}
                    </Badge>
                  ),
                },
                {
                  accessor: 'total_record',
                  title: 'Records',
                  render: (record) => (
                    <Text size="sm">{record.total_record}</Text>
                  ),
                },
                {
                  accessor: 'date_created',
                  title: 'Date',
                  render: (record) => (
                    <Text size="sm" c="dimmed">
                      {new Date(record.date_created).toLocaleDateString()}
                    </Text>
                  ),
                },
                {
                  accessor: 'batch_status',
                  title: 'Status',
                  render: (record) => (
                    <Badge
                      size="sm"
                      variant="filled"
                      color={getStatusColor(record.batch_status)}
                    >
                      {record.batch_status}
                    </Badge>
                  ),
                },
              ]}
              styles={{
                header: {
                  backgroundColor: '#f8f9fa',
                },
              }}
            />
          </Paper>
        </Grid.Col>

        {/* Quick Actions & Stats */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            {/* Quick Actions */}
            <Paper p="lg" shadow="sm" withBorder>
              <Title order={4} size="h5" fw={600} mb="md">
                Quick Actions
              </Title>
              <Stack gap="xs">
                <Button
                  variant="light"
                  fullWidth
                  justify="space-between"
                  leftSection={<IconPackage size={18} />}
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => handleCreateBatch('change_status')}
                >
                  Change Item Status
                </Button>
                <Button
                  variant="light"
                  fullWidth
                  justify="space-between"
                  leftSection={<IconPackage size={18} />}
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => handleCreateBatch('change_price_cost')}
                >
                  Change Price/Cost
                </Button>
                <Button
                  variant="light"
                  fullWidth
                  justify="space-between"
                  leftSection={<IconPackage size={18} />}
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => handleCreateBatch('new_barcode')}
                >
                  New Barcode
                </Button>
                <Divider my="xs" />
                <Button
                  variant="subtle"
                  fullWidth
                  justify="space-between"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => router.push('/batch')}
                >
                  View All Batches
                </Button>
              </Stack>
            </Paper>

            {/* Additional Stats */}
            <Paper p="lg" shadow="sm" withBorder>
              <Title order={4} size="h5" fw={600} mb="md">
                Today's Activity
              </Title>
              <Stack gap="md">
                <div>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="blue">
                        <IconCalendar size={14} />
                      </ThemeIcon>
                      <Text size="sm">Batches Created</Text>
                    </Group>
                    <Text size="sm" fw={700}>
                      {isLoadingStats ? '...' : stats?.today_batches || 0}
                    </Text>
                  </Group>
                </div>

                <div>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="green">
                        <IconChartBar size={14} />
                      </ThemeIcon>
                      <Text size="sm">Total Records</Text>
                    </Group>
                    <Text size="sm" fw={700}>
                      {isLoadingStats ? '...' : stats?.total_records || 0}
                    </Text>
                  </Group>
                </div>

                {(stats?.rejected_batches || 0) > 0 && (
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="red">
                          <IconAlertCircle size={14} />
                        </ThemeIcon>
                        <Text size="sm">Rejected</Text>
                      </Group>
                      <Text size="sm" fw={700} c="red">
                        {stats?.rejected_batches || 0}
                      </Text>
                    </Group>
                  </div>
                )}
              </Stack>
            </Paper>

            {/* Completion Rate */}
            <Paper p="lg" shadow="sm" withBorder>
              <Title order={4} size="h5" fw={600} mb="md">
                Completion Rate
              </Title>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Approved vs Total
                </Text>
                <Text size="sm" fw={700}>
                  {isLoadingStats || !stats?.total_batches
                    ? '...'
                    : `${Math.round((stats.approved_batches / stats.total_batches) * 100)}%`}
                </Text>
              </Group>
              <Progress
                value={
                  stats?.total_batches
                    ? (stats.approved_batches / stats.total_batches) * 100
                    : 0
                }
                color="green"
                size="lg"
                radius="xl"
              />
              <Text size="xs" c="dimmed" mt="xs">
                {stats?.approved_batches || 0} of {stats?.total_batches || 0} batches approved
              </Text>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
