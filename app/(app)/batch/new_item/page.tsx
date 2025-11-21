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
  FileInput,
  Alert,
  Anchor,
  Radio,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconCheck,
  IconUpload,
  IconDownload,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBatchRecords,
  saveBatchRecord,
  deleteBatchRecord,
  updateBatchRecord,
  postBatch,
  fetchStoreListingTemplate,
  fetchUOM,
  fetchDepartment,
  fetchSubDepartment,
  fetchSellingUOM
} from '@/app/api/batch_request_api';
import {
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification,
} from '@/lib/notifications';
import { StyledDataTable } from '@/lib/dataTableHelper';
import { newItemSchema, type NewItemInput } from '@/lib/schemas/new_item.schema';
import { getNewItemColumns } from '@/components/Columns/New_item';
import { parseStoresFromExcel, validateStoreCodes, downloadBlobFile } from '@/lib/excelHelper';
import { useNumericInput } from '@/lib/inputHelpers';

function NewItemContent() {
  const PAGE_TYPE = 'new_item';
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const batchNumber = searchParams.get('batch_number');
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<NewItemInput | null>(null);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [postBatchModalOpened, setPostBatchModalOpened] = useState(false);
  const [storesFile, setStoresFile] = useState<File | null>(null);
  const [uploadedStores, setUploadedStores] = useState<string[]>([]);
  const [storesFileParseError, setStoresFileParseError] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const numericHandlers = useNumericInput();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
    watch,
  } = useForm<NewItemInput>({
    resolver: zodResolver(newItemSchema),
    defaultValues: {
      barcode: '',
      case_barcode: '',
      display_name: '',
      brand: '',
      description: '',
      variant: '',
      size: '',
      item_length: '',
      item_width: '',
      item_height: '',
      item_weight: '',
      case_length: '',
      case_width: '',
      case_height: '',
      case_weight: '',
      uom: '',
      standard_pack: '',
      department: '',
      sub_department: '',
      selling_uom: '',
      shelf_life: '',
      item_type: 'Regular',
      listing_fee: 'no',
      item_status: undefined,
      evaluation_period: undefined,
      sampling_activity: '',
      push_girl: '',
      tactical_display: '',
      sku_type: 'Consign',
      commission: '',
      stores_file: undefined,
      srp: '',
      case_cost: '',
      image_file: null,
    },
  });

  // Watch for fields that auto-populate display_name
  const brand = watch('brand');
  const description = watch('description');
  const variant = watch('variant');
  const size = watch('size');
  const itemType = watch('item_type');
  const listingFee = watch('listing_fee');
  const selectedDepartment = watch('department');

  
  const { data: UOMRecords, isLoading: isUOMLoading, error:UOMError } = useQuery({
      queryKey: ['UOMRecords'],
      queryFn: () => fetchUOM(),
  });

  const { data: sellingUOMRecords, isLoading: isSellingUOMLoading, error:sellingUOMError } = useQuery({
      queryKey: ['sellingUOMRecords'],
      queryFn: () => fetchSellingUOM(),
  });

  const { data: departmentList, isLoading: isDepartmentLoading, error:departmentError } = useQuery({
      queryKey: ['departmentRecords'],
      queryFn: () => fetchDepartment(),
  });

  const { data: subDepartmentList, isLoading: isSubDepartmentLoading, error:subdepartmentError } = useQuery({
      queryKey: ['subDepartmentRecords',selectedDepartment],
      queryFn: () => fetchSubDepartment(selectedDepartment),
      enabled: !!selectedDepartment
  });

  // Fetch batch records
  const {
    data: batchRecords,
    isLoading: isLoadingRecords,
    isFetching: isFetchingRecords,
  } = useQuery({
    queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
    queryFn: () => fetchBatchRecords(batchNumber!, PAGE_TYPE as any),
    enabled: !!batchNumber,
    retry: false,
  });
  

  // Auto-populate display_name when brand, description, variant, or size changes
  useEffect(() => {
    const combined = [brand, description, variant, size]
      .filter(Boolean)
      .join(' ');
    setValue('display_name', combined);
  }, [brand, description, variant, size, setValue]);

  // Separate form for editing records
  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    reset: resetEdit,
    formState: { errors: editErrors },
    watch: watchEdit,
  } = useForm<NewItemInput>({
    resolver: zodResolver(newItemSchema),
  });

  const editBrand = watchEdit('brand');
  const editDescription = watchEdit('description');
  const editVariant = watchEdit('variant');
  const editSize = watchEdit('size');
  const editItemType = watchEdit('item_type');
  const editListingFee = watchEdit('listing_fee');

  // Auto-populate display_name in edit modal
  useEffect(() => {
    const combined = [editBrand, editDescription, editVariant, editSize]
      .filter(Boolean)
      .join(' ');
    setEditValue('display_name', combined);
  }, [editBrand, editDescription, editVariant, editSize, setEditValue]);

  const saveBatchRecordMutation = useMutation({
    mutationFn: saveBatchRecord,
    onSuccess: (data) => {
      console.log('API Response:', data);

      if (data.status) {
        showSuccessNotification(
          'Record Saved',
          data.message || 'New item has been saved successfully'
        );
        queryClient.invalidateQueries({
          queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
        });
        reset();
        setStoresFile(null);
        setUploadedStores([]);
        setStoresFileParseError('');
        setImageFile(null);
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
        showSuccessNotification('Item Updated', data.message);
        queryClient.invalidateQueries({
          queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
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
        showSuccessNotification('Record Deleted', data.message);
        queryClient.invalidateQueries({
          queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
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
        showSuccessNotification('Batch Posted', data.message);
        queryClient.invalidateQueries({
          queryKey: ['batchRecords', batchNumber, PAGE_TYPE],
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
      request_type: PAGE_TYPE,
    });
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setEditValue('barcode', record.barcode || '');
    setEditValue('case_barcode', record.case_barcode || '');
    setEditValue('brand', record.brand || '');
    setEditValue('description', record.description || '');
    setEditValue('variant', record.variant || '');
    setEditValue('size', record.size || '');
    setEditValue('item_length', record.item_length || '');
    setEditValue('item_width', record.item_width || '');
    setEditValue('item_height', record.item_height || '');
    setEditValue('item_weight', record.item_weight || '');
    setEditValue('case_length', record.case_length || '');
    setEditValue('case_width', record.case_width || '');
    setEditValue('case_height', record.case_height || '');
    setEditValue('case_weight', record.case_weight || '');
    setEditValue('uom', record.uom || '');
    setEditValue('standard_pack', record.standard_pack || '');
    setEditValue('department', record.department || '');
    setEditValue('sub_department', record.sub_department || '');
    setEditValue('selling_uom', record.selling_uom || '');
    setEditValue('shelf_life', record.shelf_life || '');
    setEditValue('item_type', record.item_type || 'Regular');
    setEditValue('listing_fee', record.listing_fee || undefined);
    setEditValue('item_status', record.item_status || undefined);
    setEditValue('evaluation_period', record.evaluation_period || undefined);
    setEditValue('sampling_activity', record.sampling_activity || '');
    setEditValue('push_girl', record.push_girl || '');
    setEditValue('tactical_display', record.tactical_display || '');
    setEditValue('sku_type', record.sku_type || 'Consign');
    setEditValue('commission', record.commission || '');
    setEditValue('srp', record.srp || '');
    setEditValue('case_cost', record.case_cost || '');
    setEditModalOpened(true);
  };

  const onEditSubmit = (data: NewItemInput) => {
    console.log('Edit form submitted:', data);

    const formData = new FormData();
    formData.append('barcode', data.barcode);
    formData.append('case_barcode', data.case_barcode);
    formData.append('display_name', data.display_name || '');
    formData.append('brand', data.brand);
    formData.append('description', data.description);
    formData.append('variant', data.variant);
    formData.append('size', data.size);
    formData.append('item_length', data.item_length);
    formData.append('item_width', data.item_width);
    formData.append('item_height', data.item_height);
    formData.append('item_weight', data.item_weight);
    formData.append('case_length', data.case_length);
    formData.append('case_width', data.case_width);
    formData.append('case_height', data.case_height);
    formData.append('case_weight', data.case_weight);
    formData.append('uom', data.uom);
    formData.append('standard_pack', data.standard_pack);
    formData.append('department', data.department);
    formData.append('sub_department', data.sub_department);
    formData.append('selling_uom', data.selling_uom);
    formData.append('shelf_life', data.shelf_life);
    formData.append('item_type', data.item_type);
    if (data.listing_fee) {
      formData.append('listing_fee', data.listing_fee);
    }
    if (data.item_status) {
      formData.append('item_status', data.item_status);
    }
    if (data.evaluation_period) {
      formData.append('evaluation_period', data.evaluation_period);
    }
    formData.append('sampling_activity', data.sampling_activity || '');
    formData.append('push_girl', data.push_girl || '');
    formData.append('tactical_display', data.tactical_display || '');
    formData.append('sku_type', data.sku_type);
    formData.append('commission', data.commission || '');
    formData.append('srp', data.srp);
    formData.append('case_cost', data.case_cost);
    formData.append('batch_number', batchNumber || '');
    formData.append('request_type', PAGE_TYPE);
    formData.append('record_id', editingRecord?.id);

    updateBatchRecordMutation.mutate(formData);
  };

  const handleCancelEdit = () => {
    setEditModalOpened(false);
    setEditingRecord(null);
    resetEdit();
  };

  const onSubmit = (data: NewItemInput) => {
    console.log('Form submitted (validated by Zod):', data);
    setPendingFormData(data);
    setConfirmModalOpened(true);
  };

  const handleConfirmSave = () => {
    if (!pendingFormData || !batchNumber) return;

    const formData = new FormData();
    formData.append('barcode', pendingFormData.barcode);
    formData.append('case_barcode', pendingFormData.case_barcode);
    formData.append('display_name', pendingFormData.display_name || '');
    formData.append('brand', pendingFormData.brand);
    formData.append('description', pendingFormData.description);
    formData.append('variant', pendingFormData.variant);
    formData.append('size', pendingFormData.size);
    formData.append('item_length', pendingFormData.item_length);
    formData.append('item_width', pendingFormData.item_width);
    formData.append('item_height', pendingFormData.item_height);
    formData.append('item_weight', pendingFormData.item_weight);
    formData.append('case_length', pendingFormData.case_length);
    formData.append('case_width', pendingFormData.case_width);
    formData.append('case_height', pendingFormData.case_height);
    formData.append('case_weight', pendingFormData.case_weight);
    formData.append('uom', pendingFormData.uom);
    formData.append('standard_pack', pendingFormData.standard_pack);
    formData.append('department', pendingFormData.department);
    formData.append('sub_department', pendingFormData.sub_department);
    formData.append('selling_uom', pendingFormData.selling_uom);
    formData.append('shelf_life', pendingFormData.shelf_life);
    formData.append('item_type', pendingFormData.item_type);
    if (pendingFormData.listing_fee) {
      formData.append('listing_fee', pendingFormData.listing_fee);
    }
    if (pendingFormData.item_status) {
      formData.append('item_status', pendingFormData.item_status);
    }
    if (pendingFormData.evaluation_period) {
      formData.append('evaluation_period', pendingFormData.evaluation_period);
    }
    formData.append('sampling_activity', pendingFormData.sampling_activity || '');
    formData.append('push_girl', pendingFormData.push_girl || '');
    formData.append('tactical_display', pendingFormData.tactical_display || '');
    formData.append('sku_type', pendingFormData.sku_type);
    formData.append('commission', pendingFormData.commission || '');
    formData.append('batch_number', batchNumber || '');
    formData.append('request_type', PAGE_TYPE);
    formData.append('srp', pendingFormData.srp);
    formData.append('case_cost', pendingFormData.case_cost);

    // Add stores if uploaded
    if (uploadedStores.length > 0) {
      formData.append('stores', JSON.stringify(uploadedStores));
    }

    // Add image if uploaded
    if (imageFile) {
      formData.append('image_file', imageFile);
    }

    saveBatchRecordMutation.mutate(formData);
  };

  const handleCancelSave = () => {
    setConfirmModalOpened(false);
    setPendingFormData(null);
  };

  const handleGoBack = () => {
    queryClient.invalidateQueries({
      queryKey: ['BatchRecords'],
    });
    router.push('/batch?request_type=new_item');
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
      request_type: PAGE_TYPE,
    });
    setPostBatchModalOpened(false);
  };

  const handleCancelPostBatch = () => {
    setPostBatchModalOpened(false);
  };

  // Handle stores file upload
  const handleStoresFileChange = async (file: File | null) => {
    setStoresFile(file);
    setStoresFileParseError('');
    setUploadedStores([]);

    if (!file) {
      setValue('stores_file', undefined);
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
        setValue('stores_file', undefined);
        return;
      }

      setUploadedStores(valid);
      setValue('stores_file', file);
      showSuccessNotification(
        'Store File Parsed Successfully',
        `${valid.length} store code(s) loaded from file.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to parse file';
      setStoresFileParseError(errorMessage);
      setStoresFile(null);
      setValue('stores_file', undefined);
      showErrorNotification('File Parse Error', errorMessage);
    }
  };

  // Handle store listing template download
  const handleDownloadTemplate = async () => {
    try {
      const blob = await fetchStoreListingTemplate();
      downloadBlobFile(blob, 'store_listing_template.xlsx');

      showSuccessNotification(
        'Template Downloaded',
        'Store listing template has been downloaded to your computer.'
      );
    } catch (error) {
      showErrorNotification(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to download template'
      );
    }
  };

  // Handle image file upload
  const handleImageFileChange = (file: File | null) => {
    setImageFile(file);
    setValue('image_file', file);
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
          <Text size="sm" fw={600}>
            Batch Status:
          </Text>
          <Badge color="gray" variant="filled" size="sm">
            OPEN
          </Badge>
          <Text size="sm" fw={600} ml="md">
            Request Type:
          </Text>
          <Badge color="violet" variant="filled" size="sm">
            NEW ITEM
          </Badge>
        </Group>
      </Box>

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Paper shadow="sm" p={0} withBorder style={{ overflow: 'hidden', position: 'relative' }}>
          <LoadingOverlay
            visible={saveBatchRecordMutation.isPending}
            zIndex={1000}
            overlayProps={{ radius: 'sm', blur: 2 }}
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
                color: '#495057',
              }}
            >
              ITEM DESCRIPTION
            </Title>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    BARCODE <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="barcode"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="Enter barcode"
                        size="md"
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    CASE BARCODE <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="case_barcode"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="Enter case barcode"
                        size="md"
                        error={errors.case_barcode?.message}
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
                    DISPLAY NAME (Auto-populated)
                  </Text>
                  <TextInput
                    placeholder="Auto-populated from Brand + Description + Variant + Size"
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    BRAND <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="brand"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="Enter brand"
                        size="md"
                        error={errors.brand?.message}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    DESCRIPTION <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="Enter description"
                        size="md"
                        error={errors.description?.message}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    VARIANT <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="variant"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="Enter variant"
                        size="md"
                        error={errors.variant?.message}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    SIZE <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="size"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="Enter size"
                        size="md"
                        error={errors.size?.message}
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

          <Divider />

          {/* Item Dimensions Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              ITEM DIMENSIONS
            </Title>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    LENGTH (CM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="item_length"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.item_length?.message}
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

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    WIDTH (CM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="item_width"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.item_width?.message}
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

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    HEIGHT (CM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="item_height"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.item_height?.message}
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

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    WEIGHT (KG) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="item_weight"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.item_weight?.message}
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

          <Divider />

          {/* Case Dimensions Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              CASE DIMENSIONS
            </Title>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    LENGTH (CM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="case_length"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.case_length?.message}
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

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    WIDTH (CM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="case_width"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.case_width?.message}
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

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    HEIGHT (CM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="case_height"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.case_height?.message}
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

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    WEIGHT (KG) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="case_weight"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="0.00"
                        size="md"
                        error={errors.case_weight?.message}
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

          <Divider />

          {/* Other Item Information Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              OTHER ITEM INFORMATION
            </Title>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    UNIT OF MEASURE (UOM) <span style={{ color: 'red' }}>*</span>
                  </Text>
                 <Controller
                    name="uom"
                    control={control}
                    render={({ field }) => (
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
                    )}
                  />
                </Box>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    DEPARTMENT <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="department"
                    control={control}
                    render={({ field }) => (
                      <Select
                          {...field}
                          value={field.value || null}
                          placeholder={isDepartmentLoading ? "Loading..." : "Select Department"}
                          size="md"
                          data={departmentList?.data.map((record:any) => ({
                              value: record.IDEPT,
                              label: `${record.DEPT_DESC}`
                          })) || []}
                          searchable
                          clearable
                          error={errors.department?.message}
                          disabled={isDepartmentLoading}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    SUB DEPARTMENT <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="sub_department"
                    control={control}
                    render={({ field }) => (
                      <Select
                          {...field}
                          value={field.value || null}
                          placeholder={isSubDepartmentLoading ? "Loading..." : "Select Sub Department"}
                          size="md"
                          data={subDepartmentList?.data.subDepartment.map((record:any) => ({
                              value: record.ISDEPT,
                              label: `${record.DEPT_DESC}`
                          })) || []}
                          searchable
                          clearable
                          error={errors.department?.message}
                          disabled={isSubDepartmentLoading}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    SELLING UOM <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="selling_uom"
                    control={control}
                    render={({ field }) => (
                      <Select
                          {...field}
                          value={field.value || null}
                          placeholder={isSellingUOMLoading ? "Loading..." : "Select Selling UOM"}
                          size="md"
                          data={sellingUOMRecords?.data.map((record:any) => ({
                              value: record.IUNMSR,
                              label: `${record.IUNMSR} - ${record.IUMDSC}`
                          })) || []}
                          searchable
                          clearable
                          error={errors.selling_uom?.message}
                          disabled={isSellingUOMLoading}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    SHELF LIFE (DAYS) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="shelf_life"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        onChange={(e) => {
                          numericHandlers.onChange(e); // Filter to numeric only
                          field.onChange(e.target.value); // Update form state
                        }}
                        placeholder="Enter shelf life in days"
                        size="md"
                        error={errors.shelf_life?.message}
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

          <Divider />

          {/* Item Details Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              ITEM DETAILS
            </Title>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    ITEM TYPE <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="item_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="Select item type"
                        size="md"
                        data={[
                          { value: 'Regular', label: 'Regular' },
                          { value: 'Promo', label: 'Promo' },
                          { value: 'Seasonal', label: 'Seasonal' },
                        ]}
                        error={errors.item_type?.message}
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

              {/* Show Listing Fee for Regular items */}
              {itemType === 'Regular' && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                      LISTING FEE <span style={{ color: 'red' }}>*</span>
                    </Text>
                    <Controller
                      name="listing_fee"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select listing fee option"
                          size="md"
                          data={[
                            { value: 'yes', label: 'Yes' },
                            { value: 'no', label: 'No' },
                          ]}
                          error={errors.listing_fee?.message}
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
              )}

              {/* Show Item Status for Promo/Seasonal items */}
              {(itemType === 'Promo' || itemType === 'Seasonal') && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                      ITEM STATUS <span style={{ color: 'red' }}>*</span>
                    </Text>
                    <Controller
                      name="item_status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select item status"
                          size="md"
                          data={[
                            { value: 'A', label: 'A - Active' },
                            { value: 'N', label: 'N - Not to be reordered' },
                          ]}
                          error={errors.item_status?.message}
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
              )}

              {itemType === 'Regular' && listingFee === 'yes' && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Box>
                    <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                      EVALUATION PERIOD <span style={{ color: 'red' }}>*</span>
                    </Text>
                    <Controller
                      name="evaluation_period"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select evaluation period"
                          size="md"
                          data={[
                            { value: '3_months', label: '3 Months' },
                            { value: '6_months', label: '6 Months' },
                            { value: '12_months', label: '12 Months' },
                          ]}
                          error={errors.evaluation_period?.message}
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
              )}

              <Grid.Col span={12}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    MARKETING SUPPORT (Optional - Digits only)
                  </Text>
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Controller
                        name="sampling_activity"
                        control={control}
                        render={({ field }) => (
                          <TextInput
                            {...field}
                            placeholder="Sampling Activity # of Stores"
                            size="md"
                            onChange={(e) => {
                              numericHandlers.onChange(e); // Filter to numeric only
                              field.onChange(e.target.value); // Update form state
                            }}
                            error={errors.sampling_activity?.message}
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
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Controller
                        name="push_girl"
                        control={control}
                        render={({ field }) => (
                          <TextInput
                            {...field}
                            placeholder="Push Girl # of Stores"
                            size="md"
                            onChange={(e) => {
                              numericHandlers.onChange(e); // Filter to numeric only
                              field.onChange(e.target.value); // Update form state
                            }}
                            error={errors.push_girl?.message}
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
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Controller
                        name="tactical_display"
                        control={control}
                        render={({ field }) => (
                          <TextInput
                            {...field}
                            placeholder="Tactical Display # of Stores"
                            size="md"
                            onChange={(e) => {
                              numericHandlers.onChange(e); // Filter to numeric only
                              field.onChange(e.target.value); // Update form state
                            }}
                            error={errors.tactical_display?.message}
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
                  </Grid>
                </Box>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    SKU TYPE <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="sku_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="Select SKU type"
                        size="md"
                        data={[
                          { value: 'Consign', label: 'Consign' },
                          { value: 'Concess', label: 'Concess' },
                          { value: 'Outright', label: 'Outright' },
                        ]}
                        error={errors.sku_type?.message}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    COMMISSION (Optional)
                  </Text>
                  <Controller
                    name="commission"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="0.00"
                        size="md"
                        leftSection={<Text size="sm" fw={600} c="orange">%</Text>}
                        error={errors.commission?.message}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow digits and one decimal point with up to 2 decimals
                          if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                            field.onChange(value);
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
                    )}
                  />
                </Box>
              </Grid.Col>
            </Grid>
          </Box>

          <Divider />

          {/* Location Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              LOCATION - UPLOAD STORES
            </Title>

            <Box>
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
                <Alert icon={<IconCheck size={16} />} color="green" variant="light" mt="md">
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
          </Box>

          <Divider />

          {/* Price/Cost Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              PRICE / COST
            </Title>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    SRP (Suggested Retail Price) <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="srp"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="0.00"
                        size="md"
                        leftSection={<Text size="sm" fw={600} c="blue">₱</Text>}
                        error={errors.srp?.message}
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

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box>
                  <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                    CASE COST <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Controller
                    name="case_cost"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        placeholder="0.00"
                        size="md"
                        leftSection={<Text size="sm" fw={600} c="green">₱</Text>}
                        error={errors.case_cost?.message}
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
            </Grid>
          </Box>

          <Divider />

          {/* Upload Image Section */}
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Title
              order={5}
              mb="lg"
              fw={700}
              style={{
                fontSize: rem(13),
                letterSpacing: '0.5px',
                color: '#495057',
              }}
            >
              UPLOAD IMAGE
            </Title>

            <Box>
              <Text size="sm" fw={600} mb={rem(8)} c="#495057">
                PRODUCT IMAGE (Optional)
              </Text>
              <FileInput
                placeholder="Choose image file (JPG, PNG)"
                size="md"
                accept="image/jpeg,image/png,image/jpg"
                leftSection={<IconUpload size={18} />}
                value={imageFile}
                onChange={handleImageFileChange}
                clearable
                error={errors.image_file?.message?.toString()}
                styles={{
                  input: {
                    border: '1px solid #dee2e6',
                    borderRadius: rem(4),
                    fontSize: rem(14),
                  },
                }}
              />
              <Text size="xs" c="dimmed" mt={rem(4)}>
                Upload a JPG or PNG image of the product
              </Text>
              {imageFile && (
                <Alert icon={<IconCheck size={16} />} color="green" variant="light" mt="md">
                  <Text size="sm" fw={600}>
                    Image ready: {imageFile.name}
                  </Text>
                </Alert>
              )}
            </Box>
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
          columns={getNewItemColumns({
            onDelete: handleDeleteRecord,
            onEdit: handleEditRecord,
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
            <Text fw={700} size="lg">
              Confirm Save
            </Text>
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
            You are about to save this new item. Please review the details below:
          </Text>

          {pendingFormData && (
            <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Display Name:
                  </Text>
                  <Text size="sm" style={{ maxWidth: '60%', textAlign: 'right' }}>
                    {pendingFormData.display_name || 'N/A'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Barcode:
                  </Text>
                  <Text size="sm">{pendingFormData.barcode || 'N/A'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Item Type:
                  </Text>
                  <Badge color="blue" variant="filled" size="sm">
                    {pendingFormData.item_type}
                  </Badge>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    SRP:
                  </Text>
                  <Text size="sm" fw={600} c="blue">
                    ₱{pendingFormData.srp || '0.00'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Case Cost:
                  </Text>
                  <Text size="sm" fw={600} c="green">
                    ₱{pendingFormData.case_cost || '0.00'}
                  </Text>
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
              disabled={saveBatchRecordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color="violet"
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleConfirmSave}
              loading={saveBatchRecordMutation.isPending}
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
            <Text fw={700} size="lg">
              Confirm Post Batch
            </Text>
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
            You are about to post this batch. Once posted, the batch will be submitted and no
            further changes can be made.
          </Text>

          <Paper p="md" withBorder style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
            <Group gap="xs" mb="xs">
              <Text size="sm" fw={700} c="#856404">
                Warning:
              </Text>
            </Group>
            <Text size="sm" c="#856404">
              This action will finalize the batch and all encoded records. Make sure all records are
              correct before proceeding.
            </Text>
          </Paper>

          <Box>
            <Text size="sm" fw={600} mb="xs">
              Batch Details:
            </Text>
            <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Batch Number:
                  </Text>
                  <Text size="sm">{batchNumber}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Request Type:
                  </Text>
                  <Badge color="violet" variant="light">
                    NEW ITEM
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Total Records:
                  </Text>
                  <Badge color="gray" variant="filled">
                    {batchRecords?.length || 0}
                  </Badge>
                </Group>
              </Stack>
            </Paper>
          </Box>

          <Text size="sm" c="dimmed" fw={600}>
            Do you want to proceed with posting this batch?
          </Text>

          <Group justify="flex-end" gap="md" mt="md">
            <Button variant="light" color="gray" onClick={handleCancelPostBatch}>
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

      {/* Edit Record Modal - Simplified version for demonstration */}
      <Modal
        opened={editModalOpened}
        onClose={handleCancelEdit}
        title="Update New Item Record"
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
            <Text size="sm" c="dimmed">
              Edit functionality for new items will allow updating all fields.
            </Text>

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

export default function NewItemPage() {
  return (
    <Suspense
      fallback={
        <Box style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: rem(20) }}>
          <Text>Loading...</Text>
        </Box>
      }
    >
      <NewItemContent />
    </Suspense>
  );
}
