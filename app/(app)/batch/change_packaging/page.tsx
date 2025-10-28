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
  FileInput,
  NumberInput,
  Select,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck, IconPhoto } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { barcodeFetchDetails, fetchBatchRecords, saveBatchRecord, deleteBatchRecord, updateBatchRecord, postBatch, validateBarcodeUsed,fetchUOM } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { StyledDataTable } from '@/lib/dataTableHelper';
import { z } from 'zod';
import { getChangePackagingColumns } from '@/components/Columns/Change_packaging';

// Zod schema for change packaging form
const changePackagingSchema = z.object({
  barcode: z.string().min(1, 'UPC is required'),
  sku: z.string().min(1, 'SKU is required'),
  display_name: z.string().optional(),
  current_uom: z.string().optional(),
  current_standard_pack: z.string().optional(),
  uom: z.string().min(1, 'Unit of Measure is required'),
  standard_pack: z.string().optional(), // Auto-filled based on UOM
  cost: z.number().min(0.01, 'Cost must be greater than 0').optional().nullable(),
  image: z.any().optional(),
  dept: z.string().optional(),
  deptnm: z.string().optional(),
});

type ChangePackagingInput = z.infer<typeof changePackagingSchema>;

function ChangePackagingContent() {
    const PAGE_TYPE = 'change_packaging';
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const batchNumber = searchParams.get('batch_number');
    const [confirmModalOpened, setConfirmModalOpened] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<ChangePackagingInput | null>(null);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [postBatchModalOpened, setPostBatchModalOpened] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [formKey, setFormKey] = useState(0);

    const { data: batchRecords, isLoading: isLoadingRecords, isFetching: isFetchingRecords, error } = useQuery({
        queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
        queryFn: () => fetchBatchRecords(batchNumber!, PAGE_TYPE as any),
        enabled: !!batchNumber,
        retry: false,
    });

    const { data: UOMRecords, isLoading: isUOMLoading, error:UOMError } = useQuery({
        queryKey: ['UOMRecords'],
        queryFn: () => fetchUOM(),
    });

    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
        watch,
    } = useForm<ChangePackagingInput>({
        resolver: zodResolver(changePackagingSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            display_name: '',
            current_uom: '',
            current_standard_pack: '',
            uom: '',
            standard_pack: '',
            cost: undefined,
            dept: '',
            deptnm: '',
        },
    });

    // Separate form for editing records
    const {
        control: editControl,
        handleSubmit: handleEditSubmit,
        setValue: setEditValue,
        reset: resetEdit,
        formState: { errors: editErrors },
    } = useForm<ChangePackagingInput>({
        resolver: zodResolver(changePackagingSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            display_name: '',
            current_uom: '',
            current_standard_pack: '',
            uom: '',
            standard_pack: '',
            cost: undefined,
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
                setValue('display_name', data.description);
                setValue('current_uom', data.uom || 'N/A');
                setValue('current_standard_pack', data.standard_pack || 'N/A');
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
                    console.log('pendingFormData', pendingFormData);
                    // Create FormData for image upload
                    const formData = new FormData();
                    formData.append('barcode', pendingFormData.barcode);
                    formData.append('sku', pendingFormData.sku);
                    formData.append('long_name', pendingFormData.display_name || '');
                    formData.append('uom', pendingFormData.uom);
                    formData.append('standard_pack', pendingFormData.standard_pack || '');
                    formData.append('cost', pendingFormData.cost?.toString() || '0');
                    formData.append('dept', pendingFormData.dept || '');
                    formData.append('deptnm', pendingFormData.deptnm || '');
                    formData.append('batch_number', batchNumber || '');
                    formData.append('request_type', PAGE_TYPE);

                    if (imageFile) {
                        formData.append('image', imageFile);
                    }

                    saveBatchRecordMutation.mutate(formData);
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
                // Reset form with explicit default values to ensure NumberInput clears properly
                reset({
                    barcode: '',
                    sku: '',
                    display_name: '',
                    current_uom: '',
                    current_standard_pack: '',
                    uom: '',
                    standard_pack: '',
                    cost: undefined,
                    dept: '',
                    deptnm: '',
                });
                setImageFile(null);
                setFormKey(prev => prev + 1); // Force re-render of NumberInput
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
        setEditValue('display_name', record.long_name || '');
        setEditValue('uom', record.uom || '');
        setEditValue('standard_pack', record.standard_pack || '');
        setEditValue('cost', record.cost ? parseFloat(record.cost) : null);
        setEditValue('dept', record.dept || '');
        setEditValue('deptnm', record.deptnm || '');
        setEditModalOpened(true);
    };

    const onEditSubmit = (data: ChangePackagingInput) => {
        console.log('Edit form submitted:', data);

        // Create FormData for image upload
        const formData = new FormData();
        formData.append('barcode', data.barcode);
        formData.append('sku', data.sku);
        formData.append('long_name', data.display_name || '');
        formData.append('uom', data.uom);
        formData.append('standard_pack', data.standard_pack || '');
        formData.append('cost', data.cost?.toString() || '0');
        formData.append('dept', data.dept || '');
        formData.append('deptnm', data.deptnm || '');
        formData.append('batch_number', batchNumber || '');
        formData.append('request_type', PAGE_TYPE);
        formData.append('record_id', editingRecord?.id);

        if (editImageFile) {
            formData.append('image', editImageFile);
        }

        updateBatchRecordMutation.mutate(formData);

        setEditModalOpened(false);
        setEditingRecord(null);
        setEditImageFile(null);
        resetEdit();
    };

    const handleCancelEdit = () => {
        setEditModalOpened(false);
        setEditingRecord(null);
        setEditImageFile(null);
        resetEdit();
    };

    const onSubmit = (data: ChangePackagingInput) => {
        console.log('Form submitted (validated by Zod):', data);
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
        router.push('/batch?request_type=change_packaging');
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
                    <Badge color="violet" variant="filled" size="sm">CHANGE PACKAGING</Badge>
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
                                        DISPLAY NAME
                                    </Text>
                                    <TextInput
                                        placeholder=""
                                        size="md"
                                        readOnly
                                        {...register('display_name')}
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

                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <Box>
                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                        CURRENT UNIT OF MEASURE
                                    </Text>
                                    <TextInput
                                        placeholder=""
                                        size="md"
                                        readOnly
                                        {...register('current_uom')}
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

                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <Box>
                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                        CURRENT STANDARD PACK
                                    </Text>
                                    <TextInput
                                        placeholder=""
                                        size="md"
                                        readOnly
                                        {...register('current_standard_pack')}
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
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <Box>
                                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                                        UNIT OF MEASURE (UOM) <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="uom"
                                        control={control}
                                        render={({ field }) => {
                                            return (
                                                <Select
                                                    {...field}
                                                    value={field.value || null}
                                                    placeholder={isUOMLoading ? "Loading..." : "Select unit of measure"}
                                                    size="md"
                                                    data={UOMRecords?.data.map((record:any) => ({
                                                        value: record.IUNMSR,
                                                        label: `${record.IUNMSR} - ${record.IUMDSC}`
                                                    })) || []}
                                                    searchable
                                                    clearable
                                                    error={errors.uom?.message}
                                                    disabled={isUOMLoading}
                                                    onChange={(value)=> {
                                                        field.onChange(value);
                                                        const selectedRecord = UOMRecords?.data.find(
                                                            (record:any) => record.IUNMSR == value
                                                        )
                                                        if(selectedRecord){
                                                            setValue('standard_pack',selectedRecord.IBYFAC)
                                                        }

                                                    }}
                                                    styles={{
                                                        input: {
                                                            border: '1px solid #dee2e6',
                                                            borderRadius: rem(4),
                                                            fontSize: rem(14),
                                                        },
                                                    }}
                                                />
                                            );
                                        }}
                                    />
                                </Box>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <Box>
                                    <Group gap={rem(6)} mb={rem(8)}>
                                        <Text size="sm" fw={600} c="#495057">
                                            STANDARD PACK
                                        </Text>
                                        <Badge size="xs" color="gray" variant="light">Auto-filled</Badge>
                                    </Group>
                                    <Controller
                                        name="standard_pack"
                                        control={control}
                                        render={({ field }) => (
                                            <TextInput
                                                {...field}
                                                placeholder="Auto-filled based on UOM selection"
                                                size="md"
                                                readOnly
                                                error={errors.standard_pack?.message}
                                                styles={{
                                                    input: {
                                                        border: '1px solid #dee2e6',
                                                        borderRadius: rem(4),
                                                        fontSize: rem(14),
                                                        backgroundColor: '#f0f9ff',
                                                        color: '#0c4a6e',
                                                        fontWeight: 500,
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
                                        COST
                                    </Text>
                                    <Controller
                                        name="cost"
                                        control={control}
                                        render={({ field: { value, onChange, ...field } }) => (
                                            <NumberInput
                                                key={`cost-${formKey}`}
                                                {...field}
                                                value={value ?? undefined}
                                                onChange={(val) => onChange(val ?? undefined)}
                                                placeholder="Enter item cost"
                                                size="md"
                                                decimalScale={2}
                                                fixedDecimalScale
                                                prefix="₱ "
                                                thousandSeparator=","
                                                min={0}
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
                                        IMAGE
                                    </Text>
                                    <FileInput
                                        placeholder="Upload product image"
                                        size="md"
                                        accept="image/png,image/jpeg,image/jpg"
                                        leftSection={<IconPhoto size={18} />}
                                        value={imageFile}
                                        onChange={setImageFile}
                                        clearable
                                        styles={{
                                            input: {
                                                border: '1px solid #dee2e6',
                                                borderRadius: rem(4),
                                                fontSize: rem(14),
                                            },
                                        }}
                                    />
                                    <Text size="xs" c="dimmed" mt={rem(4)}>
                                        Supported formats: JPG, JPEG, PNG (Max 5MB)
                                    </Text>
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
                    isLoading={isLoadingRecords || isFetchingRecords}
                    emptyMessage="No encoded records yet."
                    columns={getChangePackagingColumns({
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
                                    <Text size="sm" fw={600}>Display Name:</Text>
                                    <Text size="sm">{pendingFormData.display_name || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>UOM:</Text>
                                    <Text size="sm">{pendingFormData.uom || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Standard Pack:</Text>
                                    <Text size="sm">{pendingFormData.standard_pack || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Cost:</Text>
                                    <Text size="sm">
                                        {pendingFormData.cost ? `₱${pendingFormData.cost.toFixed(2)}` : 'N/A'}
                                    </Text>
                                </Group>
                                {imageFile && (
                                    <Group justify="space-between">
                                        <Text size="sm" fw={600}>Image:</Text>
                                        <Text size="sm">{imageFile.name}</Text>
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
                                    <Badge color="violet" variant="light">CHANGE PACKAGING</Badge>
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
                                <Grid.Col span={12}>
                                    <Text size="xs" fw={600} mb={rem(6)} c="dimmed">
                                        Display Name
                                    </Text>
                                    <Controller
                                        name="display_name"
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
                                {/* UOM and Standard Pack in 2 columns */}
                                <Grid gutter="md">
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                            Unit of Measure (UOM) <span style={{ color: '#fa5252' }}>*</span>
                                        </Text>
                                        <Controller
                                            name="uom"
                                            control={editControl}
                                            render={({ field }) => {
                                                return (
                                                    <Select
                                                        {...field}
                                                        value={field.value || null}
                                                        placeholder={isUOMLoading ? "Loading..." : "Select unit of measure"}
                                                        size="sm"
                                                        // data={uomOptions}
                                                        data={UOMRecords?.data.map((record:any) => ({
                                                            value: record.IUNMSR,
                                                            label: `${record.IUNMSR} - ${record.IUMDSC}`
                                                        })) || []}
                                                        searchable
                                                        clearable
                                                        error={editErrors.uom?.message}
                                                        disabled={isUOMLoading}
                                                        onChange={(value)=> {
                                                            field.onChange(value);
                                                            const selectedRecord = UOMRecords?.data.find(
                                                                (record:any) => record.IUNMSR == value
                                                            )
                                                            if(selectedRecord){
                                                                setEditValue('standard_pack',selectedRecord.IBYFAC)
                                                            }
                                                        }}
                                                    />
                                                );
                                            }}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <Group gap={rem(4)} mb={rem(6)}>
                                            <Text size="xs" fw={600} c="#495057">
                                                Standard Pack
                                            </Text>
                                            <Badge size="xs" color="gray" variant="light">Auto-filled</Badge>
                                        </Group>
                                        <Controller
                                            name="standard_pack"
                                            control={editControl}
                                            render={({ field }) => (
                                                <TextInput
                                                    {...field}
                                                    size="sm"
                                                    placeholder="Auto-filled based on UOM"
                                                    readOnly
                                                    error={editErrors.standard_pack?.message}
                                                    styles={{
                                                        input: {
                                                            backgroundColor: '#f0f9ff',
                                                            color: '#0c4a6e',
                                                            fontWeight: 500,
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                    </Grid.Col>
                                </Grid>

                                {/* Cost */}
                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        Cost
                                    </Text>
                                    <Controller
                                        name="cost"
                                        control={editControl}
                                        render={({ field: { value, onChange, ...field } }) => (
                                            <NumberInput
                                                {...field}
                                                value={value ?? undefined}
                                                onChange={(val) => onChange(val ?? null)}
                                                size="sm"
                                                placeholder="Enter item cost"
                                                decimalScale={2}
                                                fixedDecimalScale
                                                prefix="₱ "
                                                thousandSeparator=","
                                                min={0}
                                                error={editErrors.cost?.message}
                                            />
                                        )}
                                    />
                                </Box>

                                {/* Image Upload */}
                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        Product Image
                                    </Text>
                                    <FileInput
                                        placeholder="Upload new image (optional)"
                                        size="sm"
                                        accept="image/png,image/jpeg,image/jpg"
                                        leftSection={<IconPhoto size={16} />}
                                        value={editImageFile}
                                        onChange={setEditImageFile}
                                        clearable
                                    />
                                    <Text size="xs" c="dimmed" mt={rem(4)}>
                                        Leave empty to keep existing image. Formats: JPG, JPEG, PNG (Max 5MB)
                                    </Text>
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

export default function ChangePackagingPage() {
    return (
        <Suspense fallback={
            <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
                <Text>Loading...</Text>
            </Box>
        }>
            <ChangePackagingContent />
        </Suspense>
    );
}
