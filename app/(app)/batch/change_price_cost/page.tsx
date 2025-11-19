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
  FileInput,
  Alert,
  Anchor,
  Select,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck, IconUpload, IconDownload, IconAlertCircle } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { barcodeFetchDetails, fetchBatchRecords, saveBatchRecord, deleteBatchRecord, updateBatchRecord, postBatch, validateBarcodeUsed, fetchStoreListingTemplate } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification, showWarningNotification, showInfoNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { StyledDataTable } from '@/lib/dataTableHelper';
import { changePriceCostSchema, type ChangePriceCostInput } from '@/lib/schemas/change_price_cost.schema';
import { getChangePriceCostColumns } from '@/components/Columns/Change_price_cost';
import { parseStoresFromExcel, validateStoreCodes, downloadBlobFile } from '@/lib/excelHelper';

function ChangePriceCostContent() {
    const PAGE_TYPE = 'change_price_cost';
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const batchNumber = searchParams.get('batch_number');
    const [confirmModalOpened, setConfirmModalOpened] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<ChangePriceCostInput | null>(null);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [postBatchModalOpened, setPostBatchModalOpened] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [storesFile, setStoresFile] = useState<File | null>(null);
    const [uploadedStores, setUploadedStores] = useState<string[]>([]);
    const [storesFileParseError, setStoresFileParseError] = useState<string>('');

    // Fetch batch records
    const { data: batchRecords, isLoading: isLoadingRecords, isFetching: isFetchingRecords } = useQuery({
        queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
        queryFn: () => fetchBatchRecords(batchNumber!, PAGE_TYPE as any),
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
    } = useForm<ChangePriceCostInput>({
        resolver: zodResolver(changePriceCostSchema),
        defaultValues: {
            entry_type: 'single',
            store_listing_type: 'all_stores',
            stores_file: null,
            request_type: 'change_price_and_cost',
            start_date: new Date(),
            end_date: undefined, // Optional - only for promo price
            price_type: undefined,
            event_type: undefined,
            barcode: '',
            sku: '',
            description: '',
            price: '',
            cost: '',
            current_price: '',
            current_cost: '',
            dept: '',
            deptnm: '',
            upload_file: null,
        },
    });

    // Watch entry type and store listing type to show/hide appropriate fields
    const entryType = watch('entry_type');
    const storeListingType = watch('store_listing_type');
    const requestType = watch('request_type');
    const priceType = watch('price_type');

    // Separate form for editing records
    const {
        control: editControl,
        handleSubmit: handleEditSubmit,
        setValue: setEditValue,
        reset: resetEdit,
        formState: { errors: editErrors },
    } = useForm<ChangePriceCostInput>({
        resolver: zodResolver(changePriceCostSchema),
        defaultValues: {
            entry_type: 'single',
            barcode: '',
            sku: '',
            description: '',
            price: '',
            cost: '',
            current_price: '',
            current_cost: '',
            dept: '',
            deptnm: '',
            upload_file: null,
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
                setValue('description', data.description);
                setValue('current_price', data.current_price || '0.00');
                setValue('current_cost', data.current_cost || '0.00');
                setValue('dept', data.dept);
                setValue('deptnm', data.deptnm);
            } else {
                // Only reset item fields, keep store listing settings
                setValue('barcode', '');
                setValue('sku', '');
                setValue('description', '');
                setValue('price', '');
                setValue('cost', '');
                setValue('current_price', '');
                setValue('current_cost', '');
                setValue('dept', '');
                setValue('deptnm', '');
                showErrorNotification(
                    'Validation Failed',
                    data.message || 'The barcode could not be validated'
                );
            }
        },
        onError: (error) => {
            // Only reset item fields, keep store listing settings
            setValue('barcode', '');
            setValue('sku', '');
            setValue('description', '');
            setValue('price', '');
            setValue('cost', '');
            setValue('current_price', '');
            setValue('current_cost', '');
            setValue('dept', '');
            setValue('deptnm', '');
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
                    console.log('pendingFormData', pendingFormData);

                    // Handle single item or multiple item submission
                    if (pendingFormData.entry_type === 'single') {
                        const payload: any = {
                            long_name: pendingFormData.description,
                            barcode: pendingFormData.barcode,
                            sku: pendingFormData.sku,
                            dept: pendingFormData.dept || '',
                            deptnm: pendingFormData.deptnm || '',
                            price: pendingFormData.price,
                            cost: pendingFormData.cost,
                            current_price: pendingFormData.current_price || '0.00',
                            current_cost: pendingFormData.current_cost || '0.00',
                            batch_number: batchNumber || '',
                            request_type: PAGE_TYPE,
                            store_listing_type: pendingFormData.store_listing_type,
                            // Add request details
                            change_type: pendingFormData.request_type,
                            start_date: pendingFormData.start_date ? pendingFormData.start_date.toISOString().split('T')[0] : null,
                            end_date: pendingFormData.end_date ? pendingFormData.end_date.toISOString().split('T')[0] : null,
                            price_type: pendingFormData.price_type || null,
                            event_type: pendingFormData.event_type || null,
                        };

                        // Add stores if selected_stores option is chosen
                        if (pendingFormData.store_listing_type === 'selected_stores') {
                            payload.stores = uploadedStores;
                        }

                        saveBatchRecordMutation.mutate(payload);
                    } else {
                        // For multiple items with file upload
                        const formData = new FormData();
                        formData.append('upload_file', pendingFormData.upload_file);
                        formData.append('batch_number', batchNumber || '');
                        formData.append('request_type', PAGE_TYPE);
                        formData.append('store_listing_type', pendingFormData.store_listing_type);

                        // Add request details
                        formData.append('change_type', pendingFormData.request_type);
                        formData.append('start_date', pendingFormData.start_date ? pendingFormData.start_date.toISOString().split('T')[0] : '');
                        formData.append('end_date', pendingFormData.end_date ? pendingFormData.end_date.toISOString().split('T')[0] : '');
                        if (pendingFormData.price_type) {
                            formData.append('price_type', pendingFormData.price_type);
                        }
                        if (pendingFormData.event_type) {
                            formData.append('event_type', pendingFormData.event_type);
                        }

                        // Add stores if selected_stores option is chosen
                        if (pendingFormData.store_listing_type === 'selected_stores' && uploadedStores.length > 0) {
                            formData.append('stores', JSON.stringify(uploadedStores));
                        }

                        saveBatchRecordMutation.mutate(formData);
                    }
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
                    data.message || 'Price/Cost change has been saved successfully'
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
                reset({
                    entry_type: 'single',
                    store_listing_type: 'all_stores',
                    stores_file: null,
                    request_type: 'change_price_and_cost',
                    start_date: new Date(),
                    end_date: undefined,
                    price_type: undefined,
                    event_type: undefined,
                    barcode: '',
                    sku: '',
                    description: '',
                    price: '',
                    cost: '',
                    current_price: '',
                    current_cost: '',
                    dept: '',
                    deptnm: '',
                    upload_file: null,
                });
                setUploadFile(null);
                setStoresFile(null);
                setUploadedStores([]);
                setStoresFileParseError('');
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
                setEditModalOpened(false);
                setEditingRecord(null);
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
        setEditValue('entry_type', 'single');
        setEditValue('barcode', record.barcode ? String(record.barcode) : '');
        setEditValue('sku', record.sku ? String(record.sku) : '');
        setEditValue('description', record.long_name || '');
        setEditValue('price', record.new_price ? String(record.new_price) : '');
        setEditValue('cost', record.new_cost ? String(record.new_cost) : '');
        setEditValue('current_price', record.current_price ? String(record.current_price) : '');
        setEditValue('current_cost', record.current_cost ? String(record.current_cost) : '');
        setEditValue('dept', record.dept || '');
        setEditValue('deptnm', record.deptnm || '');
        setEditModalOpened(true);
    };

    const onEditSubmit = (data: ChangePriceCostInput) => {
        console.log('Edit form submitted:', data);

        updateBatchRecordMutation.mutate({
            long_name: data.description,
            barcode: data.barcode,
            sku: data.sku,
            dept: data.dept || '',
            deptnm: data.deptnm || '',
            new_price: data.price,
            new_cost: data.cost,
            current_price: data.current_price || '0.00',
            current_cost: data.current_cost || '0.00',
            batch_number: batchNumber || '',
            request_type: PAGE_TYPE,
            record_id: editingRecord?.id,
        });
    };

    const handleCancelEdit = () => {
        setEditModalOpened(false);
        setEditingRecord(null);
        resetEdit();
    };

    const onSubmit = (data: ChangePriceCostInput) => {
        console.log('Form submitted (validated by Zod):', data);

        setPendingFormData(data);
        setConfirmModalOpened(true);
    };

    const handleConfirmSave = () => {
        if (!pendingFormData || !batchNumber) return;

        // For single item, validate barcode usage
        if (pendingFormData.entry_type === 'single') {
            validateBarcodeUsedMutation.mutate({
                barcode: pendingFormData.barcode!,
                batchNumber: batchNumber,
                requestType: PAGE_TYPE
            });
        } else {
            // For multiple items, directly save (file upload)
            const formData = new FormData();
            formData.append('upload_file', pendingFormData.upload_file);
            formData.append('batch_number', batchNumber || '');
            formData.append('request_type', PAGE_TYPE);
            saveBatchRecordMutation.mutate(formData);
        }
    };

    const handleCancelSave = () => {
        setConfirmModalOpened(false);
        setPendingFormData(null);
    };

    const handleGoBack = () => {
        queryClient.invalidateQueries({
            queryKey: ['BatchRecords']
        });
        router.push('/batch?request_type=change_price_cost');
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

    // Handle file upload for multiple items
    const handleFileChange = (file: File | null) => {
        setUploadFile(file);
        setValue('upload_file', file);
    };

    // Handle stores file upload for selected stores
    const handleStoresFileChange = async (file: File | null) => {
        setStoresFile(file);
        setStoresFileParseError('');
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
                setStoresFileParseError('No valid store codes found in the file.');
                setStoresFile(null);
                setValue('stores_file', null);
                return;
            }

            setUploadedStores(valid);
            setValue('stores_file', file);
            showSuccessNotification(
                'Store File Parsed Successfully',
                `${valid.length} store code(s) loaded from file.`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
            setStoresFileParseError(errorMessage);
            setStoresFile(null);
            setValue('stores_file', null);
            showErrorNotification('File Parse Error', errorMessage);
        }
    };

    // Handle template download
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
                    <Badge color="violet" variant="filled" size="sm">CHANGE PRICE/COST</Badge>
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

                    {/* Store Listing Selection - FIRST STEP */}
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
                            STEP 1: STORE LISTING
                        </Title>

                        <Controller
                            name="store_listing_type"
                            control={control}
                            render={({ field }) => (
                                <Radio.Group
                                    {...field}
                                    error={errors.store_listing_type?.message}
                                >
                                    <Stack gap="md">
                                        <Paper p="md" withBorder style={{
                                            backgroundColor: field.value === 'all_stores' ? '#d3f9d8' : '#f8f9fa',
                                            borderColor: field.value === 'all_stores' ? '#51cf66' : '#dee2e6',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => {
                                            field.onChange('all_stores');
                                            setStoresFile(null);
                                            setUploadedStores([]);
                                            setStoresFileParseError('');
                                            setValue('stores_file', null);
                                        }}
                                        >
                                            <Radio
                                                value="all_stores"
                                                label={
                                                    <Box>
                                                        <Group gap="xs">
                                                            <Text fw={600} c="#2b8a3e">All Applied Stores</Text>
                                                            <Badge color="green" size="xs">Default</Badge>
                                                        </Group>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Apply price/cost change to all stores where the item is currently listed
                                                        </Text>
                                                    </Box>
                                                }
                                            />
                                        </Paper>
                                        <Paper p="md" withBorder style={{
                                            backgroundColor: field.value === 'selected_stores' ? '#e7f5ff' : '#f8f9fa',
                                            borderColor: field.value === 'selected_stores' ? '#339af0' : '#dee2e6',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => field.onChange('selected_stores')}
                                        >
                                            <Radio
                                                value="selected_stores"
                                                label={
                                                    <Box>
                                                        <Group gap="xs">
                                                            <Text fw={600} c="#1971c2">Selected Stores</Text>
                                                            <Badge color="blue" size="xs">File Upload</Badge>
                                                        </Group>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Upload an Excel file to specify which stores to apply the price/cost change
                                                        </Text>
                                                    </Box>
                                                }
                                            />
                                        </Paper>
                                    </Stack>
                                </Radio.Group>
                            )}
                        />

                        {/* Selected Stores File Upload */}
                        {storeListingType === 'selected_stores' && (
                            <Box mt="lg">
                                <Group justify="space-between" align="center" mb={rem(8)}>
                                    <Text size="sm" fw={600} c="#495057">
                                        UPLOAD STORES FILE <span style={{ color: 'red' }}>*</span>
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
                                    placeholder="Choose Excel or CSV file with store codes"
                                    size="md"
                                    accept=".csv,.xlsx,.xls"
                                    leftSection={<IconUpload size={18} />}
                                    value={storesFile}
                                    onChange={handleStoresFileChange}
                                    clearable
                                    error={storesFileParseError || errors.stores_file?.message?.toString()}
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
                                {uploadedStores.length > 0 && (
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
                                )}
                            </Box>
                        )}
                    </Box>

                    <Divider />

                    {/* Entry Type Selection - SECOND STEP */}
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
                            STEP 2: ENTRY TYPE
                        </Title>

                        <Controller
                            name="entry_type"
                            control={control}
                            render={({ field }) => (
                                <Radio.Group
                                    {...field}
                                    error={errors.entry_type?.message}
                                >
                                    <Stack gap="md">
                                        <Paper p="md" withBorder style={{
                                            backgroundColor: field.value === 'single' ? '#e7f5ff' : '#f8f9fa',
                                            borderColor: field.value === 'single' ? '#339af0' : '#dee2e6',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => {
                                            field.onChange('single');
                                            reset({
                                                entry_type: 'single',
                                                store_listing_type: watch('store_listing_type'),
                                                stores_file: watch('stores_file'),
                                                barcode: '',
                                                sku: '',
                                                description: '',
                                                price: '',
                                                cost: '',
                                                current_price: '',
                                                current_cost: '',
                                                dept: '',
                                                deptnm: '',
                                            });
                                            setUploadFile(null);
                                        }}
                                        >
                                            <Radio
                                                value="single"
                                                label={
                                                    <Box>
                                                        <Group gap="xs">
                                                            <Text fw={600} c="#1971c2">Single Item</Text>
                                                            <Badge color="blue" size="xs">Manual Entry</Badge>
                                                        </Group>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Enter price/cost change for a single item by barcode
                                                        </Text>
                                                    </Box>
                                                }
                                            />
                                        </Paper>
                                        <Paper p="md" withBorder style={{
                                            backgroundColor: field.value === 'multiple' ? '#e7f5ff' : '#f8f9fa',
                                            borderColor: field.value === 'multiple' ? '#339af0' : '#dee2e6',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => {
                                            field.onChange('multiple');
                                            reset({
                                                entry_type: 'multiple',
                                                store_listing_type: watch('store_listing_type'),
                                                stores_file: watch('stores_file'),
                                                upload_file: null,
                                            });
                                        }}
                                        >
                                            <Radio
                                                value="multiple"
                                                label={
                                                    <Box>
                                                        <Group gap="xs">
                                                            <Text fw={600} c="#1971c2">Multiple Items</Text>
                                                            <Badge color="blue" size="xs">File Upload</Badge>
                                                        </Group>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Upload an Excel file with multiple price/cost changes
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

                    <Divider />

                    {/* Request Type Selection - THIRD STEP */}
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
                            STEP 3: REQUEST DETAILS
                        </Title>

                        <Grid gutter="lg">
                            {/* Request Type */}
                            <Grid.Col span={12}>
                                <Box>
                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                        REQUEST TYPE <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="request_type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                placeholder="Select request type"
                                                size="md"
                                                data={[
                                                    { value: 'change_price', label: 'Change Price' },
                                                    { value: 'change_cost', label: 'Change Cost' },
                                                    { value: 'change_price_and_cost', label: 'Change Price and Cost' },
                                                ]}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                    // Clear price and cost fields when request type changes
                                                    if (value === 'change_price') {
                                                        // Clear cost when switching to price-only
                                                        setValue('cost', '');
                                                    } else if (value === 'change_cost') {
                                                        // Clear price when switching to cost-only
                                                        setValue('price', '');
                                                    }
                                                    // For 'change_price_and_cost', keep both fields (don't clear)
                                                }}
                                                error={errors.request_type?.message}
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

                            {/* Date Range */}
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Box>
                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                        START DATE <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="start_date"
                                        control={control}
                                        render={({ field }) => (
                                            <TextInput
                                                type="date"
                                                size="md"
                                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const dateValue = e.target.value ? new Date(e.target.value) : new Date();
                                                    field.onChange(dateValue);
                                                }}
                                                min={new Date().toISOString().split('T')[0]}
                                                error={errors.start_date?.message}
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

                            {/* End Date - Only show for promo price or when no price type selected yet, or for cost-only changes */}
                            {(requestType === 'change_cost' || !priceType || priceType === 'promo_price') && (
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Box>
                                        <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                            END DATE {priceType === 'promo_price' && <span style={{ color: 'red' }}>*</span>}
                                        </Text>
                                        <Controller
                                            name="end_date"
                                            control={control}
                                            render={({ field }) => (
                                                <TextInput
                                                    type="date"
                                                    size="md"
                                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                                    onChange={(e) => {
                                                        const dateValue = e.target.value ? new Date(e.target.value) : undefined;
                                                        field.onChange(dateValue);
                                                    }}
                                                    min={watch('start_date') ? watch('start_date').toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                                    error={errors.end_date?.message}
                                                    disabled={priceType === 'regular_price'}
                                                    placeholder={priceType === 'regular_price' ? 'N/A (No expiration)' : ''}
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
                                        {priceType === 'promo_price' && (
                                            <Text size="xs" c="dimmed" mt={rem(4)}>
                                                Promo prices require an end date
                                            </Text>
                                        )}
                                        {priceType === 'regular_price' && (
                                            <Text size="xs" c="dimmed" mt={rem(4)}>
                                                Regular prices have no expiration date
                                            </Text>
                                        )}
                                    </Box>
                                </Grid.Col>
                            )}

                            {/* Price Type - Only show if request involves price changes */}
                            {(requestType === 'change_price' || requestType === 'change_price_and_cost') && (
                                <Grid.Col span={12}>
                                    <Box>
                                        <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                            PRICE TYPE <span style={{ color: 'red' }}>*</span>
                                        </Text>
                                        <Controller
                                            name="price_type"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    placeholder="Select price type"
                                                    size="md"
                                                    data={[
                                                        { value: 'promo_price', label: 'Promo Price' },
                                                        { value: 'regular_price', label: 'Regular Price' },
                                                    ]}
                                                    error={errors.price_type?.message}
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
                                        <Text size="xs" c="dimmed" mt={rem(4)}>
                                            {requestType === 'change_price' || requestType === 'change_price_and_cost'
                                                ? 'Specify whether this is a promotional price or regular price change'
                                                : ''}
                                        </Text>
                                    </Box>
                                </Grid.Col>
                            )}

                            {/* Event Type - Only show if price_type is regular_price */}
                            {(requestType === 'change_price' || requestType === 'change_price_and_cost') && priceType === 'regular_price' && (
                                <Grid.Col span={12}>
                                    <Box>
                                        <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                            EVENT TYPE <span style={{ color: 'red' }}>*</span>
                                        </Text>
                                        <Controller
                                            name="event_type"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    placeholder="Select event type"
                                                    size="md"
                                                    data={[
                                                        { value: 'mark_up', label: 'Mark Up' },
                                                        { value: 'mark_down', label: 'Mark Down' },
                                                    ]}
                                                    error={errors.event_type?.message}
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
                                        <Text size="xs" c="dimmed" mt={rem(4)}>
                                            Specify whether this is a price increase (mark up) or decrease (mark down)
                                        </Text>
                                    </Box>
                                </Grid.Col>
                            )}
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Single Item Form */}
                    {entryType === 'single' && (
                        <>
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
                                                BARCODE <span style={{ color: 'red' }}>*</span>
                                            </Text>
                                            <Controller
                                                name="barcode"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextInput
                                                        placeholder="Enter barcode/UPC"
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
                                                {...register('description')}
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

                            {/* Price and Cost Information */}
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
                                    PRICE & COST INFORMATION
                                </Title>

                                <Grid gutter="lg">
                                    {/* Price Fields - Show only if request involves price */}
                                    {(requestType === 'change_price' || requestType === 'change_price_and_cost') && (
                                        <>
                                            {/* Current Price */}
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Box>
                                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                                        CURRENT PRICE
                                                    </Text>
                                                    <TextInput
                                                        placeholder="0.00"
                                                        size="md"
                                                        readOnly
                                                        {...register('current_price')}
                                                        leftSection={<Text size="sm" c="dimmed">₱</Text>}
                                                        styles={{
                                                            input: {
                                                                border: '1px solid #dee2e6',
                                                                borderRadius: rem(4),
                                                                fontSize: rem(14),
                                                                backgroundColor: '#f8f9fa',
                                                                color: '#6c757d',
                                                                fontWeight: 500,
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            </Grid.Col>

                                            {/* New Price */}
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Box>
                                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                                        NEW PRICE <span style={{ color: 'red' }}>*</span>
                                                    </Text>
                                                    <Controller
                                                        name="price"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <TextInput
                                                                placeholder="0.00"
                                                                size="md"
                                                                value={field.value}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    // Allow digits and one decimal point
                                                                    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                                                                        field.onChange(value);
                                                                    }
                                                                }}
                                                                leftSection={<Text size="sm" fw={600} c="blue">₱</Text>}
                                                                error={errors.price?.message}
                                                                styles={{
                                                                    input: {
                                                                        border: '2px solid #339af0',
                                                                        borderRadius: rem(4),
                                                                        fontSize: rem(14),
                                                                        fontWeight: 600,
                                                                        color: '#1971c2',
                                                                    },
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                </Box>
                                            </Grid.Col>
                                        </>
                                    )}

                                    {/* Cost Fields - Show only if request involves cost */}
                                    {(requestType === 'change_cost' || requestType === 'change_price_and_cost') && (
                                        <>
                                            {/* Current Cost */}
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Box>
                                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                                        CURRENT COST
                                                    </Text>
                                                    <TextInput
                                                        placeholder="0.00"
                                                        size="md"
                                                        readOnly
                                                        {...register('current_cost')}
                                                        leftSection={<Text size="sm" c="dimmed">₱</Text>}
                                                        styles={{
                                                            input: {
                                                                border: '1px solid #dee2e6',
                                                                borderRadius: rem(4),
                                                                fontSize: rem(14),
                                                                backgroundColor: '#f8f9fa',
                                                                color: '#6c757d',
                                                                fontWeight: 500,
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            </Grid.Col>

                                            {/* New Cost */}
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Box>
                                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                                        NEW COST <span style={{ color: 'red' }}>*</span>
                                                    </Text>
                                                    <Controller
                                                        name="cost"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <TextInput
                                                                placeholder="0.00"
                                                                size="md"
                                                                value={field.value}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            // Allow digits and one decimal point
                                                            if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                                                                field.onChange(value);
                                                            }
                                                        }}
                                                        leftSection={<Text size="sm" fw={600} c="green">₱</Text>}
                                                        error={errors.cost?.message}
                                                        styles={{
                                                            input: {
                                                                border: '2px solid #51cf66',
                                                                borderRadius: rem(4),
                                                                fontSize: rem(14),
                                                                fontWeight: 600,
                                                                color: '#2b8a3e',
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
                        </>
                    )}

                    {/* Multiple Item File Upload */}
                    {entryType === 'multiple' && (
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
                                FILE UPLOAD
                            </Title>

                            <Box>
                                <Group justify="space-between" align="center" mb={rem(8)}>
                                    <Text size="sm" fw={600} c="#495057">
                                        UPLOAD EXCEL FILE <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Anchor
                                        size="xs"
                                        c="blue"
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            showInfoNotification(
                                                'Template Coming Soon',
                                                'Excel template download will be available soon'
                                            );
                                        }}
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
                                    value={uploadFile}
                                    onChange={handleFileChange}
                                    clearable
                                    error={errors.upload_file?.message?.toString()}
                                    styles={{
                                        input: {
                                            border: '1px solid #dee2e6',
                                            borderRadius: rem(4),
                                            fontSize: rem(14),
                                        },
                                    }}
                                />
                                <Text size="xs" c="dimmed" mt={rem(4)}>
                                    Upload a CSV or Excel file with columns: Barcode, SKU, Description, New Price, New Cost
                                </Text>
                                {uploadFile && (
                                    <Alert
                                        icon={<IconCheck size={16} />}
                                        color="green"
                                        variant="light"
                                        mt="md"
                                    >
                                        <Text size="sm" fw={600}>
                                            File ready: {uploadFile.name}
                                        </Text>
                                    </Alert>
                                )}
                            </Box>
                        </Box>
                    )}

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
                                        backgroundColor: '#7950f2',
                                        '&:hover': {
                                            backgroundColor: '#6741d9',
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
                    columns={getChangePriceCostColumns({
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
                        <IconDeviceFloppy size={24} style={{ color: '#7950f2' }} />
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
                        You are about to save the price/cost changes. Please review the details below:
                    </Text>

                    {pendingFormData && pendingFormData.entry_type === 'single' && (
                        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>SKU:</Text>
                                    <Text size="sm">{pendingFormData.sku || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Description:</Text>
                                    <Text size="sm" style={{ maxWidth: '60%', textAlign: 'right' }}>
                                        {pendingFormData.description || 'N/A'}
                                    </Text>
                                </Group>
                                <Divider />
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Current Price:</Text>
                                    <Text size="sm" c="dimmed">₱{pendingFormData.current_price || '0.00'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>New Price:</Text>
                                    <Text size="sm" fw={600} c="blue">₱{pendingFormData.price || '0.00'}</Text>
                                </Group>
                                <Divider />
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Current Cost:</Text>
                                    <Text size="sm" c="dimmed">₱{pendingFormData.current_cost || '0.00'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>New Cost:</Text>
                                    <Text size="sm" fw={600} c="green">₱{pendingFormData.cost || '0.00'}</Text>
                                </Group>
                            </Stack>
                        </Paper>
                    )}

                    {pendingFormData && pendingFormData.entry_type === 'multiple' && (
                        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>File:</Text>
                                    <Text size="sm">{pendingFormData.upload_file?.name || 'N/A'}</Text>
                                </Group>
                                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                                    <Text size="xs">
                                        Multiple items will be processed from the uploaded file
                                    </Text>
                                </Alert>
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
                            color="violet"
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
                                    <Badge color="violet" variant="light">CHANGE PRICE/COST</Badge>
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
                        backgroundColor: '#7950f2',
                        color: 'white',
                        margin: rem(-16),
                        marginBottom: rem(20),
                        padding: `${rem(16)} ${rem(20)}`,
                    },
                    header: {
                        backgroundColor: '#7950f2',
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
                                        BARCODE
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

                        {/* Editable Price and Cost Fields */}
                        <Box>
                            <Text size="sm" fw={700} mb="md" c="#495057" tt="uppercase">
                                Update Price & Cost
                            </Text>
                            <Grid gutter="md">
                                {/* New Price */}
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        New Price <span style={{ color: '#fa5252' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="price"
                                        control={editControl}
                                        render={({ field }) => (
                                            <TextInput
                                                {...field}
                                                size="sm"
                                                placeholder="0.00"
                                                leftSection={<Text size="sm" fw={600} c="blue">₱</Text>}
                                                error={editErrors.price?.message}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                                                        field.onChange(value);
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                </Grid.Col>

                                {/* New Cost */}
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        New Cost <span style={{ color: '#fa5252' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="cost"
                                        control={editControl}
                                        render={({ field }) => (
                                            <TextInput
                                                {...field}
                                                size="sm"
                                                placeholder="0.00"
                                                leftSection={<Text size="sm" fw={600} c="green">₱</Text>}
                                                error={editErrors.cost?.message}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                                                        field.onChange(value);
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                </Grid.Col>
                            </Grid>
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
                                color="violet"
                                leftSection={<IconDeviceFloppy size={18} />}
                                loading={updateBatchRecordMutation.isPending}
                                styles={{
                                    root: {
                                        backgroundColor: '#7950f2',
                                        '&:hover': {
                                            backgroundColor: '#6741d9',
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

export default function ChangePriceCostPage() {
    return (
        <Suspense fallback={
            <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
                <Text>Loading...</Text>
            </Box>
        }>
            <ChangePriceCostContent />
        </Suspense>
    );
}
