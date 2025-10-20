import { BatchType,BATCH_TYPE_SLUGS } from "@/lib/types";

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

export const postBatch = async (params:any) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batch/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                batch_number: params.batch_number,
                request_type: params.request_type,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to post batch');
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

export const updateBatchRecord = async (params:any) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batch/record/update`, {
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

export const deleteBatchRecord = async (params: any) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batch/record/delete/${params.record_id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({request_type:params.request_type}),
        });

        if (!response.ok) {
            throw new Error('Failed to delete batch record');
        }

        return await response.json();
    } catch (error) {
        console.log(error);
        throw error;
    }
}