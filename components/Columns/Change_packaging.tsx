import { Button, Group } from '@mantine/core';
import { modals } from '@mantine/modals';

interface ChangePackagingColumnsProps {
    onDelete: (recordId: number) => void;
    onEdit: (record: any) => void;
}

export const getChangePackagingColumns = ({ onDelete, onEdit }: ChangePackagingColumnsProps) => [
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
        title: 'Display Name',
        ellipsis: true,
    },
    {
        accessor: 'uom',
        title: 'UOM',
        width: 100,
    },
    {
        accessor: 'standard_pack',
        title: 'Standard Pack',
        width: 120,
        textAlign: 'center' as const,
    },
    {
        accessor: 'cost',
        title: 'Cost',
        width: 100,
        textAlign: 'right' as const,
        render: (record: any) => {
            return record.cost ? `₱${parseFloat(record.cost).toFixed(2)}` : 'N/A';
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
                                    <strong>Display Name:</strong> {record.long_name}
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
