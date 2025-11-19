import { z } from 'zod';

// Zod schema for change store listing form
export const changeStoreListingSchema = z.object({
  barcode: z.string().min(1, 'UPC is required'),
  sku: z.string().min(1, 'SKU is required'),
  current_description: z.string().optional(),
  current_store_count: z.number().optional(),
  action_type: z.enum(['add', 'remove', 'replace'], {
    message: 'Please select an action type',
  }),
  input_method: z.enum(['manual', 'upload'], {
    message: 'Please select an input method',
  }),
  stores: z.array(z.string()).optional(),
  stores_file: z.any().optional(),
  dept: z.string().optional(),
  deptnm: z.string().optional(),
}).refine(
  (data) => {
    // If manual selection, stores array must have at least one item
    if (data.input_method === 'manual') {
      return data.stores && data.stores.length > 0;
    }
    // If upload, stores_file must be provided
    if (data.input_method === 'upload') {
      return data.stores_file !== null && data.stores_file !== undefined;
    }
    return false;
  },
  {
    message: 'Please select stores manually or upload an Excel file',
    path: ['stores'], // Error will be shown on stores field
  }
);

export type ChangeStoreListingInput = z.infer<typeof changeStoreListingSchema>;
