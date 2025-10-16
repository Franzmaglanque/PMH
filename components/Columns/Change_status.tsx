import { Button, Group } from '@mantine/core';
import { createBadgeRenderer } from '@/lib/dataTableHelper';

export const changeStatusColumns = [
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
                        // Add delete logic here
                        console.log('Delete clicked', record);
                    }}
                >
                    Delete
                </Button>
            </Group>
        ),
    },
];
