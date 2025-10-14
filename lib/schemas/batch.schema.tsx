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
      // Ensure the date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, { message: 'Effectivity date must be today or in the future' }),

  dept: z.string().optional(),
  deptnm: z.string().optional(),
});

export type ChangeItemStatusInput = z.infer<typeof changeItemStatusSchema>;
