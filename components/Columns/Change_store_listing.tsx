import { Button, Group, Badge } from '@mantine/core';
import { modals } from '@mantine/modals';

interface ChangeStoreListingColumnsProps {
    onDelete: (recordId: number) => void;
    onEdit: (record: any) => void;
}

export const getChangeStoreListingColumns = ({ onDelete, onEdit }: ChangeStoreListingColumnsProps) => [
    {
        accessor: 'barcode',
        title: 'Barcode',
        width: 150,
        ellipsis: true,
    },
    {
        accessor: 'sku',
        title: 'SKU #',
        width: 120,
    },
    {
        accessor: 'long_name',
        title: 'Description',
        ellipsis: true,
    },
    {
        accessor: 'action_type',
        title: 'Action',
        width: 120,
        render: (record: any) => {
            const actionType = record.action_type?.toUpperCase();
            const colorMap: Record<string, string> = {
                'ADD': 'green',
                'REMOVE': 'red',
                'REPLACE': 'blue',
            };
            return (
                <Badge
                    color={colorMap[actionType] || 'gray'}
                    variant="light"
                >
                    {actionType}
                </Badge>
            );
        },
    },
    {
        accessor: 'store_count',
        title: 'Store Count',
        width: 120,
        textAlign: 'center' as const,
        render: (record: any) => (
            <Badge color="gray" variant="filled">
                {record.store_count || 0}
            </Badge>
        ),
    },
    {
        accessor: 'stores',
        title: 'Stores',
        ellipsis: true,
        render: (record: any) => {
            // Display stores as comma-separated list or array
            if (Array.isArray(record.stores)) {
                return record.stores.join(', ');
            }
            return record.stores || 'N/A';
        },
    },
    {
        accessor: 'actions',
        title: 'Actions',
        width: 150,
        textAlign: 'center' as const,
        render: (record: any) => (
            <Group gap="xs" justify="center">
                <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={() => onEdit(record)}
                >
                    Edit
                </Button>
                <Button
                    size="xs"
                    variant="light"
                    color="red"
                    onClick={() => {
                        modals.openConfirmModal({
                            title: 'Delete Record',
                            centered: true,
                            children: (
                                <>
                                    Are you sure you want to delete this record?
                                    <br />
                                    <strong>SKU:</strong> {record.sku}
                                    <br />
                                    <strong>Description:</strong> {record.long_name}
                                </>
                            ),
                            labels: { confirm: 'Delete', cancel: 'Cancel' },
                            confirmProps: { color: 'red' },
                            onConfirm: () => onDelete(record.id),
                        });
                    }}
                >
                    Delete
                </Button>
            </Group>
        ),
    },
];
