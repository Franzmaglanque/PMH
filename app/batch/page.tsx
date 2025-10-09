'use client';

import { Container, Title, Button, TextInput, Select, Table, Text, Group, ActionIcon } from '@mantine/core';
import { IconPlus, IconSearch, IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { fetchBatchRecords } from '../api/batch_table_api';


export default function UpdateItemChangePage() {
    const [filter, setFilter] = useState('');
    const [pageSize, setPageSize] = useState('10');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['BatchRecords'],
        queryFn: fetchBatchRecords,
        // staleTime: 5 * 60 * 1000, // 5 minutes
        // refetchOnWindowFocus: false,
        // enabled: true, // or conditional
    });

    const columns = [
        { key: 'batchNumber', label: 'Batch #' },
        { key: 'totalRecords', label: 'Total Records' },
        { key: 'dateCreated', label: 'Date Created' },
        { key: 'dateSubmitted', label: 'Date Submitted' },
        { key: 'batchStatus', label: 'Batch Status' },
        { key: 'actions', label: 'Actions' },
    ];
    console.log(data);
    return (
        <Container size="xl" px="md" py="lg">
        {/* Header */}
        <Group justify="space-between" mb="xl">
            <Title order={3}>Update Item Change Packaging Requests</Title>
            <Button
            leftSection={<IconPlus size={16} />}
            color="teal"
            styles={{
                root: {
                backgroundColor: '#5c8a5c',
                '&:hover': {
                    backgroundColor: '#4a7a4a',
                },
                },
            }}
            >
            Create Batch
            </Button>
        </Group>

        {/* Filter and Show controls */}
        <Group justify="space-between" mb="md">
            <Group>
            <Text size="sm" fw={500}>Filter:</Text>
            <TextInput
                placeholder="Type to filter..."
                value={filter}
                onChange={(e) => setFilter(e.currentTarget.value)}
                rightSection={<IconSearch size={16} />}
                styles={{ input: { width: 200 } }}
            />
            </Group>
            <Group>
            <Text size="sm" fw={500}>Show:</Text>
            <Select
                value={pageSize}
                onChange={(value) => setPageSize(value || '10')}
                data={['10', '25', '50', '100']}
                styles={{ input: { width: 80 } }}
            />
            </Group>
        </Group>

        {/* Table */}
        <Table
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
            styles={{
            th: {
                backgroundColor: '#0d8080',
                color: 'white',
                fontWeight: 600,
                padding: '12px 16px',
            },
            }}
        >
            <Table.Thead>
            <Table.Tr>
                {columns.map((column) => (
                <Table.Th key={column.key}>
                    <Group gap={4} justify="space-between">
                    {column.label}
                    <ActionIcon variant="transparent" size="xs" c="white">
                        <IconChevronDown size={14} />
                    </ActionIcon>
                    </Group>
                </Table.Th>
                ))}
            </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
            <Table.Tr>
                <Table.Td colSpan={columns.length}>
                <Text ta="center" py="xl" c="dimmed">
                    No data available in table
                </Text>
                </Table.Td>
            </Table.Tr>
            </Table.Tbody>
        </Table>

        {/* Footer */}
        <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
            Showing 0 to 0 of 0 entries
            </Text>
            <Group gap="xs">
            <Button variant="default" size="xs" disabled>
                ←
            </Button>
            <Button variant="default" size="xs" disabled>
                →
            </Button>
            </Group>
        </Group>
        </Container>
    );
}