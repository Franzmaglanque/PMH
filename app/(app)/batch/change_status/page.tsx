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
  Modal,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation,useQueryClient } from "@tanstack/react-query";
import { barcodeFetchDetails, fetchBatchRecordsById,saveBatchRecord,fetchBatchRecords,deleteBatchRecord,updateBatchRecord,postBatch,validateBarcodeUsed } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { useNumericInput } from '@/lib/inputHelpers';
import { StyledDataTable, createBadgeRenderer,SimpleDataTable } from '@/lib/dataTableHelper';
import { changeItemStatusSchema, type ChangeItemStatusInput } from '@/lib/schemas/batch.schema';
import { getChangeStatusColumns } from '@/components/Columns/Change_status';

function ChangeItemStatusContent() {
    const PAGE_TYPE = 'change_status';
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const batchNumber = searchParams.get('batch_number');
    const [currentSkuStatus, setCurrentSkuStatus] = useState<string>('');
    const [confirmModalOpened, setConfirmModalOpened] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<ChangeItemStatusInput | null>(null);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [postBatchModalOpened, setPostBatchModalOpened] = useState(false);

    const { data: batchRecords, isLoading:isLoadingRecords, error } = useQuery({
        queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
        queryFn: () => fetchBatchRecords(batchNumber!, PAGE_TYPE),
        enabled: !!batchNumber,
        retry: false, // Don't retry on validation errors
    });

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
        cost: '',
        price: '',
        dept: '',
        deptnm: '',
        },
    });

    // Watch the sku_status field to conditionally show/hide new_cost and new_price
    const selectedStatus = watch('sku_status');

    // Separate form for editing records
    const {
        control: editControl,
        handleSubmit: handleEditSubmit,
        setValue: setEditValue,
        watch: watchEdit,
        reset: resetEdit,
        formState: { errors: editErrors },
    } = useForm<ChangeItemStatusInput>({
        resolver: zodResolver(changeItemStatusSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            long_name: '',
            sku_status: '',
            effectivity_date: null,
            cost: '',
            price: '',
            dept: '',
            deptnm: '',
        },
    });

    const editSelectedStatus = watchEdit('sku_status');

    const validateBarcodeMutation = useMutation({
        mutationFn: ({ barcode, batchNumber }: { barcode: string; batchNumber: string }) =>
            barcodeFetchDetails(barcode, batchNumber),
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

    const validateBarcodeUsedMutation = useMutation({
        mutationFn: ({ barcode, batchNumber, requestType }: { barcode: string; batchNumber: string; requestType: string }) =>
            validateBarcodeUsed(barcode, batchNumber, requestType),
        onSuccess: (data) => {
            console.log('Validate Barcode Used Response:', data);

            if (data.status) {
                // status true means conflict exists - show error
                showErrorNotification(
                    data.title || 'Barcode Already Used',
                    data.message || 'This barcode is already used in another batch'
                );
                setConfirmModalOpened(false);
                setPendingFormData(null);
            } else {
                // status false means no conflict - proceed with save
                if (pendingFormData) {
                    const formattedDate = pendingFormData.effectivity_date instanceof Date
                        ? pendingFormData.effectivity_date.toISOString().split('T')[0]
                        : pendingFormData.effectivity_date;

                    saveBatchRecordMutation.mutate({
                        ...pendingFormData,
                        effectivity_date: formattedDate,
                        batch_number: batchNumber,
                        request_type: 'change_status'
                    });
                }
            }
        },
        onError: (error) => {
            showErrorNotification(
                'Validation Failed',
                error instanceof Error ? error.message : 'Failed to validate barcode usage'
            );
            setConfirmModalOpened(false);
            setPendingFormData(null);
        },
    });

    const saveBatchRecordMutation = useMutation({
        mutationFn: saveBatchRecord,
        onSuccess: (data) => {
            console.log('API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Record Saved',
                    data.message || 'Item details have been saved successfully'
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
                reset();
                setConfirmModalOpened(false);
                setPendingFormData(null);
            } else {
                showErrorNotification(
                    'Save record failed',
                    data.message || 'Please Contact buyer for assistance'
                );
                setConfirmModalOpened(false);
                setPendingFormData(null);
            }
        },
        onError: (error) => {
            showErrorNotification(
                'Saving Failed',
                error instanceof Error ? error.message : 'Failed to save record'
            );
            setConfirmModalOpened(false);
            setPendingFormData(null);
        },
    });

    const updateBatchRecordMutation = useMutation({
        mutationFn: updateBatchRecord,
        onSuccess: (data) => {
            console.log('API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Item Update',
                    data.message
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
                resetEdit();
            } else {
                resetEdit();
                showErrorNotification(
                    'Update record failed',
                    data.message || 'Please Contact buyer for assistance'
                );
            }
        },
        onError: (error) => {
            resetEdit();
            showErrorNotification(
                'Update Failed',
                error instanceof Error ? error.message : 'Failed to update record'
            );
        },
    });

    const deleteBatchRecordMutation = useMutation({
        mutationFn: deleteBatchRecord,
        onSuccess: (data) => {
            console.log('Delete API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Record Deleted',
                    data.message
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
            } else {
                showErrorNotification(
                    'Delete Failed',
                    data.message || 'Failed to delete record'
                );
            }
        },
        onError: (error) => {
            showErrorNotification(
                'Delete Failed',
                error instanceof Error ? error.message : 'Failed to delete record'
            );
        },
    });

    const postBatchMutation = useMutation({
        mutationFn: postBatch,
        onSuccess: (data) => {
            console.log('POST API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Batch Posted',
                    data.message
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
                // Redirect to batch list page after successful post
                router.push('/batch');
            } else {
                showErrorNotification(
                    'Posting of batch failed',
                    data.message || 'Failed to post batch'
                );
            }
        },
        onError: (error) => {
            showErrorNotification(
                'Post batch failed',
                error instanceof Error ? error.message : 'Failed to post batch'
            );
        },
    });

    const handleDeleteRecord = (recordId: number) => {
        deleteBatchRecordMutation.mutate({
            record_id:recordId,
            request_type:PAGE_TYPE
        });
        // console.log(recordId);
    };

    const handleEditRecord = (record: any) => {
        // Store the record being edited
        console.log('record',record);
        setEditingRecord(record);

        // Populate edit form fields with record data (ensure cost and price are strings)
        setEditValue('barcode', record.barcode ? String(record.barcode) : '');
        setEditValue('sku', record.sku ? String(record.sku) : '');
        setEditValue('long_name', record.long_name || '');
        setEditValue('sku_status', record.sku_status || '');
        setEditValue('effectivity_date', record.effectivity_date ? new Date(record.effectivity_date) : null);
        setEditValue('cost', record.cost ? String(record.cost) : '');
        setEditValue('price', record.price ? String(record.price) : '');
        setEditValue('dept', record.dept || '');
        setEditValue('deptnm', record.deptnm || '');

        // Open edit modal
        setEditModalOpened(true);
    };

    const onEditSubmit = (data: ChangeItemStatusInput) => {
        console.log('Edit form submitted:', data);

        const formattedDate = data.effectivity_date instanceof Date
            ? data.effectivity_date.toISOString().split('T')[0]
            : data.effectivity_date;

        // Update the record with new data
        updateBatchRecordMutation.mutate({
            ...data,
            effectivity_date: formattedDate,
            batch_number: batchNumber,
            request_type: 'change_status',
            record_id: editingRecord?.id, // Include record ID for update
        });

        setEditModalOpened(false);
        setEditingRecord(null);
        resetEdit();
    };

    const handleCancelEdit = () => {
        setEditModalOpened(false);
        setEditingRecord(null);
        resetEdit();
    };

    const onSubmit = (data: ChangeItemStatusInput) => {
        console.log('Form submitted (validated by Zod):', data);

        setPendingFormData(data);
        setConfirmModalOpened(true);
    };

    const handleConfirmSave = () => {
        if (!pendingFormData || !batchNumber) return;

        // First, validate if barcode is already used
        validateBarcodeUsedMutation.mutate({
            barcode: pendingFormData.barcode,
            batchNumber: batchNumber,
            requestType: PAGE_TYPE
        });
    };

    const handleCancelSave = () => {
        setConfirmModalOpened(false);
        setPendingFormData(null);
    };

    const handleGoBack = () => {
        // Invalidate the batch records query to refresh the batch list
        queryClient.invalidateQueries({
            queryKey: ['BatchRecords']
        });
        router.push('/batch');
    };

    const handlePostBatch = () => {
        if (!batchRecords || batchRecords.length === 0) {
            showErrorNotification(
                'Cannot Post Batch',
                'Please encode at least one item before posting the batch.'
            );
            return;
        }
        setPostBatchModalOpened(true);
    }

    const handleConfirmPostBatch = () => {
        postBatchMutation.mutate({
            batch_number: batchNumber,
            request_type: PAGE_TYPE
        });
        setPostBatchModalOpened(false);
    };

    const handleCancelPostBatch = () => {
        setPostBatchModalOpened(false);
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
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'not to be reordered', label: 'Not to be Re-ordered' },
        { value: 'to be purged', label: 'To be Purged' },
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
                size="lg"
                rightSection={<IconCheck size={20} />}
                disabled={!batchRecords || batchRecords.length === 0}
                styles={{
                    root: {
                        backgroundColor: '#82c43c',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: rem(15),
                        paddingLeft: rem(24),
                        paddingRight: rem(24),
                        height: rem(44),
                        borderRadius: rem(8),
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(130, 196, 60, 0.3)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            backgroundColor: '#6fb32e',
                            boxShadow: '0 4px 12px rgba(130, 196, 60, 0.4)',
                            transform: 'translateY(-1px)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 6px rgba(130, 196, 60, 0.3)',
                        },
                        '&:disabled': {
                            backgroundColor: '#e9ecef',
                            color: '#adb5bd',
                            boxShadow: 'none',
                            cursor: 'not-allowed',
                        },
                    },
                }}
                onClick={handlePostBatch}
            >
                Post Batch
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

                {/* Conditional fields - only show when active status is selected */}
                {selectedStatus === 'active' && (
                    <>
                    <Grid.Col span={12}>
                        <Box>
                        <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                            NEW COST
                        </Text>
                        <Controller
                            name="cost"
                            control={control}
                            render={({ field }) => (
                            <TextInput
                                value={field.value || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Only allow digits and decimal point
                                    if (/^\d*\.?\d*$/.test(value)) {
                                        field.onChange(value);
                                    }
                                }}
                                placeholder="Enter new cost"
                                size="md"
                                error={errors.cost?.message}
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
                            NEW PRICE
                        </Text>
                        <Controller
                            name="price"
                            control={control}
                            render={({ field }) => (
                            <TextInput
                                value={field.value || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Only allow digits and decimal point
                                    if (/^\d*\.?\d*$/.test(value)) {
                                        field.onChange(value);
                                    }
                                }}
                                placeholder="Enter new price"
                                size="md"
                                error={errors.price?.message}
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
                    </>
                )}
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
                columns={getChangeStatusColumns({
                    onDelete: handleDeleteRecord,
                    onEdit: handleEditRecord
                })}
            />
        </Box>

        {/* Confirmation Modal */}
        <Modal
            opened={confirmModalOpened}
            onClose={handleCancelSave}
            title={
                <Group gap="xs">
                    <IconDeviceFloppy size={24} style={{ color: '#1971c2' }} />
                    <Text fw={700} size="lg">Confirm Save</Text>
                </Group>
            }
            centered
            size="md"
            styles={{
                title: {
                    width: '100%',
                },
            }}
        >
            <Stack gap="lg">
                <Text size="sm" c="dimmed">
                    You are about to save the encoded item details to this batch. This action will add the following record:
                </Text>

                {pendingFormData && (
                    <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>SKU:</Text>
                                <Text size="sm">{pendingFormData.sku || 'N/A'}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>Description:</Text>
                                <Text size="sm" style={{ maxWidth: '60%', textAlign: 'right' }}>
                                    {pendingFormData.long_name || 'N/A'}
                                </Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>New Status:</Text>
                                <Badge color="blue" variant="light">
                                    {pendingFormData.sku_status || 'N/A'}
                                </Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>Effectivity Date:</Text>
                                <Text size="sm">
                                    {pendingFormData.effectivity_date
                                        ? new Date(pendingFormData.effectivity_date).toLocaleDateString()
                                        : 'N/A'}
                                </Text>
                            </Group>
                            {pendingFormData.cost && (
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>New Cost:</Text>
                                    <Text size="sm">{pendingFormData.cost}</Text>
                                </Group>
                            )}
                            {pendingFormData.price && (
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>New Price:</Text>
                                    <Text size="sm">{pendingFormData.price}</Text>
                                </Group>
                            )}
                        </Stack>
                    </Paper>
                )}

                <Text size="sm" c="dimmed">
                    Do you want to proceed with saving this record?
                </Text>

                <Group justify="flex-end" gap="md" mt="md">
                    <Button
                        variant="light"
                        color="gray"
                        onClick={handleCancelSave}
                        disabled={validateBarcodeUsedMutation.isPending || saveBatchRecordMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="blue"
                        leftSection={<IconDeviceFloppy size={18} />}
                        onClick={handleConfirmSave}
                        loading={validateBarcodeUsedMutation.isPending || saveBatchRecordMutation.isPending}
                    >
                        Confirm & Save
                    </Button>
                </Group>
            </Stack>
        </Modal>

        {/* Edit Record Modal */}
        <Modal
            opened={editModalOpened}
            onClose={handleCancelEdit}
            title="Update Record"
            centered
            size="lg"
            styles={{
                title: {
                    fontSize: rem(18),
                    fontWeight: 700,
                    backgroundColor: '#50b5a4',
                    color: 'white',
                    margin: rem(-16),
                    marginBottom: rem(20),
                    padding: `${rem(16)} ${rem(20)}`,
                },
                header: {
                    backgroundColor: '#50b5a4',
                    marginBottom: 0,
                },
                body: {
                    padding: rem(20),
                },
            }}
        >
            <form onSubmit={handleEditSubmit(onEditSubmit)}>
                <Stack gap="lg">
                    {/* ITEM DETAILS Section */}
                    <Box>
                        <Text size="sm" fw={700} mb="md" c="#495057" tt="uppercase">
                            Item Details
                        </Text>

                        {/* Description */}
                        <Box mb="md">
                            <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                Description :
                            </Text>
                            <TextInput
                                value={editingRecord?.long_name || ''}
                                readOnly
                                size="md"
                                styles={{
                                    input: {
                                        border: '1px solid #dee2e6',
                                        borderRadius: rem(4),
                                        fontSize: rem(14),
                                        backgroundColor: '#f8f9fa',
                                        color: '#495057',
                                        textAlign: 'center',
                                    },
                                }}
                            />
                        </Box>

                        {/* UPC, SKU, Current Status in 3 columns */}
                        <Grid gutter="md">
                            <Grid.Col span={6}>
                                <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                    UPC :
                                </Text>
                                <TextInput
                                    value={editingRecord?.barcode || ''}
                                    readOnly
                                    size="md"
                                    styles={{
                                        input: {
                                            border: '1px solid #dee2e6',
                                            borderRadius: rem(4),
                                            fontSize: rem(14),
                                            backgroundColor: '#f8f9fa',
                                            color: '#495057',
                                        },
                                    }}
                                />
                            </Grid.Col>

                            <Grid.Col span={6}>
                                <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                    SKU :
                                </Text>
                                <TextInput
                                    value={editingRecord?.sku || ''}
                                    readOnly
                                    size="md"
                                    styles={{
                                        input: {
                                            border: '1px solid #dee2e6',
                                            borderRadius: rem(4),
                                            fontSize: rem(14),
                                            backgroundColor: '#f8f9fa',
                                            color: '#495057',
                                        },
                                    }}
                                />
                            </Grid.Col>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* UPDATE FIELDS Section */}
                    <Box>
                        <Text size="sm" fw={700} mb="md" c="#495057" tt="uppercase">
                            Update Fields
                        </Text>

                        <Grid gutter="md">
                            {/* Change SKU Status */}
                            <Grid.Col span={6}>
                                <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                    Change SKU Status :
                                </Text>
                                <Controller
                                    name="sku_status"
                                    control={editControl}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            placeholder="-- SELECT ITEM STATUS --"
                                            size="md"
                                            data={statusOptions}
                                            error={editErrors.sku_status?.message}
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
                            </Grid.Col>

                            {/* Effectivity Date */}
                            <Grid.Col span={6}>
                                <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                    Effectivity Date :
                                </Text>
                                <Controller
                                    name="effectivity_date"
                                    control={editControl}
                                    render={({ field }) => (
                                        <TextInput
                                            type="date"
                                            size="md"
                                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                            error={editErrors.effectivity_date?.message}
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
                            </Grid.Col>

                            {/* Conditional fields - only show when active status is selected */}
                            {editSelectedStatus === 'active' && (
                                <>
                                    <Grid.Col span={6}>
                                        <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                            New Cost :
                                        </Text>
                                        <Controller
                                            name="cost"
                                            control={editControl}
                                            render={({ field }) => (
                                                <TextInput
                                                    value={field.value || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Only allow digits and decimal point
                                                        if (/^\d*\.?\d*$/.test(value)) {
                                                            field.onChange(value);
                                                        }
                                                    }}
                                                    placeholder="Enter new cost"
                                                    size="md"
                                                    error={editErrors.cost?.message}
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
                                    </Grid.Col>

                                    <Grid.Col span={6}>
                                        <Text size="sm" fw={600} mb={rem(8)} c="#495057" tt="uppercase">
                                            New Price :
                                        </Text>
                                        <Controller
                                            name="price"
                                            control={editControl}
                                            render={({ field }) => (
                                                <TextInput
                                                    value={field.value || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Only allow digits and decimal point
                                                        if (/^\d*\.?\d*$/.test(value)) {
                                                            field.onChange(value);
                                                        }
                                                    }}
                                                    placeholder="Enter new price"
                                                    size="md"
                                                    error={editErrors.price?.message}
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
                                    </Grid.Col>
                                </>
                            )}
                        </Grid>
                    </Box>

                    {/* Action Buttons */}
                    <Group justify="flex-end" gap="md" mt="md">
                        <Button
                            variant="filled"
                            color="orange"
                            onClick={handleCancelEdit}
                            size="md"
                            styles={{
                                root: {
                                    backgroundColor: '#ff8c42',
                                    '&:hover': {
                                        backgroundColor: '#ff7829',
                                    },
                                },
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            type="submit"
                            color="cyan"
                            size="md"
                            loading={saveBatchRecordMutation.isPending}
                            styles={{
                                root: {
                                    backgroundColor: '#50b5a4',
                                    '&:hover': {
                                        backgroundColor: '#429a8c',
                                    },
                                },
                            }}
                        >
                            Update
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>

        {/* Post Batch Confirmation Modal */}
        <Modal
            opened={postBatchModalOpened}
            onClose={handleCancelPostBatch}
            title={
                <Group gap="xs">
                    <IconCheck size={24} style={{ color: '#82c43c' }} />
                    <Text fw={700} size="lg">Confirm Post Batch</Text>
                </Group>
            }
            centered
            size="md"
            styles={{
                title: {
                    width: '100%',
                },
            }}
        >
            <Stack gap="lg">
                <Text size="sm" c="dimmed">
                    You are about to post this batch. Once posted, the batch will be submitted and no further changes can be made.
                </Text>

                <Paper p="md" withBorder style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
                    <Group gap="xs" mb="xs">
                        <Text size="sm" fw={700} c="#856404">
                            Warning:
                        </Text>
                    </Group>
                    <Text size="sm" c="#856404">
                        This action will finalize the batch and all encoded records. Make sure all records are correct before proceeding.
                    </Text>
                </Paper>

                <Box>
                    <Text size="sm" fw={600} mb="xs">Batch Details:</Text>
                    <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>Batch Number:</Text>
                                <Text size="sm">{batchNumber}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>Request Type:</Text>
                                <Badge color="blue" variant="light">CHANGE STATUS</Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" fw={600}>Total Records:</Text>
                                <Badge color="gray" variant="filled">{batchRecords?.length || 0}</Badge>
                            </Group>
                        </Stack>
                    </Paper>
                </Box>

                <Text size="sm" c="dimmed" fw={600}>
                    Do you want to proceed with posting this batch?
                </Text>

                <Group justify="flex-end" gap="md" mt="md">
                    <Button
                        variant="light"
                        color="gray"
                        onClick={handleCancelPostBatch}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="green"
                        leftSection={<IconCheck size={18} />}
                        onClick={handleConfirmPostBatch}
                        loading={postBatchMutation.isPending}
                        styles={{
                            root: {
                                backgroundColor: '#82c43c',
                                '&:hover': {
                                    backgroundColor: '#6fb32e',
                                },
                            },
                        }}
                    >
                        Confirm & Post Batch
                    </Button>
                </Group>
            </Stack>
        </Modal>
        </Box>
    );
}

export default function ChangeItemStatusPage() {
    return (
        <Suspense fallback={
            <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
                <Text>Loading...</Text>
            </Box>
        }>
            <ChangeItemStatusContent />
        </Suspense>
    );
}
