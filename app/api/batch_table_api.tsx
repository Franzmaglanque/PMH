export const fetchBatchRecords_post = async (params: any) => {

    try {

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-account-session-token": params.token
            },
            body: JSON.stringify({
                customer_entity: params.entity_id,
            })
        });

        return await response.json();

    } catch (error) {
        console.error('Error Verify KYC', error);
        throw error;
    }
}

export const fetchBatchRecords = async () => {

    try {

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

        const result = await response.json();
        return result.data;

    } catch (error) {
        console.log(error);
    }
}

export const generateBatch = async (requestType: string) => {

    try {
        const token = localStorage.getItem('token');
        const userString = localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        const supplierCode = user?.supplier_code || '';

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-account-session-token': token || '',
            },
            body: JSON.stringify({
                request_type: requestType,
                supplier_code: supplierCode,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to create batch');
        }

        return await response.json();
    } catch (error) {
        console.log(error);
        throw error;
    }
}