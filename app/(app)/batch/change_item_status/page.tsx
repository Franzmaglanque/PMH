'use client';

import {
  Paper,
  Title,
  Text,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Badge,
  Divider,
  Box,
  rem,
  Grid,
  LoadingOverlay,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from "@tanstack/react-query";
import { validateBarcode, fetchBatchRecordsById,saveBatchRecord } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { useNumericInput } from '@/lib/inputHelpers';
import { StyledDataTable, createBadgeRenderer,SimpleDataTable } from '@/lib/dataTableHelper';
import { changeItemStatusSchema, type ChangeItemStatusInput } from '@/lib/schemas/batch.schema';

export default function ChangeItemStatusPage() {
    const router = useRouter();

    // Get batch number from sessionStorage (passed as state from batch page)
    const [batchNumber, setBatchNumber] = useState<string | null>(null);

    // Separate state for display-only field
    const [currentSkuStatus, setCurrentSkuStatus] = useState<string>('');

    // Load batch number from sessionStorage on mount
    useEffect(() => {
        const storedBatchNumber = sessionStorage.getItem('current_batch_number');
        if (storedBatchNumber) {
            setBatchNumber(storedBatchNumber);
            // Optionally clear it after reading
            // sessionStorage.removeItem('current_batch_number');
        } else {
            // If no batch number in session, redirect back to batch page
            showErrorNotification('No Batch Selected', 'Please select or create a batch first');
            router.push('/batch');
        }
    }, [router]);

    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
        watch,
    } = useForm<ChangeItemStatusInput>({
        resolver: zodResolver(changeItemStatusSchema),
        defaultValues: {
        barcode: '',
        sku: '',
        long_name: '',
        sku_status: '',
        effectivity_date: null,
        dept: '',
        deptnm: '',
        },
    });

    // Fetch batch records
    const { data: batchRecords, isLoading: isLoadingRecords, refetch: refetchRecords } = useQuery({
        queryKey: ['batchRecords', batchNumber],
        queryFn: () => fetchBatchRecordsById(batchNumber || ''),
        enabled: !!batchNumber,
    });

    const validateBarcodeMutation = useMutation({
        mutationFn: ({ barcode, batchNumber }: { barcode: string; batchNumber: string }) =>
            validateBarcode(barcode, batchNumber),
        onSuccess: (data) => {
            console.log('API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Barcode Validated',
                    data.message || 'Item details have been loaded successfully'
                );
                // Update form fields
                setValue('sku', data.sku);
                setValue('long_name', data.description);
                setValue('dept', data.dept);
                setValue('deptnm', data.deptnm);

                setCurrentSkuStatus(data.sku_status || '');

            } else {
                reset();
                setCurrentSkuStatus('');
                showErrorNotification(
                    'Validation Failed',
                    data.message || 'The barcode could not be validated'
                );
            }
        },
        onError: (error) => {
           reset();
            setCurrentSkuStatus('');
            showErrorNotification(
                'Validation Failed',
                error instanceof Error ? error.message : 'Failed to validate barcode'
            );
        },
    });

    const saveBatchRecordMutation = useMutation({
        mutationFn: saveBatchRecord,
        onSuccess: (data) => {
            console.log('API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Barcode Validated',
                    data.message || 'Item details have been loaded successfully'
                );
                // Update form fields
                setValue('sku', data.sku);
                setValue('long_name', data.description);
                setValue('dept', data.dept);
                setValue('deptnm', data.deptnm);

                setCurrentSkuStatus(data.sku_status || '');

            } else {
                reset();
                setCurrentSkuStatus('');
                showErrorNotification(
                    'Validation Failed',
                    data.message || 'The barcode could not be validated'
                );
            }
        },
        onError: (error) => {
           reset();
            setCurrentSkuStatus('');
            showErrorNotification(
                'Validation Failed',
                error instanceof Error ? error.message : 'Failed to validate barcode'
            );
        },
    });

    const onSubmit = (data: ChangeItemStatusInput) => {
        console.log('Form submitted (validated by Zod):', data);
        const formattedDate = data.effectivity_date instanceof Date 
        ? data.effectivity_date.toISOString().split('T')[0]
        : data.effectivity_date;
        saveBatchRecordMutation.mutate({
            ...data,
            effectivity_date: formattedDate,
            batch_number: batchNumber,
            request_type: 'change_status'
        });
    };

    const handleGoBack = () => {
        router.push('/batch');
    };

    // Create debounced callback for UPC validation
    const validateUpc = useDebouncedInput((upcValue: string) => {
        if (upcValue && upcValue.length > 0) {
            validateBarcodeMutation.mutate({
                barcode: upcValue,
                batchNumber: batchNumber || '',
            });
        }
    }, 800);

    const statusOptions = [
        { value: '', label: '-- SELECT ITEM STATUS --' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
        { value: 'NOT TO BE REORDERED', label: 'Not to be Re-ordered' },
        { value: 'TO BE PURGED', label: 'To be Purged' },
    ];

    return (
        <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
        {/* Header Section */}
        <Box mb="xl">
            <Group justify="space-between" align="center" mb="md">
            <Title order={1} size="h2" fw={700}>
                BATCH # {batchNumber || '78'}
            </Title>
            <Button
                color="green"
                size="md"
                rightSection={<IconCheck size={18} />}
                styles={{
                root: {
                    backgroundColor: '#82c43c',
                    '&:hover': {
                    backgroundColor: '#6fb32e',
                    },
                },
                }}
            >
                Submit Batch
            </Button>
            </Group>

            <Group gap="xs">
            <Text size="sm" fw={600}>Batch Status:</Text>
            <Badge color="gray" variant="filled" size="sm">OPEN</Badge>
            <Text size="sm" fw={600} ml="md">Request Type:</Text>
            <Badge color="blue" variant="filled" size="sm">CHANGE STATUS</Badge>
            </Group>
        </Box>

        {/* Main Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
            <Paper shadow="sm" p={0} withBorder style={{ overflow: 'hidden', position: 'relative' }}>
            <LoadingOverlay
                visible={validateBarcodeMutation.isPending}
                zIndex={1000}
                overlayProps={{ radius: "sm", blur: 2 }}
                loaderProps={{ color: 'blue', type: 'bars' }}
            />
            {/* Item Description Section */}
            <Box p="xl" style={{ backgroundColor: 'white' }}>
                <Title
                order={5}
                mb="lg"
                fw={700}
                style={{
                    fontSize: rem(13),
                    letterSpacing: '0.5px',
                    color: '#495057'
                }}
                >
                ITEM DESCRIPTION
                </Title>

                <Grid gutter="lg">
                <Grid.Col span={12}>
                    <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                        UPC
                    </Text>
                    <Controller
                        name="barcode"
                        control={control}
                        render={({ field }) => (
                            <TextInput
                                placeholder=""
                                size="md"
                                value={field.value}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Only allow numeric characters
                                    if (/^\d*$/.test(value)) {
                                        field.onChange(value);
                                        // Trigger debounced validation
                                        validateUpc({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
                                    }
                                }}
                                error={errors.barcode?.message}
                                styles={{
                                    input: {
                                        border: '1px solid #dee2e6',
                                        borderRadius: rem(4),
                                        fontSize: rem(14),
                                    },
                                }}
                            />
                        )}
                    />
                    </Box>
                </Grid.Col>

                <Grid.Col span={12}>
                    <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                        SKU #
                    </Text>
                    <TextInput
                        placeholder=""
                        size="md"
                        readOnly
                        {...register('sku')}
                        error={errors.sku?.message}
                        styles={{
                        input: {
                            border: '1px solid #dee2e6',
                            borderRadius: rem(4),
                            fontSize: rem(14),
                            backgroundColor: '#f8f9fa',
                            color: '#6c757d',
                        },
                        }}
                    />
                    </Box>
                </Grid.Col>

                <Grid.Col span={12}>
                    <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                        DESCRIPTION
                    </Text>
                    <TextInput
                        placeholder=""
                        size="md"
                        readOnly
                        {...register('long_name')}
                        error={errors.long_name?.message}
                        styles={{
                        input: {
                            border: '1px solid #dee2e6',
                            borderRadius: rem(4),
                            fontSize: rem(14),
                            backgroundColor: '#f8f9fa',
                            color: '#6c757d',
                        },
                        }}
                    />
                    </Box>
                </Grid.Col>

                <Grid.Col span={12}>
                    <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                        CURRENT SKU STATUS
                    </Text>
                    <TextInput
                        placeholder=""
                        size="md"
                        readOnly
                        value={currentSkuStatus}
                        styles={{
                        input: {
                            border: '1px solid #dee2e6',
                            borderRadius: rem(4),
                            fontSize: rem(14),
                            backgroundColor: '#f8f9fa',
                            color: '#6c757d',
                        },
                        }}
                    />
                    </Box>
                </Grid.Col>
                </Grid>
            </Box>

            <Divider />

            {/* Update Fields Section */}
            <Box p="xl" style={{ backgroundColor: 'white' }}>
                <Title
                order={5}
                mb="lg"
                fw={700}
                style={{
                    fontSize: rem(13),
                    letterSpacing: '0.5px',
                    color: '#495057'
                }}
                >
                UPDATE FIELDS
                </Title>

                <Grid gutter="lg">
                <Grid.Col span={12}>
                    <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                        CHANGE SKU STATUS
                    </Text>
                    <Controller
                        name="sku_status"
                        control={control}
                        render={({ field }) => (
                        <Select
                            {...field}
                            placeholder="-- SELECT ITEM STATUS --"
                            size="md"
                            data={statusOptions}
                            error={errors.sku_status?.message}
                            styles={{
                            input: {
                                border: '1px solid #dee2e6',
                                borderRadius: rem(4),
                                fontSize: rem(14),
                            },
                            }}
                        />
                        )}
                    />
                    </Box>
                </Grid.Col>

                <Grid.Col span={12}>
                    <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                        EFFECTIVITY DATE
                    </Text>
                    <Controller
                        name="effectivity_date"
                        control={control}
                        render={({ field }) => (
                        <TextInput
                            type="date"
                            size="md"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                            error={errors.effectivity_date?.message}
                            styles={{
                            input: {
                                border: '1px solid #dee2e6',
                                borderRadius: rem(4),
                                fontSize: rem(14),
                            },
                            }}
                        />
                        )}
                    />
                    </Box>
                </Grid.Col>
                </Grid>
            </Box>

            {/* Action Buttons */}
            <Box p="xl" style={{ backgroundColor: '#fafafa', borderTop: '1px solid #e9ecef' }}>
                <Group justify="flex-end" gap="md">
                <Button
                    variant="light"
                    color="blue"
                    size="md"
                    leftSection={<IconArrowLeft size={18} />}
                    onClick={handleGoBack}
                    styles={{
                    root: {
                        backgroundColor: '#e7f5ff',
                        color: '#1971c2',
                        '&:hover': {
                        backgroundColor: '#d0ebff',
                        },
                    },
                    }}
                >
                    Go Back
                </Button>
                <Button
                    type="submit"
                    size="md"
                    leftSection={<IconDeviceFloppy size={18} />}
                    styles={{
                    root: {
                        backgroundColor: '#1971c2',
                        '&:hover': {
                        backgroundColor: '#1864ab',
                        },
                    },
                    }}
                >
                    Save
                </Button>
                </Group>
            </Box>
            </Paper>
        </form>

        {/* Encoded Records DataTable */}
        <Box mt="xl">
            <StyledDataTable
                title="ENCODED RECORDS"
                showRecordCount
                data={batchRecords || []}
                isLoading={isLoadingRecords}
                emptyMessage="No encoded records yet."
                columns={[
                    {
                        accessor: 'upc',
                        title: 'UPC',
                        width: 150,
                        ellipsis: true,
                    },
                    {
                        accessor: 'sku',
                        title: 'SKU #',
                        width: 120,
                    },
                    {
                        accessor: 'description',
                        title: 'Description',
                        ellipsis: true,
                    },
                    {
                        accessor: 'current_status',
                        title: 'Current Status',
                        width: 150,
                        render: createBadgeRenderer('current_status', 'gray', 'light'),
                    },
                    {
                        accessor: 'new_status',
                        title: 'New Status',
                        width: 150,
                        render: createBadgeRenderer('new_status', 'blue', 'filled'),
                    },
                    {
                        accessor: 'effectivity_date',
                        title: 'Effectivity Date',
                        width: 140,
                    },
                    {
                        accessor: 'actions',
                        title: 'Actions',
                        width: 100,
                        textAlign: 'center',
                        render: (record: any) => (
                            <Group gap="xs" justify="center">
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    onClick={() => {
                                        // Add delete logic here
                                        console.log('Delete clicked', record);
                                    }}
                                >
                                    Delete
                                </Button>
                            </Group>
                        ),
                    },
                ]}
            />
            {/* <SimpleDataTable
                data={batchRecords || []}
                isLoading={isLoadingRecords}
                emptyMessage="No encoded records yet."
                columns={[
                    {
                        accessor: 'upc',
                        title: 'UPC',
                        width: 150,
                        ellipsis: true,
                    },
                    {
                        accessor: 'sku',
                        title: 'SKU #',
                        width: 120,
                    },
                    {
                        accessor: 'description',
                        title: 'Description',
                        ellipsis: true,
                    },
                    {
                        accessor: 'current_status',
                        title: 'Current Status',
                        width: 150,
                        render: createBadgeRenderer('current_status', 'gray', 'light'),
                    },
                    {
                        accessor: 'new_status',
                        title: 'New Status',
                        width: 150,
                        render: createBadgeRenderer('new_status', 'blue', 'filled'),
                    },
                    {
                        accessor: 'effectivity_date',
                        title: 'Effectivity Date',
                        width: 140,
                    },
                    {
                        accessor: 'actions',
                        title: 'Actions',
                        width: 100,
                        textAlign: 'center',
                        render: (record: any) => (
                            <Group gap="xs" justify="center">
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    onClick={() => {
                                        // Add delete logic here
                                        console.log('Delete clicked', record);
                                    }}
                                >
                                    Delete
                                </Button>
                            </Group>
                        ),
                    },
                ]}
            /> */}
        </Box>
        </Box>
    );
}
