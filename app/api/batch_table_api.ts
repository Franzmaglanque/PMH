import { apiClient, getUser } from "@/lib/apiClient";

export const fetchBatchRecords = async (requestType: string) => { // Remove optional
    try {
        const result = await apiClient(`/batch/fetch?request_type=${requestType}`, {
            method: "GET",
        });
        return result.data;
    } catch (error) {
        console.log(error);
        throw error; // Re-throw to let React Query handle it
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