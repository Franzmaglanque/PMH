import { Button, Group, Badge, Text } from '@mantine/core';
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
        accessor: 'store_count',
        title: 'Store Count',
        width: 120,
        textAlign: 'center' as const,
        render: (record: any) => (
            <Badge color="blue" variant="filled">
                {record.store_listings?.length || 0}
            </Badge>
        ),
    },
    {
        accessor: 'store_details',
        title: 'Store Details',
        width: 250,
        render: (record: any) => {
            const storeListings = record.store_listings || [];
            if (storeListings.length === 0) return <Text size="sm" c="dimmed">No stores</Text>;

            const preview = storeListings.slice(0, 3).map((store: any) =>
                `${store.store_code} (${store.action === 'add' ? 'Add' : 'Remove'})`
            ).join(', ');

            const remaining = storeListings.length > 3 ? ` +${storeListings.length - 3} more` : '';

            return (
                <Text size="sm" lineClamp={1}>
                    {preview}{remaining}
                </Text>
            );
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
                                    <br />
                                    <strong>Stores affected:</strong> {record.store_listings?.length || 0}
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
