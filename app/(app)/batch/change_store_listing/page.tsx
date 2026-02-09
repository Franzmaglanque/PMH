'use client';

import {
  Paper,
  Title,
  Text,
  TextInput,
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
  Table,
  ActionIcon,
  ScrollArea,
  Checkbox,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { barcodeFetchDetails, fetchBatchRecords, saveBatchRecord, deleteBatchRecord, updateBatchRecord, postBatch, validateBarcodeUsed } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { StyledDataTable } from '@/lib/dataTableHelper';
import { changeStoreListingSchema, type ChangeStoreListingInput, type StoreListingEntry } from '@/lib/schemas/batch.schema';
import { getChangeStoreListingColumns } from '@/components/Columns/Change_store_listing';

// Mock store data - In production, this would come from an API
const AVAILABLE_STORES = [
  { value: 'STORE001', label: 'Puregold Caloocan' },
  { value: 'STORE002', label: 'Puregold Fairview' },
  { value: 'STORE003', label: 'Puregold Quezon Ave' },
  { value: 'STORE004', label: 'Puregold Cubao' },
  { value: 'STORE005', label: 'Puregold Makati' },
  { value: 'STORE006', label: 'Puregold Taguig' },
  { value: 'STORE007', label: 'Puregold Pasig' },
  { value: 'STORE008', label: 'Puregold Mandaluyong' },
];

function ChangeStoreListingContent() {
    const PAGE_TYPE = 'change_store_listing';
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const batchNumber = searchParams.get('batch_number');
    const [confirmModalOpened, setConfirmModalOpened] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<ChangeStoreListingInput | null>(null);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [postBatchModalOpened, setPostBatchModalOpened] = useState(false);

    // Dual list box state
    const [availableStores, setAvailableStores] = useState(AVAILABLE_STORES);
    const [selectedStores, setSelectedStores] = useState<typeof AVAILABLE_STORES>([]);
    const [checkedAvailable, setCheckedAvailable] = useState<string[]>([]);
    const [checkedSelected, setCheckedSelected] = useState<string[]>([]);
    const [globalAction, setGlobalAction] = useState<'add' | 'deduct'>('add');

    const { data: batchRecords, isLoading: isLoadingRecords, isFetching: isFetchingRecords } = useQuery({
        queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
        queryFn: () => fetchBatchRecords(batchNumber!, PAGE_TYPE),
        enabled: !!batchNumber,
        retry: false,
    });

    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
        watch,
    } = useForm<ChangeStoreListingInput>({
        resolver: zodResolver(changeStoreListingSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            long_name: '',
            dept: '',
            deptnm: '',
            store_listings: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'store_listings',
    });

    // Separate form for editing records
    const {
        control: editControl,
        handleSubmit: handleEditSubmit,
        setValue: setEditValue,
        reset: resetEdit,
        formState: { errors: editErrors },
    } = useForm<ChangeStoreListingInput>({
        resolver: zodResolver(changeStoreListingSchema),
    });

    const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
        control: editControl,
        name: 'store_listings',
    });

    const validateBarcodeMutation = useMutation({
        mutationFn: ({ barcode, batchNumber }: { barcode: string; batchNumber: string }) =>
            barcodeFetchDetails(barcode, batchNumber),
        onSuccess: (data) => {
            if (data.status) {
                showSuccessNotification(
                    'Barcode Validated',
                    data.message || 'Item details have been loaded successfully'
                );
                setValue('sku', data.sku);
                setValue('long_name', data.description);
                setValue('dept', data.dept);
                setValue('deptnm', data.deptnm);
            } else {
                reset();
                showErrorNotification(
                    'Validation Failed',
                    data.message || 'The barcode could not be validated'
                );
            }
        },
        onError: (error) => {
            reset();
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
            if (data.status) {
                showErrorNotification(
                    data.title || 'Barcode Already Used',
                    data.message || 'This barcode is already used in another batch'
                );
                setConfirmModalOpened(false);
                setPendingFormData(null);
            } else {
                if (pendingFormData) {
                    saveBatchRecordMutation.mutate({
                        ...pendingFormData,
                        batch_number: batchNumber,
                        request_type: PAGE_TYPE
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
            if (data.status) {
                showSuccessNotification(
                    'Record Saved',
                    data.message || 'Store listing has been saved successfully'
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
                    data.message || 'Please contact buyer for assistance'
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
            if (data.status) {
                showSuccessNotification(
                    'Record Updated',
                    data.message || 'Store listing has been updated successfully'
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
                resetEdit();
                setEditModalOpened(false);
                setEditingRecord(null);
            } else {
                showErrorNotification(
                    'Update record failed',
                    data.message || 'Please contact buyer for assistance'
                );
            }
        },
        onError: (error) => {
            showErrorNotification(
                'Update Failed',
                error instanceof Error ? error.message : 'Failed to update record'
            );
        },
    });

    const deleteBatchRecordMutation = useMutation({
        mutationFn: deleteBatchRecord,
        onSuccess: (data) => {
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
            if (data.status) {
                showSuccessNotification(
                    'Batch Posted',
                    data.message
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
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
            record_id: recordId,
            request_type: PAGE_TYPE
        });
    };

    const handleEditRecord = (record: any) => {
        setEditingRecord(record);
        setEditValue('barcode', record.barcode ? String(record.barcode) : '');
        setEditValue('sku', record.sku ? String(record.sku) : '');
        setEditValue('long_name', record.long_name || '');
        setEditValue('dept', record.dept || '');
        setEditValue('deptnm', record.deptnm || '');
        setEditValue('store_listings', record.store_listings || []);
        setEditModalOpened(true);
    };

    const onEditSubmit = (data: ChangeStoreListingInput) => {
        updateBatchRecordMutation.mutate({
            ...data,
            batch_number: batchNumber,
            request_type: PAGE_TYPE,
            record_id: editingRecord?.id,
        });
    };

    const handleCancelEdit = () => {
        setEditModalOpened(false);
        setEditingRecord(null);
        resetEdit();
    };

    const onSubmit = (data: ChangeStoreListingInput) => {
        setPendingFormData(data);
        setConfirmModalOpened(true);
    };

    const handleConfirmSave = () => {
        if (!pendingFormData || !batchNumber) return;

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
    };

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

    const validateUpc = useDebouncedInput((upcValue: string) => {
        if (upcValue && upcValue.length > 0) {
            validateBarcodeMutation.mutate({
                barcode: upcValue,
                batchNumber: batchNumber || '',
            });
        }
    }, 800);

    const handleMoveToSelected = () => {
        const storesToMove = availableStores.filter(s => checkedAvailable.includes(s.value));
        setSelectedStores([...selectedStores, ...storesToMove]);
        setAvailableStores(availableStores.filter(s => !checkedAvailable.includes(s.value)));
        setCheckedAvailable([]);
    };

    const handleMoveToAvailable = () => {
        const storesToMove = selectedStores.filter(s => checkedSelected.includes(s.value));
        setAvailableStores([...availableStores, ...storesToMove]);
        setSelectedStores(selectedStores.filter(s => !checkedSelected.includes(s.value)));
        setCheckedSelected([]);
    };

    const handleAddStoresToBatch = () => {
        if (selectedStores.length === 0) {
            showErrorNotification('No Stores Selected', 'Please select at least one store');
            return;
        }

        // Add all selected stores with the global action
        selectedStores.forEach(store => {
            // Check if store already exists in the list
            const existingStoreIndex = fields.findIndex(f => f.store_code === store.value);
            if (existingStoreIndex === -1) {
                append({
                    store_code: store.value,
                    store_name: store.label,
                    action: globalAction,
                });
            }
        });

        // Move selected stores back to available
        setAvailableStores([...availableStores, ...selectedStores]);
        setSelectedStores([]);
        setGlobalAction('add');
    };

    // Update available stores when fields change (to filter out already added stores)
    useEffect(() => {
        const addedStoreCodes = fields.map(f => f.store_code);
        const filteredAvailable = AVAILABLE_STORES.filter(store =>
            !addedStoreCodes.includes(store.value) &&
            !selectedStores.some(s => s.value === store.value)
        );
        setAvailableStores(filteredAvailable);
    }, [fields, selectedStores]);

    return (
        <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
            {/* Header Section */}
            <Box mb="xl">
                <Group justify="space-between" align="center" mb="md">
                    <Title order={1} size="h2" fw={700}>
                        BATCH # {batchNumber || 'N/A'}
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
                    <Badge color="blue" variant="filled" size="sm">CHANGE STORE LISTING</Badge>
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
                                                    if (/^\d*$/.test(value)) {
                                                        field.onChange(value);
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
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Store Listings Section */}
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
                            STORE LISTINGS
                        </Title>

                        {/* Step 1: Select Stores Using Dual List Box */}
                        <Paper p="md" withBorder mb="md" style={{ backgroundColor: 'white' }}>
                            <Text size="sm" fw={700} mb="md" c="#495057">
                                STEP 1: SELECT STORES (USE CHECKBOXES AND ARROWS TO MOVE)
                            </Text>
                            <Grid gutter="md">
                                {/* Available Stores List */}
                                <Grid.Col span={5}>
                                    <Paper withBorder>
                                        <Box p="xs" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                            <Text size="sm" fw={600} c="#495057">
                                                Available Stores ({availableStores.length})
                                            </Text>
                                        </Box>
                                        <ScrollArea h={300} type="auto">
                                            <Stack gap={0}>
                                                {availableStores.map((store) => (
                                                    <Box
                                                        key={store.value}
                                                        p="xs"
                                                        style={{
                                                            borderBottom: '1px solid #f0f0f0',
                                                            backgroundColor: checkedAvailable.includes(store.value) ? '#e7f5ff' : 'white',
                                                        }}
                                                    >
                                                        <Checkbox
                                                            label={
                                                                <Box>
                                                                    <Text size="xs" c="dimmed">{store.value}</Text>
                                                                    <Text size="sm">{store.label}</Text>
                                                                </Box>
                                                            }
                                                            checked={checkedAvailable.includes(store.value)}
                                                            onChange={(e) => {
                                                                if (e.currentTarget.checked) {
                                                                    setCheckedAvailable([...checkedAvailable, store.value]);
                                                                } else {
                                                                    setCheckedAvailable(checkedAvailable.filter(v => v !== store.value));
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                                {availableStores.length === 0 && (
                                                    <Text size="sm" c="dimmed" p="md" ta="center">
                                                        No available stores
                                                    </Text>
                                                )}
                                            </Stack>
                                        </ScrollArea>
                                    </Paper>
                                </Grid.Col>

                                {/* Transfer Buttons */}
                                <Grid.Col span={2}>
                                    <Stack justify="center" h="100%" gap="md">
                                        <Button
                                            fullWidth
                                            onClick={handleMoveToSelected}
                                            disabled={checkedAvailable.length === 0}
                                            size="sm"
                                        >
                                            &gt;&gt;
                                        </Button>
                                        <Button
                                            fullWidth
                                            onClick={handleMoveToAvailable}
                                            disabled={checkedSelected.length === 0}
                                            size="sm"
                                        >
                                            &lt;&lt;
                                        </Button>
                                    </Stack>
                                </Grid.Col>

                                {/* Selected Stores List */}
                                <Grid.Col span={5}>
                                    <Paper withBorder>
                                        <Box p="xs" style={{ backgroundColor: '#d3f9d8', borderBottom: '1px solid #dee2e6' }}>
                                            <Text size="sm" fw={600} c="#2b8a3e">
                                                Selected Stores ({selectedStores.length})
                                            </Text>
                                        </Box>
                                        <ScrollArea h={300} type="auto">
                                            <Stack gap={0}>
                                                {selectedStores.map((store) => (
                                                    <Box
                                                        key={store.value}
                                                        p="xs"
                                                        style={{
                                                            borderBottom: '1px solid #f0f0f0',
                                                            backgroundColor: checkedSelected.includes(store.value) ? '#e7f5ff' : 'white',
                                                        }}
                                                    >
                                                        <Checkbox
                                                            label={
                                                                <Box>
                                                                    <Text size="xs" c="dimmed">{store.value}</Text>
                                                                    <Text size="sm">{store.label}</Text>
                                                                </Box>
                                                            }
                                                            checked={checkedSelected.includes(store.value)}
                                                            onChange={(e) => {
                                                                if (e.currentTarget.checked) {
                                                                    setCheckedSelected([...checkedSelected, store.value]);
                                                                } else {
                                                                    setCheckedSelected(checkedSelected.filter(v => v !== store.value));
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                                {selectedStores.length === 0 && (
                                                    <Text size="sm" c="dimmed" p="md" ta="center">
                                                        No stores selected
                                                    </Text>
                                                )}
                                            </Stack>
                                        </ScrollArea>
                                    </Paper>
                                </Grid.Col>
                                            </Grid>
                        </Paper>

                        {/* Step 2: Select Action */}
                        {selectedStores.length > 0 && (
                            <Paper p="md" withBorder mb="lg" style={{ backgroundColor: '#d3f9d8' }}>
                                <Text size="sm" fw={700} mb="md" c="#2b8a3e">
                                    STEP 2: SELECT ACTION FOR {selectedStores.length} SELECTED STORE{selectedStores.length !== 1 ? 'S' : ''}
                                </Text>
                                <Group gap="md" mb="md">
                                    <Button
                                        variant={globalAction === 'add' ? 'filled' : 'outline'}
                                        color="green"
                                        onClick={() => setGlobalAction('add')}
                                        size="md"
                                        style={{ flex: 1 }}
                                    >
                                        Add to Listing
                                    </Button>
                                    <Button
                                        variant={globalAction === 'deduct' ? 'filled' : 'outline'}
                                        color="red"
                                        onClick={() => setGlobalAction('deduct')}
                                        size="md"
                                        style={{ flex: 1 }}
                                    >
                                        Remove from Listing
                                    </Button>
                                </Group>
                                <Button
                                    fullWidth
                                    leftSection={<IconPlus size={18} />}
                                    onClick={handleAddStoresToBatch}
                                    size="md"
                                    color="blue"
                                >
                                    Add {selectedStores.length} Store{selectedStores.length !== 1 ? 's' : ''} to List
                                </Button>
                            </Paper>
                        )}

                        {/* Store Listings Table */}
                        {fields.length > 0 ? (
                            <Paper withBorder>
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Store Code</Table.Th>
                                            <Table.Th>Store Name</Table.Th>
                                            <Table.Th>Action</Table.Th>
                                            <Table.Th style={{ width: 100, textAlign: 'center' }}>Remove</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {fields.map((field, index) => (
                                            <Table.Tr key={field.id}>
                                                <Table.Td>{field.store_code}</Table.Td>
                                                <Table.Td>{field.store_name}</Table.Td>
                                                <Table.Td>
                                                    <Badge color={field.action === 'add' ? 'green' : 'red'} variant="light">
                                                        {field.action === 'add' ? 'Add to Listing' : 'Remove from Listing'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'center' }}>
                                                    <ActionIcon
                                                        color="red"
                                                        variant="light"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Paper>
                        ) : (
                            <Paper p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                                <Text size="sm" c="dimmed" ta="center">
                                    No stores added yet. Select stores above to add them.
                                </Text>
                            </Paper>
                        )}

                        {errors.store_listings && (
                            <Text size="sm" c="red" mt="xs">
                                {errors.store_listings.message}
                            </Text>
                        )}
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
                    isLoading={isLoadingRecords || isFetchingRecords}
                    emptyMessage="No encoded records yet."
                    columns={getChangeStoreListingColumns({
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
            >
                <Stack gap="lg">
                    <Text size="sm" c="dimmed">
                        You are about to save the store listing changes to this batch.
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
                                    <Text size="sm" fw={600}>Stores Affected:</Text>
                                    <Badge color="blue" variant="light">
                                        {pendingFormData.store_listings?.length || 0}
                                    </Badge>
                                </Group>
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
            >
                <Stack gap="lg">
                    <Text size="sm" c="dimmed">
                        You are about to post this batch. Once posted, the batch will be submitted and no further changes can be made.
                    </Text>

                    <Paper p="md" withBorder style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
                        <Text size="sm" c="#856404">
                            <strong>Warning:</strong> This action will finalize the batch and all encoded records.
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
                                    <Badge color="blue" variant="light">CHANGE STORE LISTING</Badge>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Total Records:</Text>
                                    <Badge color="gray" variant="filled">{batchRecords?.length || 0}</Badge>
                                </Group>
                            </Stack>
                        </Paper>
                    </Box>

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

export default function ChangeStoreListingPage() {
    return (
        <Suspense fallback={
            <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
                <Text>Loading...</Text>
            </Box>
        }>
            <ChangeStoreListingContent />
        </Suspense>
    );
}
