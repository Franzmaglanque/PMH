import { z } from 'zod';

// Schema for new item form
export const newItemSchema = z.object({
  // Item Description
  barcode: z.string()
    .min(1, 'Barcode is required')
    .regex(/^\d+$/, 'Barcode must contain only digits'),

  case_barcode: z.string()
    .min(1, 'Case barcode is required')
    .regex(/^\d+$/, 'Case barcode must contain only digits'),

  display_name: z.string().optional(), // Read-only, auto-populated

  brand: z.string().min(1, 'Brand is required'),
  description: z.string().min(1, 'Description is required'),
  variant: z.string().min(1, 'Variant is required'),
  size: z.string().min(1, 'Size is required'),

  // Item Dimensions
  item_length: z.string()
    .min(1, 'Item length is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Length must be a valid number'),
  item_width: z.string()
    .min(1, 'Item width is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Width must be a valid number'),
  item_height: z.string()
    .min(1, 'Item height is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Height must be a valid number'),
  item_weight: z.string()
    .min(1, 'Item weight is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Weight must be a valid number'),

  // Case Dimensions
  case_length: z.string()
    .min(1, 'Case length is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Length must be a valid number'),
  case_width: z.string()
    .min(1, 'Case width is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Width must be a valid number'),
  case_height: z.string()
    .min(1, 'Case height is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Height must be a valid number'),
  case_weight: z.string()
    .min(1, 'Case weight is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Weight must be a valid number'),

  // Other Item Information
  uom: z.string().min(1, 'Unit of Measure is required'),
  standard_pack: z.string()
    .min(1, 'Standard pack is required')
    .regex(/^\d+$/, 'Standard pack must be a number'),

  department: z.string().min(1, 'Department is required'),
  sub_department: z.string().min(1, 'Sub Department is required'),

  selling_uom: z.string().min(1, 'Selling UOM is required'),
  shelf_life: z.string()
    .min(1, 'Shelf life is required')
    .regex(/^\d+$/, 'Shelf life must be a number (days)'),

  // Item Details
  item_type: z.enum(['Regular', 'Promo', 'Seasonal'], {
    message: 'Please select an item type',
  }),
  listing_fee: z.enum(['yes', 'no']).optional(),
  item_status: z.enum(['A', 'N']).optional(), // A = Active, N = Not to be reordered (for Promo/Seasonal)
  evaluation_period: z.enum(['3_months', '6_months', '12_months']).optional(),

  // Marketing Support (all optional, digit only)
  sampling_activity: z.string()
    .regex(/^\d*$/, 'Sampling activity must contain only digits')
    .optional()
    .or(z.literal('')),
  push_girl: z.string()
    .regex(/^\d*$/, 'Push girl must contain only digits')
    .optional()
    .or(z.literal('')),
  tactical_display: z.string()
    .regex(/^\d*$/, 'Tactical display must contain only digits')
    .optional()
    .or(z.literal('')),

  sku_type: z.enum(['Consign', 'Concess', 'Outright'], {
    message: 'Please select SKU type',
  }),

  commission: z.string()
    .regex(/^\d*\.?\d{0,2}$/, 'Commission must be a valid number with up to 2 decimal places')
    .optional()
    .or(z.literal('')),

  // Location
  stores_file: z.any().refine((file) => file !== null && file !== undefined, {
    message: 'Please upload a stores file',
  }), // For store upload - REQUIRED

  // Price/Cost
  srp: z.string()
    .min(1, 'SRP is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'SRP must be a valid number with up to 2 decimal places'),
  case_cost: z.string()
    .min(1, 'Case cost is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Case cost must be a valid number with up to 2 decimal places'),

  // Upload Image
  image_file: z.any().optional(), // For image upload
}).refine(
  (data) => {
    // For Regular items, listing_fee is required
    if (data.item_type === 'Regular' && !data.listing_fee) {
      return false;
    }
    // For Promo/Seasonal items, item_status is required
    if ((data.item_type === 'Promo' || data.item_type === 'Seasonal') && !data.item_status) {
      return false;
    }
    // If listing fee is yes (for Regular items), evaluation period is required
    if (data.item_type === 'Regular' && data.listing_fee === 'yes' && !data.evaluation_period) {
      return false;
    }
    return true;
  },
  {
    message: 'Please complete all required fields based on item type',
    path: ['item_type'],
  }
);

export type NewItemInput = z.infer<typeof newItemSchema>;
