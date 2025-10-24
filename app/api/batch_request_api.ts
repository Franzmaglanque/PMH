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

export const validateBarcode = async (upc: string, batchNumber: string) => {
    try {
        return await apiClient('/barcode/validate', {
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