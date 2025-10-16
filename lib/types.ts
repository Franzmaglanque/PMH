// types/batch.ts (or types/api.ts, or just types.ts)

// Export the type so other files can import and use it
export type BatchType = 'change_status' | 'change_barcode' | 'change_price';

// You might also want to export the mapping if it's useful elsewhere
export const BATCH_TYPE_SLUGS: Record<BatchType, string> = {
    'change_status': 'change-status',
    'change_barcode': 'change-barcode',
    'change_price': 'change-price',
} as const;  // 'as const' makes this even more type-safe