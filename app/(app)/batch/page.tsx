'use client';

import { Container, Title, Button, TextInput, Select, Table, Text, Group, ActionIcon, Modal, Badge } from '@mantine/core';
import { IconPlus, IconSearch, IconChevronDown } from '@tabler/icons-react';
import { useState, useTransition, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchBatchRecords } from '../../api/batch_table_api';
import 'mantine-datatable/styles.css';
import { DataTable } from 'mantine-datatable';
import { showSuccessNotification, showErrorNotification, showWarningNotification } from '@/lib/notifications';
import { generateBatch } from '../../api/batch_table_api';
import { useRouter, useSearchParams } from 'next/navigation';

// Valid request types based on batch management options
type RequestType =
    | 'change_status'
    | 'change_price_cost'
    | 'change_description'
    | 'change_packaging'
    | 'new_barcode'
    | 'new_image'
    | 'change_store_listing';

const VALID_REQUEST_TYPES: RequestType[] = [
    'change_status',
    'change_price_cost',
    'change_description',
    'change_packaging',
    'new_barcode',
    'new_image',
    'change_store_listing'
];

export default function UpdateItemChangePage() {
    const [filter, setFilter] = useState('');
    const [pageSize, setPageSize] = useState('10');
    const [modalOpened, setModalOpened] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get request type from URL and validate it
    const urlRequestType = searchParams.get('request_type');
    const requestType: RequestType = VALID_REQUEST_TYPES.includes(urlRequestType as RequestType)
        ? (urlRequestType as RequestType)
        : 'change_status';

    // Show warning and redirect if invalid request type
    useEffect(() => {
        if (urlRequestType && !VALID_REQUEST_TYPES.includes(urlRequestType as RequestType)) {
            showWarningNotification(
                'Invalid Request Type',
                `The request type "${urlRequestType}" is not valid. Defaulting to "Change Item Status".`
            );
            router.replace('/batch?request_type=change_status');
        }
    }, [urlRequestType, router]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['BatchRecords', requestType],
        queryFn: () => fetchBatchRecords(requestType),
    });

    const createBatchMutation = useMutation({
        mutationFn: (requestType: string) => generateBatch(requestType),
        onSuccess: (data) => {
            showSuccessNotification(
                'Batch Created Successfully',
                `Batch #${data.batch_number || 'N/A'} has been created`
            );
            // Store batch number in sessionStorage to pass as state
            sessionStorage.setItem('current_batch_number', data.batch_number);
            // Navigate to change_item_status page
            router.push(`/batch/${urlRequestType}?batch_number=${data.batch_number}`);
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
        createBatchMutation.mutate(requestType);
    };

    // Helper function to get readable label for request type
    const getRequestTypeLabel = (type: RequestType): string => {
        const labels: Record<RequestType, string> = {
            'change_status': 'Change Item Status',
            'change_price_cost': 'Change Price/Cost',
            'change_description': 'Change Description',
            'change_packaging': 'Change Packaging',
            'new_barcode': 'New Barcode',
            'new_image': 'New Image',
            'change_store_listing': 'Change Store Listing',
        };
        return labels[type];
    };

    // Helper function to get status badge color
    const getStatusColor = (status: string) => {
        const statusLower = status?.toLowerCase() || '';
        switch (statusLower) {
            case 'open':
                return 'blue';
            case 'submitted':
                return 'orange';
            case 'approved':
                return 'green';
            case 'rejected':
                return 'red';
            case 'closed':
                return 'gray';
            default:
                return 'gray';
        }
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
                <div>
                    <Title order={2}>Batch Management</Title>
                    <Group gap="xs" mt="xs">
                        <Text size="sm" c="dimmed">Request Type:</Text>
                        <Badge color="blue" variant="light" size="lg">
                            {getRequestTypeLabel(requestType)}
                        </Badge>
                    </Group>
                </div>
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
                    {
                        accessor: 'batch_status',
                        title: 'Batch Status',
                        sortable: true,
                        render: (record: any) => (
                            <Badge
                                color={getStatusColor(record.batch_status)}
                                variant="filled"
                                size="md"
                                style={{ textTransform: 'uppercase' }}
                            >
                                {record.batch_status || 'UNKNOWN'}
                            </Badge>
                        )
                    },
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