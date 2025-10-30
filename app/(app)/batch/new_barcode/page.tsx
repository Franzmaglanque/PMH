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
  Select,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { barcodeFetchDetails, fetchBatchRecords, saveBatchRecord, deleteBatchRecord, updateBatchRecord, postBatch, validateBarcodeUsed } from '@/app/api/batch_request_api';
import { showSuccessNotification, showErrorNotification } from '@/lib/notifications';
import { useDebouncedInput } from '@/lib/debounce';
import { StyledDataTable } from '@/lib/dataTableHelper';
import { z } from 'zod';
import { getNewBarcodeColumns } from '@/components/Columns/New_barcode';
import { useNumericInputWithMaxLength, useNumericInputWithMaxLengthDebounced } from '@/lib/inputHelpers';

// Zod schema for new barcode form
const newBarcodeSchema = z.object({
  barcode: z.string().min(1, 'UPC is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  raw_barcode: z.string().min(1, 'Raw Barcode is required'),
  new_barcode: z.string().optional(),
  is_primary_barcode: z.string().min(1, 'Primary Barcode selection is required'),
  dept: z.string().optional(),
  deptnm: z.string().optional(),
});

type NewBarcodeInput = z.infer<typeof newBarcodeSchema>;

function NewBarcodeContent() {
    const PAGE_TYPE = 'new_barcode';
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const batchNumber = searchParams.get('batch_number');
    const [confirmModalOpened, setConfirmModalOpened] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<NewBarcodeInput | null>(null);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [postBatchModalOpened, setPostBatchModalOpened] = useState(false);

    const { data: batchRecords, isLoading: isLoadingRecords, isFetching: isFetchingRecords, error } = useQuery({
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
    } = useForm<NewBarcodeInput>({
        resolver: zodResolver(newBarcodeSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            description: '',
            raw_barcode: '',
            new_barcode: '',
            is_primary_barcode: '',
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
    } = useForm<NewBarcodeInput>({
        resolver: zodResolver(newBarcodeSchema),
        defaultValues: {
            barcode: '',
            sku: '',
            description: '',
            raw_barcode: '',
            new_barcode: '',
            is_primary_barcode: '',
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
                setValue('description', data.description);
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
                    saveBatchRecordMutation.mutate({
                        barcode: pendingFormData.barcode,
                        sku: pendingFormData.sku,
                        long_name: pendingFormData.description || '',
                        new_barcode: pendingFormData.new_barcode || '',
                        dept: pendingFormData.dept || '',
                        deptnm: pendingFormData.deptnm || '',
                        is_primary_barcode: pendingFormData.is_primary_barcode,
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
                    data.message || 'Item details have been saved successfully'
                );
                queryClient.invalidateQueries({
                    queryKey: ['batchRecords', batchNumber, PAGE_TYPE]
                });
                reset({
                    barcode: '',
                    sku: '',
                    description: '',
                    raw_barcode: '',
                    new_barcode: '',
                    is_primary_barcode: '',
                    dept: '',
                    deptnm: '',
                });
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
        setEditValue('description', record.long_name || '');
        setEditValue('raw_barcode', record.check_digit || '');
        setEditValue('new_barcode', record.new_barcode ? String(record.new_barcode) : '');
        setEditValue('is_primary_barcode', record.is_primary_barcode === 1 || record.is_primary_barcode === '1' || record.is_primary_barcode === 'yes' ? 'yes' : 'no');
        setEditValue('dept', record.dept || '');
        setEditValue('deptnm', record.deptnm || '');
        setEditModalOpened(true);
    };

    const onEditSubmit = (data: NewBarcodeInput) => {
        console.log('Edit form submitted:', data);

        updateBatchRecordMutation.mutate({
            barcode: data.barcode,
            sku: data.sku,
            long_name: data.description || '',
            new_barcode: data.new_barcode || '',
            check_digit: data.raw_barcode || '',
            is_primary_barcode: data.is_primary_barcode,
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

    const onSubmit = (data: NewBarcodeInput) => {
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
        router.push('/batch?request_type=new_barcode');
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

    // Barcode input helper with 13 digit limit (must be at component level, not inside render)
    const barcodeNumericInput = useNumericInputWithMaxLength(13, (value) => {
        setValue('barcode', value);
        validateUpc({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
    });

    // Raw barcode input helper with 12 digit limit and debouncing
    const rawBarcodeNumericInput = useNumericInputWithMaxLengthDebounced(
        12,
        (value) => setValue('raw_barcode', value), // Immediate update for responsive UI
        (value) => {
            console.log('raw_barcode debounced value:', value);
            let paddedValue = '';
            // Pad with leading zeros if length is less than 12 and value is not empty
            if (value.length > 0 && value.length < 12) {
                paddedValue = value.padStart(12, '0');
                setValue('raw_barcode', value);
                // value = paddedValue; // Use padded value for check digit calculation
            }

            // 1. Sum digits at odd positions (1st, 3rd, 5th, 7th, 9th, 11th)
            let oddSum = parseInt(paddedValue[0]) + parseInt(paddedValue[2]) + parseInt(paddedValue[4]) +
                        parseInt(paddedValue[6]) + parseInt(paddedValue[8]) + parseInt(paddedValue[10]);

            // 2. Sum digits at even positions (2nd, 4th, 6th, 8th, 10th, 12th) and multiply by 3
            let evenSum = (parseInt(paddedValue[1]) + parseInt(paddedValue[3]) + parseInt(paddedValue[5]) +
                        parseInt(paddedValue[7]) + parseInt(paddedValue[9]) + parseInt(paddedValue[11])) * 3;

            let totalSum = oddSum + evenSum;

            // 3. The check digit is what you need to add to make the total a multiple of 10
            let lastDigit = totalSum % 10;
            let checkDigit = (10 - lastDigit) % 10; // The modulo 10 handles the case where result is 10
            let ean13Barcode = value + checkDigit;

            console.log('Check digit:', checkDigit);
            console.log('Complete EAN-13:', ean13Barcode);

            // Set the new_barcode (complete EAN-13) in your form
            setValue('new_barcode', ean13Barcode);

        },
        800
    );

    // Edit modal raw barcode input helper with 12 digit limit
    const editRawBarcodeNumericInput = useNumericInputWithMaxLengthDebounced(
        12,
        (value) => setEditValue('raw_barcode', value), // Immediate update for responsive UI
        (value) => {
            console.log('raw_barcode debounced value:', value);
            let paddedValue = '';
            // Pad with leading zeros if length is less than 12 and value is not empty
            if (value.length > 0 && value.length < 12) {
                paddedValue = value.padStart(12, '0');
                setEditValue('raw_barcode', value);
                // value = paddedValue; // Use padded value for check digit calculation
            }

            // 1. Sum digits at odd positions (1st, 3rd, 5th, 7th, 9th, 11th)
            let oddSum = parseInt(paddedValue[0]) + parseInt(paddedValue[2]) + parseInt(paddedValue[4]) +
                        parseInt(paddedValue[6]) + parseInt(paddedValue[8]) + parseInt(paddedValue[10]);

            // 2. Sum digits at even positions (2nd, 4th, 6th, 8th, 10th, 12th) and multiply by 3
            let evenSum = (parseInt(paddedValue[1]) + parseInt(paddedValue[3]) + parseInt(paddedValue[5]) +
                        parseInt(paddedValue[7]) + parseInt(paddedValue[9]) + parseInt(paddedValue[11])) * 3;

            let totalSum = oddSum + evenSum;

            // 3. The check digit is what you need to add to make the total a multiple of 10
            let lastDigit = totalSum % 10;
            let checkDigit = (10 - lastDigit) % 10; // The modulo 10 handles the case where result is 10
            let ean13Barcode = value + checkDigit;

            console.log('Check digit:', checkDigit);
            console.log('Complete EAN-13:', ean13Barcode);

            // Set the new_barcode (complete EAN-13) in your form
            setEditValue('new_barcode', ean13Barcode);

        },
        800
    );

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
                    <Badge color="cyan" variant="filled" size="sm">NEW BARCODE</Badge>
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
                                                onChange={barcodeNumericInput.onChange}
                                                onKeyPress={barcodeNumericInput.onKeyPress}
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
                                        RAW BARCODE <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="raw_barcode"
                                        control={control}
                                        render={({ field }) => (
                                            <TextInput
                                                placeholder="Enter raw barcode (12 digits)"
                                                size="md"
                                                value={field.value}
                                                onChange={rawBarcodeNumericInput.onChange}
                                                onKeyPress={rawBarcodeNumericInput.onKeyPress}
                                                error={errors.raw_barcode?.message}
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
                                        NEW BARCODE (EAN-13)
                                    </Text>
                                    <TextInput
                                        placeholder="Auto-generated with check digit"
                                        size="md"
                                        readOnly
                                        value={watch('new_barcode') || ''}
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
                                        PRIMARY BARCODE <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="is_primary_barcode"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                placeholder="Select Yes or No"
                                                size="md"
                                                data={[
                                                    { value: 'yes', label: 'Yes' },
                                                    { value: 'no', label: 'No' }
                                                ]}
                                                clearable
                                                error={errors.is_primary_barcode?.message}
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
                    isLoading={isLoadingRecords || isFetchingRecords}
                    emptyMessage="No encoded records yet."
                    columns={getNewBarcodeColumns({
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
                                    <Text size="sm">{pendingFormData.description || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Raw Barcode:</Text>
                                    <Text size="sm">{pendingFormData.raw_barcode || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>New Barcode (EAN-13):</Text>
                                    <Text size="sm">{pendingFormData.new_barcode || 'N/A'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={600}>Primary Barcode:</Text>
                                    <Badge color={pendingFormData.is_primary_barcode === 'yes' ? 'green' : 'gray'} size="sm">
                                        {pendingFormData.is_primary_barcode === 'yes' ? 'YES' : 'NO'}
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
                                    <Badge color="cyan" variant="light">NEW BARCODE</Badge>
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
                size="lg"
                styles={{
                    title: {
                        fontSize: rem(18),
                        fontWeight: 700,
                        backgroundColor: '#22b8cf',
                        color: 'white',
                        margin: rem(-16),
                        marginBottom: rem(20),
                        padding: `${rem(16)} ${rem(20)}`,
                    },
                    header: {
                        backgroundColor: '#22b8cf',
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
                                        Description
                                    </Text>
                                    <Controller
                                        name="description"
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
                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        Raw Barcode <span style={{ color: '#fa5252' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="raw_barcode"
                                        control={editControl}
                                        render={({ field }) => (
                                            <TextInput
                                                size="sm"
                                                placeholder="Enter raw barcode (12 digits)"
                                                value={field.value}
                                                onChange={editRawBarcodeNumericInput.onChange}
                                                onKeyPress={editRawBarcodeNumericInput.onKeyPress}
                                                error={editErrors.raw_barcode?.message}
                                            />
                                        )}
                                    />
                                </Box>

                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        New Barcode (EAN-13)
                                    </Text>
                                    <Controller
                                        name="new_barcode"
                                        control={editControl}
                                        render={({ field }) => (
                                            <TextInput
                                                {...field}
                                                size="sm"
                                                placeholder="EAN-13 barcode"
                                                readOnly
                                                error={editErrors.new_barcode?.message}
                                                styles={{
                                                    input: {
                                                        backgroundColor: '#f8f9fa',
                                                        color: '#6c757d',
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                </Box>

                                <Box>
                                    <Text size="xs" fw={600} mb={rem(6)} c="#495057">
                                        Primary Barcode <span style={{ color: '#fa5252' }}>*</span>
                                    </Text>
                                    <Controller
                                        name="is_primary_barcode"
                                        control={editControl}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                size="sm"
                                                placeholder="Select Yes or No"
                                                data={[
                                                    { value: 'yes', label: 'Yes' },
                                                    { value: 'no', label: 'No' }
                                                ]}
                                                clearable
                                                error={editErrors.is_primary_barcode?.message}
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
                                color="cyan"
                                leftSection={<IconDeviceFloppy size={18} />}
                                loading={updateBatchRecordMutation.isPending}
                                styles={{
                                    root: {
                                        backgroundColor: '#22b8cf',
                                        '&:hover': {
                                            backgroundColor: '#15aabf',
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

export default function NewBarcodePage() {
    return (
        <Suspense fallback={
            <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
                <Text>Loading...</Text>
            </Box>
        }>
            <NewBarcodeContent />
        </Suspense>
    );
}
