import { DataTable, DataTableColumn } from 'mantine-datatable';
import { Paper, Title, Group, Badge, Box, rem } from '@mantine/core';
import 'mantine-datatable/styles.css';

/**
 * Configuration options for the DataTable wrapper
 */
export interface DataTableConfig<T = any> {
  /** The data records to display */
  data: T[];
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Whether data is currently being fetched */
  isLoading?: boolean;
  /** Optional title for the table */
  title?: string;
  /** Whether to show record count badge */
  showRecordCount?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Minimum height of the table */
  minHeight?: number;
  /** Whether to show table border */
  withBorder?: boolean;
  /** Whether to show column borders */
  withColumnBorders?: boolean;
  /** Whether to show striped rows */
  striped?: boolean;
  /** Whether to highlight rows on hover */
  highlightOnHover?: boolean;
  /** Additional actions or elements to render in the header */
  headerActions?: React.ReactNode;
}

/**
 * Creates a styled DataTable with consistent design across the application.
 * Provides a wrapper with title, record count, and customizable styling.
 *
 * @example
 * // Basic usage
 * <StyledDataTable
 *   data={records}
 *   columns={[
 *     { accessor: 'name', title: 'Name' },
 *     { accessor: 'email', title: 'Email' },
 *   ]}
 * />
 *
 * @example
 * // With title and record count
 * <StyledDataTable
 *   title="User Records"
 *   showRecordCount
 *   data={users}
 *   columns={columns}
 *   isLoading={isLoading}
 * />
 *
 * @example
 * // With custom header actions
 * <StyledDataTable
 *   title="Batch Records"
 *   data={records}
 *   columns={columns}
 *   headerActions={
 *     <Button onClick={handleAdd}>Add Record</Button>
 *   }
 * />
 */
export function StyledDataTable<T = any>({
  data,
  columns,
  isLoading = false,
  title,
  showRecordCount = false,
  emptyMessage = 'No records found',
  minHeight = 180,
  withBorder = true,
  withColumnBorders = true,
  striped = true,
  highlightOnHover = true,
  headerActions,
}: DataTableConfig<T>) {
  return (
    <Paper shadow="sm" p="xl" withBorder style={{ backgroundColor: 'white' }}>
      {(title || showRecordCount || headerActions) && (
        <Group justify="space-between" mb="lg">
          <Box>
            {title && (
              <Title
                order={5}
                fw={700}
                style={{
                  fontSize: rem(13),
                  letterSpacing: '0.5px',
                  color: '#495057',
                }}
              >
                {title}
              </Title>
            )}
          </Box>
          <Group gap="md">
            {showRecordCount && (
              <Badge color="blue" variant="light" size="lg">
                {data?.length || 0} Records
              </Badge>
            )}
            {headerActions}
          </Group>
        </Group>
      )}

      <DataTable
        withTableBorder={withBorder}
        withColumnBorders={withColumnBorders}
        striped={striped}
        highlightOnHover={highlightOnHover}
        records={data || []}
        fetching={isLoading}
        columns={columns}
        minHeight={minHeight}
        noRecordsText={emptyMessage}
        styles={{
          header: {
            backgroundColor: '#f8f9fa',
            fontWeight: 600,
            fontSize: rem(13),
          },
          table: {
            fontSize: rem(13),
          },
        }}
      />
    </Paper>
  );
}

/**
 * Creates a simple DataTable without the Paper wrapper.
 * Use this when you want more control over the layout.
 *
 * @example
 * <SimpleDataTable
 *   data={records}
 *   columns={columns}
 *   isLoading={isLoading}
 * />
 */
export function SimpleDataTable<T = any>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No records found',
  minHeight = 180,
  withBorder = true,
  withColumnBorders = true,
  striped = true,
  highlightOnHover = true,
}: Omit<DataTableConfig<T>, 'title' | 'showRecordCount' | 'headerActions'>) {
  return (
    <DataTable
      withTableBorder={withBorder}
      withColumnBorders={withColumnBorders}
      striped={striped}
      highlightOnHover={highlightOnHover}
      records={data || []}
      fetching={isLoading}
      columns={columns}
      minHeight={minHeight}
      noRecordsText={emptyMessage}
      styles={{
        header: {
          backgroundColor: '#f8f9fa',
          fontWeight: 600,
          fontSize: rem(13),
        },
        table: {
          fontSize: rem(13),
        },
      }}
    />
  );
}

/**
 * Utility function to create a badge column renderer
 *
 * @example
 * const columns = [
 *   { accessor: 'name', title: 'Name' },
 *   {
 *     accessor: 'status',
 *     title: 'Status',
 *     render: createBadgeRenderer('status', 'blue')
 *   },
 * ]
 */
export function createBadgeRenderer(
  accessor: string,
  color: string = 'blue',
  variant: 'filled' | 'light' | 'outline' = 'light'
) {
  return (record: any) => (
    <Badge color={color} variant={variant} size="sm">
      {record[accessor]}
    </Badge>
  );
}

/**
 * Utility function to create an action button column
 *
 * @example
 * const columns = [
 *   { accessor: 'name', title: 'Name' },
 *   createActionColumn([
 *     { label: 'Edit', color: 'blue', onClick: handleEdit },
 *     { label: 'Delete', color: 'red', onClick: handleDelete },
 *   ])
 * ]
 */
export function createActionColumn<T = any>(
  actions: Array<{
    label: string;
    color?: string;
    variant?: 'filled' | 'light' | 'outline';
    onClick: (record: T) => void;
  }>
): DataTableColumn<T> {
  return {
    accessor: 'actions',
    title: 'Actions',
    width: 100 + actions.length * 50,
    textAlign: 'center',
    render: (record: T) => (
      <Group gap="xs" justify="center">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => action.onClick(record)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              backgroundColor: action.color === 'red' ? '#ffe3e3' : '#e7f5ff',
              color: action.color === 'red' ? '#c92a2a' : '#1971c2',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {action.label}
          </button>
        ))}
      </Group>
    ),
  };
}
