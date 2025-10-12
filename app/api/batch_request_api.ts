export const validateBarcode = async (upc: string, batchNumber: string) => {

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-account-session-token': token || '',
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