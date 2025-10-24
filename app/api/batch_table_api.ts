import { apiClient, getUser } from "@/lib/apiClient";

export const fetchBatchRecords = async () => {
    try {
        const result = await apiClient('/batch/fetch', {
            method: "GET",
            skipAuth: true, // This endpoint doesn't require authentication
        });
        return result.data;
    } catch (error) {
        console.log(error);
    }
}

export const generateBatch = async (requestType: string) => {
    try {
        const user = getUser();
        const supplierCode = user?.supplier_code || '';

        return await apiClient('/generate/batch', {
            method: 'POST',
            body: JSON.stringify({
                request_type: requestType,
                supplier_code: supplierCode,
            }),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}