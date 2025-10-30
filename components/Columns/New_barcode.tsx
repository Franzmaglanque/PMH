import { Button, Group, Badge } from '@mantine/core';
import { modals } from '@mantine/modals';

interface NewBarcodeColumnsProps {
    onDelete: (recordId: number) => void;
    onEdit: (record: any) => void;
}

export const getNewBarcodeColumns = ({ onDelete, onEdit }: NewBarcodeColumnsProps) => [
    {
        accessor: 'barcode',
        title: 'Original UPC',
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
        accessor: 'new_barcode',
        title: 'New Barcode',
        width: 150,
        ellipsis: true,
    },
    {
        accessor: 'is_primary',
        title: 'Primary',
        width: 100,
        textAlign: 'center' as const,
        render: (record: any) => {
            const isPrimary = record.is_primary === 'yes' || record.is_primary === '1' || record.is_primary === 1 || record.is_primary === true;
            return (
                <Badge color={isPrimary ? 'green' : 'gray'} variant="filled" size="sm">
                    {isPrimary ? 'YES' : 'NO'}
                </Badge>
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
                                    <strong>New Barcode:</strong> {record.new_barcode}
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
