import { BatchType,BATCH_TYPE_SLUGS } from "@/lib/types";

export const validateBarcode = async (upc: string, batchNumber: string) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                upc: upc,
                batch_number: batchNumber,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to validate barcode');
        }

        return await response.json();
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const fetchBatchRecordsById = async (batchNumber: string) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/request/batch-records/fetch/${batchNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch batch records');
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const fetchBatchRecords = async (batchNumber: string,type:BatchType) => {

    try {
    
        const token = localStorage.getItem('token');    
        const slug = BATCH_TYPE_SLUGS[type];

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batch/${slug}/${batchNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch batch records');
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const saveBatchRecord = async (params:any) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batch/record/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error('Failed to validate barcode');
        }

        return await response.json();
    } catch (error) {
        console.log(error);
        throw error;
    }
}