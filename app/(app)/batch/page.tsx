'use client';

import { Container, Title, Button, TextInput, Select, Table, Text, Group, ActionIcon, Modal } from '@mantine/core';
import { IconPlus, IconSearch, IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchBatchRecords } from '../../api/batch_table_api';
import 'mantine-datatable/styles.css';
import { DataTable } from 'mantine-datatable';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';
import { generateBatch } from '../../api/batch_table_api';
import { useRouter } from 'next/navigation';

export default function UpdateItemChangePage() {
    const [filter, setFilter] = useState('');
    const [pageSize, setPageSize] = useState('10');
    const [modalOpened, setModalOpened] = useState(false);
    const router = useRouter();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['BatchRecords'],
        queryFn: fetchBatchRecords,
        // staleTime: 5 * 60 * 1000, // 5 minutes
        // refetchOnWindowFocus: false,
        // enabled: true, // or conditional
    });

    const createBatchMutation = useMutation({
        mutationFn: (requestType: string) => generateBatch(requestType),
        onSuccess: (data) => {
            showSuccessNotification(
                'Batch Created Successfully',
                `Batch #${data.batch_number || 'N/A'} has been created`
            );
            // Navigate to change_item_status page with the batch number
            router.push(`/batch/change_item_status?batch_number=${data.batch_number}`);
        },
        onError: (error) => {
            showErrorNotification(
                'Batch Creation Failed',
                error instanceof Error ? error.message : 'An error occurred while creating the batch'
            );
        },
    });
    
    const handleCreateBatch = () => {
        setModalOpened(true);
    };

    const handleAcceptCreateBatch = () => {
        setModalOpened(false);
        // Trigger the mutation to create a new batch with request_type
        createBatchMutation.mutate('CHANGE_STATUS');
    };

    return (
        <>
            <Modal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                title="Create New Batch"
                centered
            >
                <Text mb="md">
                    This will create a new batch record in the system. Do you want to continue?
                </Text>
                <Group justify="flex-end" gap="sm">
                    <Button
                        variant="outline"
                        onClick={() => setModalOpened(false)}
                        disabled={createBatchMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAcceptCreateBatch}
                        loading={createBatchMutation.isPending}
                    >
                        Accept
                    </Button>
                </Group>
            </Modal>

            <Group justify="space-between" mb="md">
                <Title order={2}>Batch Management</Title>
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={handleCreateBatch}
                >
                    Create Batch
                </Button>
            </Group>

            <DataTable
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
            records={data || []}
            fetching={isLoading}
            columns={[
                { accessor: 'batch_number', title: 'Batch #', sortable: true },
                { accessor: 'total_record', title: 'Total Records', sortable: true },
                { accessor: 'date_created', title: 'Date Created', sortable: true },
                { accessor: 'dateSubmitted', title: 'Date Submitted', sortable: true },
                { accessor: 'batchStatus', title: 'Batch Status', sortable: true },
                {
                accessor: 'actions',
                title: 'Actions',
                render: () => (
                    <Button size="xs" variant="light">
                    View
                    </Button>
                ),
                },
            ]}
            // Pagination
            totalRecords={data?.length || 0}
            recordsPerPage={10}
            page={1}
            onPageChange={(page) => console.log(page)}
            // Empty state
            noRecordsText="No data available in table"
            // Styling
            styles={{
                header: {
                backgroundColor: '#0d8080',
                color: 'white',
                },
            }}
        />
        </>
    );
}