import { Button, Group } from '@mantine/core';
import { modals } from '@mantine/modals';
import { createBadgeRenderer } from '@/lib/dataTableHelper';

interface ChangeStatusColumnsProps {
    onDelete: (recordId: number) => void;
}

export const getChangeStatusColumns = ({ onDelete }: ChangeStatusColumnsProps) => [
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
        accessor: 'sku_status',
        title: 'New Status',
        width: 150,
        render: createBadgeRenderer('sku_status', 'gray', 'light'),
    },
    {
        accessor: 'effectivity_date',
        title: 'Effectivity Date',
        width: 140,
    },
    {
        accessor: 'actions',
        title: 'Actions',
        width: 100,
        textAlign: 'center' as const,
        render: (record: any) => (
            <Group gap="xs" justify="center">
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
