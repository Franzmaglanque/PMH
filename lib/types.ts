// types/batch.ts (or types/api.ts, or just types.ts)

// Export the type so other files can import and use it
export type BatchType = 
'change_status' |
'change_barcode' |
'change_price_cost' |
'change_description' |
'change_packaging' |
'change_store_listing' | 
'new_item' | 
'new_barcode' |
'new_image';

// You might also want to export the mapping if it's useful elsewhere
export const BATCH_TYPE_SLUGS: Record<BatchType, string> = {
    'change_status': 'change-status',
    'change_barcode': 'change-barcode',
    'change_price_cost': 'change-price-cost',
    'change_description': 'change-description',
    'change_packaging': 'change-packaging',
    'change_store_listing': 'change-store_listing',
    'new_item': 'new-item',
    'new_barcode': 'new-barcode',
    'new_image': 'new-image',
} as const;  // 'as const' makes this even more type-safe