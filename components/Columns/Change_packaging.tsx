import { Button, Group, Image, Text } from '@mantine/core';
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
            accessor: 'image',
            title: 'Image',
            width: 100,
            textAlign: 'center' as const,
            render: (record: any) => {
                if (record.image_url) {
                    return (
                        <Image
                            src={record.image_url}
                            alt={record.sku}
                            width={50}
                            height={50}
                            fit="contain"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                modals.open({
                                    title: `Image - SKU: ${record.sku}`,
                                    centered: true,
                                    size: 'lg',
                                    children: (
                                        <Image
                                            src={record.image_url}
                                            alt={record.sku}
                                            fit="contain"
                                        />
                                    ),
                                });
                            }}
                        />
                    );
                }
                return <Text size="xs" c="dimmed">No image</Text>;
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
