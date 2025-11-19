import { z } from 'zod';

// Single item schema
export const singleItemSchema = z.object({
  barcode: z.string()
    .min(1, 'Barcode/UPC is required')
    .regex(/^\d+$/, 'Barcode must contain only digits'),

  sku: z.string()
    .min(1, 'SKU is required'),

  description: z.string()
    .min(1, 'Description is required'),

  price: z.string()
    .min(1, 'Price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid number with up to 2 decimal places'),

  cost: z.string()
    .min(1, 'Cost is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Cost must be a valid number with up to 2 decimal places'),

  current_price: z.string().optional(),
  current_cost: z.string().optional(),
  dept: z.string().optional(),
  deptnm: z.string().optional(),
});

// Multiple item schema
export const multipleItemSchema = z.object({
  upload_file: z.any()
    .refine((file) => file !== null && file !== undefined, {
      message: 'Please upload an Excel file',
    }),
});

// Combined schema for change price/cost
export const changePriceCostSchema = z.object({
  entry_type: z.enum(['single', 'multiple'], {
    message: 'Please select an entry type',
  }),

  // Store listing fields
  store_listing_type: z.enum(['all_stores', 'selected_stores'], {
    message: 'Please select a store listing type',
  }),
  stores_file: z.any().optional(), // For selected stores Excel upload

  // Request type fields (Step 3)
  request_type: z.enum(['change_price', 'change_cost', 'change_price_and_cost'], {
    message: 'Please select a request type',
  }),
  start_date: z.date({
    message: 'Start date is required',
  }),
  end_date: z.date().optional(), // Optional because regular price has no expiration
  price_type: z.enum(['promo_price', 'regular_price']).optional(),
  event_type: z.enum(['mark_up', 'mark_down']).optional(),

  // Single item fields
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  cost: z.string().optional(),
  current_price: z.string().optional(),
  current_cost: z.string().optional(),
  dept: z.string().optional(),
  deptnm: z.string().optional(),

  // Multiple item fields
  upload_file: z.any().optional(),
}).refine(
  (data) => {
    // Validate store listing
    if (data.store_listing_type === 'selected_stores') {
      if (!data.stores_file) {
        return false;
      }
    }

    // Validate price_type when request involves price changes
    if (data.request_type === 'change_price' || data.request_type === 'change_price_and_cost') {
      if (!data.price_type) {
        return false;
      }
      // Validate event_type when price_type is regular_price
      if (data.price_type === 'regular_price' && !data.event_type) {
        return false;
      }
      // Validate end_date is required for promo_price
      if (data.price_type === 'promo_price' && !data.end_date) {
        return false;
      }
    }

    // Validate date range (only if end_date is provided)
    if (data.start_date && data.end_date) {
      if (data.end_date < data.start_date) {
        return false;
      }
    }

    // If single item, validate required price/cost fields based on request type
    if (data.entry_type === 'single') {
      const baseValidation =
        data.barcode &&
        data.barcode.trim() !== '' &&
        /^\d+$/.test(data.barcode) &&
        data.sku &&
        data.sku.trim() !== '';

      if (data.request_type === 'change_price' || data.request_type === 'change_price_and_cost') {
        if (!data.price || data.price.trim() === '' || !/^\d+(\.\d{1,2})?$/.test(data.price)) {
          return false;
        }
      }

      if (data.request_type === 'change_cost' || data.request_type === 'change_price_and_cost') {
        if (!data.cost || data.cost.trim() === '' || !/^\d+(\.\d{1,2})?$/.test(data.cost)) {
          return false;
        }
      }

      return baseValidation;
    }
    // If multiple items, validate file upload
    if (data.entry_type === 'multiple') {
      return data.upload_file !== null && data.upload_file !== undefined;
    }
    return false;
  },
  {
    message: 'Please complete all required fields for the selected entry type',
    path: ['entry_type'],
  }
);

export type ChangePriceCostInput = z.infer<typeof changePriceCostSchema>;
export type SingleItemInput = z.infer<typeof singleItemSchema>;
export type MultipleItemInput = z.infer<typeof multipleItemSchema>;
