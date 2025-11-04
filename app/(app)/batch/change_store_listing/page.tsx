'use client';

import {
  Paper,
  Title,
  Text,
  TextInput,
  Textarea,
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
  Radio,
  MultiSelect,
  FileInput,
  Alert,
  Anchor,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck, IconUpload, IconDownload, IconAlertCircle } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { barcodeFetchDetails, fetchBatchRecords, saveBatchRecord, deleteBatchRecord, updateBatchRecord, postBatch, validateBarcodeUsed, fetchStores, fetchStoreListingTemplate } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification, showWarningNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { StyledDataTable } from '@/lib/dataTableHelper';
import { changeStoreListingSchema, type ChangeStoreListingInput } from '@/lib/schemas/change_store_listing.schema';
import { getChangeStoreListingColumns } from '@/components/Columns/Change_store_listing';
import { parseStoresFromExcel, validateStoreCodes, downloadBlobFile } from '@/lib/excelHelper';

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
    const [storesFile, setStoresFile] = useState<File | null>(null);
    const [uploadedStores, setUploadedStores] = useState<string[]>([]);
    const [fileParseError, setFileParseError] = useState<string>('');

    // Fetch batch records
    const { data: batchRecords, isLoading: isLoadingRecords, isFetching: isFetchingRecords } = useQuery({
        queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
        queryFn: () => fetchBatchRecords(batchNumber!, PAGE_TYPE as any),
        enabled: !!batchNumber,
        retry: false,
    });

    // Fetch stores list
    const { data: storesData, isLoading: isLoadingStores } = useQuery({
        queryKey: ['stores'],
        queryFn: fetchStores,
        retry: false,
    });

    // Transform stores data for MultiSelect
    const storeOptions = storesData?.data?.map((store: any) => ({
        value: store.store_code || store.id?.toString(),
        label: `${store.store_code || store.id} - ${store.store_name || store.name}`,
    })) || [];

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
            current_description: '',
            current_store_count: 0,
            action_type: undefined,
            input_method: 'manual',
            stores: [],
            stores_file: null,
            dept: '',
            deptnm: '',
        },
    });

    // Watch input method to show/hide appropriate fields
    const inputMethod = watch('input_method');

    // Separate form for editing records
    const {
        control: editControl,
        handleSubmit: handleEditSubmit,
        setValue: setEditValue,
        reset: resetEdit,
        formState: { errors: editErrors },
    } = useForm<ChangeStoreListingInput>({
        resolver: zodResolver(changeStoreListingSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            current_description: '',
            current_store_count: 0,
            action_type: undefined,
            stores: [],
            dept: '',
            deptnm: '',
        },
    });

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
                setValue('sku', data.sku);
                setValue('current_description', data.description);
                setValue('current_store_count', data.store_count || 0);
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
            console.log('Validate Barcode Used Response:', data);

            if (data.status) {
                showErrorNotification(
                    data.title || 'Barcode Already Used',
                    data.message || 'This barcode is already used in another batch'
                );
                setConfirmModalOpened(false);
                setPendingFormData(null);
            } else {
                if (pendingFormData) {
                    console.log('pendingFormData',pendingFormData);
                    saveBatchRecordMutation.mutate({
                        long_name: pendingFormData.current_description,
                        barcode: pendingFormData.barcode,
                        sku: pendingFormData.sku,
                        dept: pendingFormData.dept || '',
                        deptnm: pendingFormData.deptnm || '',
                        action_type: pendingFormData.action_type,
                        stores: pendingFormData.stores,
                        batch_number: batchNumber || '',
                        request_type: PAGE_TYPE,
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
            console.log('API Response:', data);

            if (data.status) {
                showSuccessNotification(
                    'Item Updated',
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
                    data.message || 'Please contact buyer for assistance'
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
                router.push(`/batch?request_type=${PAGE_TYPE}`);
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
        setEditValue('current_description', record.long_name || '');
        setEditValue('action_type', record.action_type);
        setEditValue('stores', Array.isArray(record.stores) ? record.stores : (record.stores || '').split(',').filter(Boolean));
        setEditValue('dept', record.dept || '');
        setEditValue('deptnm', record.deptnm || '');
        setEditModalOpened(true);
    };

    const onEditSubmit = (data: ChangeStoreListingInput) => {
        console.log('Edit form submitted:', data);

        updateBatchRecordMutation.mutate({
            barcode: data.barcode,
            sku: data.sku,
            dept: data.dept || '',
            deptnm: data.deptnm || '',
            action_type: data.action_type,
            stores: data.stores,
            batch_number: batchNumber || '',
            request_type: PAGE_TYPE,
            record_id: editingRecord?.id,
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

    const onSubmit = (data: ChangeStoreListingInput) => {
        console.log('Form submitted (validated by Zod):', data);

        // If upload method, use uploaded stores instead of manual selection
        if (data.input_method === 'upload') {
            const dataWithUploadedStores = {
                ...data,
                stores: uploadedStores,
            };
            setPendingFormData(dataWithUploadedStores);
        } else {
            setPendingFormData(data);
        }

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
        router.push('/batch?request_type=change_store_listing');
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

    const validateUpc = useDebouncedInput((upcValue: string) => {
        if (upcValue && upcValue.length > 0) {
            validateBarcodeMutation.mutate({
                barcode: upcValue,
                batchNumber: batchNumber || '',
            });
        }
    }, 800);

    // Handle file upload and parsing
    const handleFileChange = async (file: File | null) => {

        setStoresFile(file);
        setFileParseError('');
        setUploadedStores([]);

        if (!file) {
            setValue('stores_file', null);
            return;
        }

        try {
            const stores = await parseStoresFromExcel(file);
            const { valid, invalid } = validateStoreCodes(stores);


            if (invalid.length > 0) {
                showWarningNotification(
                    'Some Store Codes Invalid',
                    `${invalid.length} invalid store code(s) were skipped. ${valid.length} valid stores loaded.`
                );
            }

            if (valid.length === 0) {
                setFileParseError('No valid store codes found in the file.');
                setStoresFile(null);
                setValue('stores_file', null);
                return;
            }

            setUploadedStores(valid);
            setValue('stores_file', file);
            showSuccessNotification(
                'File Parsed Successfully',
                `${valid.length} store code(s) loaded from file.`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
            setFileParseError(errorMessage);
            setStoresFile(null);
            setValue('stores_file', null);
            showErrorNotification('File Parse Error', errorMessage);
        }
    };

    // Handle template download from Laravel API
    const handleDownloadTemplate = async () => {
        try {
            const blob = await fetchStoreListingTemplate();
            downloadBlobFile(blob, 'store_listing_template.xlsx');

            showSuccessNotification(
                'Template Downloaded',
                'Excel template has been downloaded to your computer.'
            );
        } catch (error) {
            showErrorNotification(
                'Download Failed',
                error instanceof Error ? error.message : 'Failed to download template'
            );
        }
    };

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
                    <Badge color="orange" variant="filled" size="sm">CHANGE STORE LISTING</Badge>
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
                    {/* Item Information Section */}
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
                            ITEM INFORMATION
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
                                    <Textarea
                                        placeholder=""
                                        size="md"
                                        readOnly
                                        minRows={2}
                                        {...register('current_description')}
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
                                        CURRENT STORE COUNT
                                    </Text>
                                    <TextInput
                                        placeholder=""
                                        size="md"
                                        readOnly
                                        value={watch('current_store_count')?.toString() || '0'}
                                        styles={{
                                            input: {
                                                border: '1px solid #dee2e6',
                                                borderRadius: rem(4),
                                                fontSize: rem(14),
                                                backgroundColor: '#fff3cd',
                                                color: '#856404',
                                                fontWeight: 600,
                                            },
                                        }}
                                        rightSection={
                                            <Badge color="orange" variant="filled" size="sm">
                                                Stores
                                            </Badge>
                                        }
                                    />
                                    <Text size="xs" c="dimmed" mt={rem(4)}>
                                        This shows the current number of stores where this item is listed
                                    </Text>
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
                                        ACTION TYPE <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="action_type"
                                        control={control}
                                        render={({ field }) => (
                                            <Radio.Group
                                                {...field}
                                                error={errors.action_type?.message}
                                            >
                                                <Stack gap="md" mt="xs">
                                                    <Paper p="md" withBorder style={{
                                                        backgroundColor: field.value === 'add' ? '#d3f9d8' : '#f8f9fa',
                                                        borderColor: field.value === 'add' ? '#51cf66' : '#dee2e6',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => field.onChange('add')}
                                                    >
                                                        <Radio
                                                            value="add"
                                                            label={
                                                                <Box>
                                                                    <Group gap="xs">
                                                                        <Text fw={600} c="#2b8a3e">ADD</Text>
                                                                        <Badge color="green" size="xs">Expand Listing</Badge>
                                                                    </Group>
                                                                    <Text size="xs" c="dimmed" mt={4}>
                                                                        Add selected stores to the existing store listing
                                                                    </Text>
                                                                </Box>
                                                            }
                                                        />
                                                    </Paper>
                                                    <Paper p="md" withBorder style={{
                                                        backgroundColor: field.value === 'remove' ? '#ffe3e3' : '#f8f9fa',
                                                        borderColor: field.value === 'remove' ? '#ff6b6b' : '#dee2e6',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => field.onChange('remove')}
                                                    >
                                                        <Radio
                                                            value="remove"
                                                            label={
                                                                <Box>
                                                                    <Group gap="xs">
                                                                        <Text fw={600} c="#c92a2a">REMOVE</Text>
                                                                        <Badge color="red" size="xs">Reduce Listing</Badge>
                                                                    </Group>
                                                                    <Text size="xs" c="dimmed" mt={4}>
                                                                        Remove selected stores from the current listing
                                                                    </Text>
                                                                </Box>
                                                            }
                                                        />
                                                    </Paper>
                                                    <Paper p="md" withBorder style={{
                                                        backgroundColor: field.value === 'replace' ? '#e7f5ff' : '#f8f9fa',
                                                        borderColor: field.value === 'replace' ? '#339af0' : '#dee2e6',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => field.onChange('replace')}
                                                    >
                                                        <Radio
                                                            value="replace"
                                                            label={
                                                                <Box>
                                                                    <Group gap="xs">
                                                                        <Text fw={600} c="#1971c2">Modify</Text>
                                                                        <Badge color="blue" size="xs">Complete Override</Badge>
                                                                    </Group>
                                                                    <Text size="xs" c="dimmed" mt={4}>
                                                                        Replace entire store listing with selected stores
                                                                    </Text>
                                                                </Box>
                                                            }
                                                        />
                                                    </Paper>
                                                </Stack>
                                            </Radio.Group>
                                        )}
                                    />
                                </Box>
                            </Grid.Col>

                            <Grid.Col span={12}>
                                <Box>
                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                        INPUT METHOD <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="input_method"
                                        control={control}
                                        render={({ field }) => (
                                            <Radio.Group
                                                {...field}
                                                error={errors.input_method?.message}
                                            >
                                                <Group mt="xs">
                                                    <Radio value="manual" label="Manual Selection" />
                                                    <Radio value="upload" label="Upload Excel File" />
                                                </Group>
                                            </Radio.Group>
                                        )}
                                    />
                                </Box>
                            </Grid.Col>

                            {/* Manual Selection */}
                            {inputMethod === 'manual' && (
                                <Grid.Col span={12}>
                                    <Box>
                                        <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                            SELECT STORES <span style={{ color: 'red' }}>*</span>
                                        </Text>
                                        <Controller
                                            name="stores"
                                            control={control}
                                            render={({ field }) => (
                                                <MultiSelect
                                                    {...field}
                                                    data={storeOptions}
                                                    placeholder="Search and select stores"
                                                    searchable
                                                    clearable
                                                    size="md"
                                                    disabled={isLoadingStores}
                                                    error={errors.stores?.message}
                                                    styles={{
                                                        input: {
                                                            border: '1px solid #dee2e6',
                                                            borderRadius: rem(4),
                                                            fontSize: rem(14),
                                                        },
                                                    }}
                                                    maxDropdownHeight={300}
                                                />
                                            )}
                                        />
                                        <Text size="xs" c="dimmed" mt={rem(4)}>
                                            You can select multiple stores. Use the search box to filter stores.
                                        </Text>
                                        {watch('stores') && watch('stores')!.length > 0 && (
                                            <Text size="xs" fw={600} mt={rem(8)} c="blue">
                                                {watch('stores')!.length} store(s) selected
                                            </Text>
                                        )}
                                    </Box>
                                </Grid.Col>
                            )}

                            {/* File Upload */}
                            {inputMethod === 'upload' && (
                                <Grid.Col span={12}>
                                    <Box>
                                        <Group justify="space-between" align="center" mb={rem(8)}>
                                            <Text size="sm" fw={600} c="#495057">
                                                UPLOAD EXCEL FILE <span style={{ color: 'red' }}>*</span>
                                            </Text>
                                            <Anchor
                                                size="xs"
                                                c="blue"
                                                onClick={handleDownloadTemplate}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Group gap={4}>
                                                    <IconDownload size={14} />
                                                    <span>Download Template</span>
                                                </Group>
                                            </Anchor>
                                        </Group>
                                        <FileInput
                                            placeholder="Choose Excel or CSV file"
                                            size="md"
                                            accept=".csv,.xlsx,.xls"
                                            leftSection={<IconUpload size={18} />}
                                            value={storesFile}
                                            onChange={handleFileChange}
                                            clearable
                                            error={fileParseError || errors.stores_file?.message?.toString()}
                                            styles={{
                                                input: {
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: rem(4),
                                                    fontSize: rem(14),
                                                },
                                            }}
                                        />
                                        <Text size="xs" c="dimmed" mt={rem(4)}>
                                            Upload a CSV or Excel file with store codes in the first column
                                        </Text>
                                        {/* {uploadedStores.length > 0 && (
                                            <Alert
                                                icon={<IconCheck size={16} />}
                                                color="green"
                                                variant="light"
                                                mt="md"
                                            >
                                                <Stack gap="xs">
                                                    <Text size="sm" fw={600}>
                                                        {uploadedStores.length} store(s) loaded from file
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        Preview: {uploadedStores.slice(0, 5).join(', ')}
                                                        {uploadedStores.length > 5 && ` and ${uploadedStores.length - 5} more...`}
                                                    </Text>
                                                </Stack>
                                            </Alert>
                                        )} */}
                                    </Box>
                                </Grid.Col>
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
                                        backgroundColor: '#fd7e14',
                                        '&:hover': {
                                            backgroundColor: '#e8590c',
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
                        <IconDeviceFloppy size={24} style={{ color: '#fd7e14' }} />
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
                        You are about to save the store listing changes. This action will update the item's store listing:
                    </Text>

                    {pendingFormData && (
                        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>SKU:</Text>
                                    <Text size="sm">{pendingFormData.sku || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Action:</Text>
                                    <Badge
                                        color={
                                            pendingFormData.action_type === 'add' ? 'green' :
                                            pendingFormData.action_type === 'remove' ? 'red' : 'blue'
                                        }
                                        variant="light"
                                    >
                                        {pendingFormData.action_type?.toUpperCase()}
                                    </Badge>
                                </Group>
                                <Group justify="space-between" align="flex-start">
                                    <Text size="sm" fw={600}>Stores:</Text>
                                    <Text size="sm" style={{ maxWidth: '70%', textAlign: 'right' }}>
                                        {Array.isArray(pendingFormData.stores)
                                            ? pendingFormData.stores.join(', ')
                                            : 'N/A'}
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Store Count:</Text>
                                    <Badge color="orange" variant="filled">
                                        {Array.isArray(pendingFormData.stores)
                                            ? pendingFormData.stores.length
                                            : 0}
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
                            color="orange"
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
                                    <Badge color="orange" variant="light">CHANGE STORE LISTING</Badge>
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

            {/* Edit Record Modal */}
            <Modal
                opened={editModalOpened}
                onClose={handleCancelEdit}
                title="Update Record"
                centered
                size="xl"
                styles={{
                    title: {
                        fontSize: rem(18),
                        fontWeight: 700,
                        backgroundColor: '#fd7e14',
                        color: 'white',
                        margin: rem(-16),
                        marginBottom: rem(20),
                        padding: `${rem(16)} ${rem(20)}`,
                    },
                    header: {
                        backgroundColor: '#fd7e14',
                        marginBottom: 0,
                    },
                    body: {
                        padding: rem(20),
                    },
                }}
            >
                <form onSubmit={handleEditSubmit(onEditSubmit)}>
                    <Stack gap="lg">
                        {/* Read-only Item Information */}
                        <Box>
                            <Text size="sm" fw={700} mb="md" c="#495057" tt="uppercase">
                                Item Information
                            </Text>
                            <Grid gutter="md">
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Text size="xs" fw={600} mb={rem(6)} c="dimmed">
                                        UPC
                                    </Text>
                                    <Controller
                                        name="barcode"
                                        control={editControl}
                                        render={({ field }) => (
                                            <TextInput
                                                {...field}
                                                size="sm"
                                                readOnly
                                                styles={{
                                                    input: {
                                                        backgroundColor: '#f8f9fa',
                                                        color: '#6c757d',
                                                        fontWeight: 500,
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Text size="xs" fw={600} mb={rem(6)} c="dimmed">
                                        SKU
                                    </Text>
                                    <Controller
                                        name="sku"
                                        control={editControl}
                                        render={({ field }) => (
                                            <TextInput
                                                {...field}
                                                size="sm"
                                                readOnly
                                                styles={{
                                                    input: {
                                                        backgroundColor: '#f8f9fa',
                                                        color: '#6c757d',
                                                        fontWeight: 500,
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                </Grid.Col>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* Editable Update Fields */}
                        <Box>
                            <Text size="sm" fw={700} mb="md" c="#495057" tt="uppercase">
                                Update Fields
                            </Text>
                            <Stack gap="md">
                                {/* Action Type */}
                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        Action Type <span style={{ color: '#fa5252' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="action_type"
                                        control={editControl}
                                        render={({ field }) => (
                                            <Radio.Group
                                                {...field}
                                                error={editErrors.action_type?.message}
                                            >
                                                <Group mt="xs">
                                                    <Radio value="add" label="ADD" color="green" />
                                                    <Radio value="remove" label="REMOVE" color="red" />
                                                    <Radio value="replace" label="REPLACE" color="blue" />
                                                </Group>
                                            </Radio.Group>
                                        )}
                                    />
                                </Box>

                                {/* Stores Multi-Select */}
                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        Select Stores <span style={{ color: '#fa5252' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="stores"
                                        control={editControl}
                                        render={({ field }) => (
                                            <MultiSelect
                                                {...field}
                                                data={storeOptions}
                                                placeholder="Search and select stores"
                                                searchable
                                                clearable
                                                size="sm"
                                                error={editErrors.stores?.message}
                                                maxDropdownHeight={200}
                                            />
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </Box>

                        {/* Action Buttons */}
                        <Group justify="flex-end" gap="md" mt="md">
                            <Button
                                variant="light"
                                color="gray"
                                onClick={handleCancelEdit}
                                disabled={updateBatchRecordMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                color="orange"
                                leftSection={<IconDeviceFloppy size={18} />}
                                loading={updateBatchRecordMutation.isPending}
                                styles={{
                                    root: {
                                        backgroundColor: '#fd7e14',
                                        '&:hover': {
                                            backgroundColor: '#e8590c',
                                        },
                                    },
                                }}
                            >
                                Update Record
                            </Button>
                        </Group>
                    </Stack>
                </form>
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
