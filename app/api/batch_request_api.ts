import { BatchType, BATCH_TYPE_SLUGS } from "@/lib/types";
import { apiClient } from "@/lib/apiClient";

export const fetchBatchRecordsById = async (batchNumber: string) => {
    try {
        const result = await apiClient(`/request/batch-records/fetch/${batchNumber}`, {
            method: 'GET',
        });
        return result.data || [];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const postBatch = async (params: any) => {
    try {
        return await apiClient('/batch/post', {
            method: 'POST',
            body: JSON.stringify({
                batch_number: params.batch_number,
                request_type: params.request_type,
            }),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const fetchBatchRecords = async (batchNumber: string, type: BatchType) => {
    try {
        const slug = BATCH_TYPE_SLUGS[type];
        const result = await apiClient(`/batch/${slug}/${batchNumber}`, {
            method: 'GET',
        });
        return result.data || [];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const barcodeFetchDetails = async (upc: string, batchNumber: string) => {
    try {
        return await apiClient('/barcode/fetch-details', {
            method: 'POST',
            body: JSON.stringify({
                upc: upc,
                batch_number: batchNumber,
            }),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const validateBarcodeUsed = async (barcode: string, batchNumber: string, requestType: string) => {
    try {
        // Use direct fetch instead of apiClient to handle 409 status
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const url = `${process.env.NEXT_PUBLIC_API_URL}/barcode/validate-used`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({
                barcode: barcode,
                batch_number: batchNumber,
                request_type: requestType,
            }),
        });

        const data = await response.json();

        // Return the data regardless of status code (200 or 409)
        // The mutation will handle the response based on data.status
        return data;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

/**
 * This API will INSERT encoded details to batchItems table.
 */
export const saveBatchRecord = async (params: any) => {
    try {
        return await apiClient('/batch/record/save', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

/**
 * This API will UPDATE encoded details to batchItems table.
 */
export const updateBatchRecord = async (params: any) => {
    try {
        return await apiClient('/batch/record/update', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

/**
 * This API will DELETE encoded details to batchItems table.
 */
export const deleteBatchRecord = async (params: any) => {
    try {
        return await apiClient(`/batch/record/delete/${params.record_id}`, {
            method: 'DELETE',
            body: JSON.stringify({ request_type: params.request_type }),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}