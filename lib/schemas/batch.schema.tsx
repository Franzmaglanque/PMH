import { z } from 'zod';

// Change Item Status schema
export const changeItemStatusSchema = z.object({
  barcode: z.string()
    .min(1, 'UPC/Barcode is required')
    .regex(/^\d+$/, 'UPC must contain only digits'),

  sku: z.string()
    .min(1, 'SKU is required'),

  long_name: z.string()
    .min(1, 'Description is required'),

  sku_status: z.string()
    .min(1, 'SKU status is required')
    .refine(
      (val) => ['ACTIVE', 'INACTIVE', 'NOT TO BE REORDERED', 'TO BE PURGED'].includes(val),
      { message: 'Invalid SKU status selected' }
    ),

  effectivity_date: z.date()
    .nullable()
    .refine((date) => {
      if (!date) return false;
      // Ensure the date is in the future (not today or past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      return selectedDate > today;
    }, { message: 'Effectivity date must be in the future (not today)' }),

  cost: z.string().optional(),
  price: z.string().optional(),

  dept: z.string().optional(),
  deptnm: z.string().optional(),
}).refine((data) => {
  // If status is ACTIVE, new_cost and new_price are required
  if (data.sku_status === 'ACTIVE') {
    return data.cost && data.cost.trim() !== '' && data.price && data.price.trim() !== '';
  }
  return true;
}, {
  message: 'New Cost and New Price are required when status is ACTIVE',
  path: ['sku_status'],
});

export type ChangeItemStatusInput = z.infer<typeof changeItemStatusSchema>;
