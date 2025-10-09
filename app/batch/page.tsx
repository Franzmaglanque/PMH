'use client';

import { Container, Title, Button, TextInput, Select, Table, Text, Group, ActionIcon } from '@mantine/core';
import { IconPlus, IconSearch, IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { fetchBatchRecords } from '../api/batch_table_api';
import 'mantine-datatable/styles.css';
import { DataTable } from 'mantine-datatable';

export default function UpdateItemChangePage() {
    const [filter, setFilter] = useState('');
    const [pageSize, setPageSize] = useState('10');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['BatchRecords'],
        queryFn: fetchBatchRecords,
        // staleTime: 5 * 60 * 1000, // 5 minutes
        // refetchOnWindowFocus: false,
        // enabled: true, // or conditional
    });

    const columns = [
        { key: 'batchNumber', label: 'Batch #' },
        { key: 'totalRecords', label: 'Total Records' },
        { key: 'dateCreated', label: 'Date Created' },
        { key: 'dateSubmitted', label: 'Date Submitted' },
        { key: 'batchStatus', label: 'Batch Status' },
        { key: 'actions', label: 'Actions' },
    ];
    console.log(data);
    return (
        <DataTable
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
            records={data || []}
            fetching={isLoading}
            columns={[
                { accessor: 'batch_number', title: 'Batch #', sortable: true },
                { accessor: 'total_record', title: 'Total Records', sortable: true },
                { accessor: 'date_created', title: 'Date Created', sortable: true },
                { accessor: 'dateSubmitted', title: 'Date Submitted', sortable: true },
                { accessor: 'batchStatus', title: 'Batch Status', sortable: true },
                {
                accessor: 'actions',
                title: 'Actions',
                render: () => (
                    <Button size="xs" variant="light">
                    View
                    </Button>
                ),
                },
            ]}
            // Pagination
            totalRecords={data?.length || 0}
            recordsPerPage={10}
            page={1}
            onPageChange={(page) => console.log(page)}
            // Empty state
            noRecordsText="No data available in table"
            // Styling
            styles={{
                header: {
                backgroundColor: '#0d8080',
                color: 'white',
                },
            }}
        />
    );
}