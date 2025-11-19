import { Button, Group, Badge } from '@mantine/core';
import { modals } from '@mantine/modals';

interface NewItemColumnsProps {
    onDelete: (recordId: number) => void;
    onEdit: (record: any) => void;
}

export const getNewItemColumns = ({ onDelete, onEdit }: NewItemColumnsProps) => [
    {
        accessor: 'barcode',
        title: 'Barcode',
        width: 130,
        ellipsis: true,
    },
    {
        accessor: 'case_barcode',
        title: 'Case Barcode',
        width: 130,
        ellipsis: true,
    },
    {
        accessor: 'display_name',
        title: 'Display Name',
        ellipsis: true,
    },
    {
        accessor: 'department',
        title: 'Department',
        width: 150,
        ellipsis: true,
    },
    {
        accessor: 'item_type',
        title: 'Item Type',
        width: 120,
        textAlign: 'center' as const,
        render: (record: any) => {
            const color =
                record.item_type === 'Regular' ? 'blue' :
                record.item_type === 'Promo' ? 'orange' :
                'grape';
            return (
                <Badge color={color} variant="filled" size="sm">
                    {record.item_type}
                </Badge>
            );
        },
    },
    {
        accessor: 'sku_type',
        title: 'SKU Type',
        width: 120,
        textAlign: 'center' as const,
        render: (record: any) => {
            const color =
                record.sku_type === 'Consign' ? 'teal' :
                record.sku_type === 'Concess' ? 'cyan' :
                'indigo';
            return (
                <Badge color={color} variant="light" size="sm">
                    {record.sku_type}
                </Badge>
            );
        },
    },
    {
        accessor: 'srp',
        title: 'SRP',
        width: 100,
        textAlign: 'right' as const,
        render: (record: any) => `₱${parseFloat(record.srp || 0).toFixed(2)}`,
    },
    {
        accessor: 'case_cost',
        title: 'Case Cost',
        width: 100,
        textAlign: 'right' as const,
        render: (record: any) => `₱${parseFloat(record.case_cost || 0).toFixed(2)}`,
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
                                    <strong>Display Name:</strong> {record.display_name}
                                    <br />
                                    <strong>Barcode:</strong> {record.barcode}
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
