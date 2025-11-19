import { Button, Group, Badge, Text } from '@mantine/core';
import { modals } from '@mantine/modals';

interface ChangePriceCostColumnsProps {
    onDelete: (recordId: number) => void;
    onEdit: (record: any) => void;
}

export const getChangePriceCostColumns = ({ onDelete, onEdit }: ChangePriceCostColumnsProps) => [
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
        accessor: 'price',
        title: 'New Price',
        width: 130,
        textAlign: 'right' as const,
        render: (record: any) => (
            <Text size="sm" fw={600} c="blue">
                ₱{record.price ? parseFloat(record.price).toFixed(2) : '0.00'}
            </Text>
        ),
    },
    {
        accessor: 'cost',
        title: 'New Cost',
        width: 130,
        textAlign: 'right' as const,
        render: (record: any) => (
            <Text size="sm" fw={600} c="green">
                ₱{record.cost ? parseFloat(record.cost).toFixed(2) : '0.00'}
            </Text>
        ),
    },
    {
        accessor: 'start_date',
        title: 'Start Date',
        width: 120,
    },
    {
        accessor: 'end_date',
        title: 'End Date',
        width: 120,
    },
    {
        accessor: 'store_listing_type',
        title: 'Listing Type',
        width: 120,
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
