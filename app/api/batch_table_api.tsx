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

        return response.json();

    } catch (error) {
        console.log(error);
    }
}