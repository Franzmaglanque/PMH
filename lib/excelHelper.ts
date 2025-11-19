/**
 * Excel Helper for Store Listing
 * Provides utilities for parsing and generating Excel files for store listings
 */

import * as XLSX from 'xlsx';

/**
 * Parse Excel or CSV file and extract store codes
 * Expected format: File with store codes in first column (starting from row 2)
 * Row 1 is assumed to be header
 *
 * Supports:
 * - .xlsx (Excel 2007+)
 * - .xls (Excel 97-2003)
 * - .csv (Comma-separated values)
 * - .txt (Tab-separated values)
 *
 * @param file - The file to parse
 * @returns Promise<string[]> - Array of store codes
 */
export const parseStoresFromExcel = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        let storeCodes: string[] = [];

        // Check file extension to determine parsing method
        const fileName = file.name.toLowerCase();
        const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (isCSV) {
          // Parse CSV/TXT files
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/).filter(line => line.trim());

          // Skip header row and extract store codes from first column
          storeCodes = lines
            .slice(1) // Skip header
            .map(line => {
              const columns = line.split(/[,\t]/); // Split by comma or tab
              return columns[0]?.trim();
            })
            .filter(code => code && code.length > 0);
        } else if (isExcel) {
          // Parse Excel files using xlsx library
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON (array of arrays)
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) {
            reject(new Error('File is empty or has no data rows. Please ensure the file has store codes.'));
            return;
          }

          // Extract store codes from first column, skip header (row 0)
          storeCodes = jsonData
            .slice(1) // Skip header row
            .map(row => {
              const storeCode = row[0]; // First column
              return storeCode ? String(storeCode).trim() : '';
            })
            .filter(code => code && code.length > 0);
        } else {
          reject(new Error('Unsupported file format. Please upload .xlsx, .xls, .csv, or .txt file.'));
          return;
        }

        if (storeCodes.length === 0) {
          reject(new Error('No store codes found in the file. Please ensure the file has store codes in the first column.'));
          return;
        }

        resolve(storeCodes);
      } catch (error) {
        console.error('Parse error:', error);
        reject(new Error('Failed to parse file. Please ensure it is a valid Excel or CSV file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read as ArrayBuffer for xlsx library (works for both Excel and CSV)
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Download a blob file to the user's computer
 * This is a reusable helper that can be used across components
 *
 * @param blob - The blob data to download
 * @param filename - The name of the file to save (with extension)
 *
 * @example
 * // Download an Excel file from API
 * const blob = await fetchStoreListingTemplate();
 * downloadBlobFile(blob, 'store_listing_template.xlsx');
 *
 * @example
 * // Download a CSV file
 * const csvBlob = new Blob([csvContent], { type: 'text/csv' });
 * downloadBlobFile(csvBlob, 'data.csv');
 */
export const downloadBlobFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  if (link.parentNode) {
    link.parentNode.removeChild(link);
  }
  window.URL.revokeObjectURL(url);
};

/**
 * Validate store codes format
 */
export const validateStoreCodes = (codes: string[]): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];

  codes.forEach(code => {
    const trimmed = code.trim();
    // Basic validation: not empty and reasonable length
    if (trimmed.length > 0 && trimmed.length <= 10) {
      valid.push(trimmed);
    } else {
      invalid.push(code);
    }
  });

  return { valid, invalid };
};

/**
 * Generate and download Change Price/Cost Excel template
 * Template format: BARCODE, PRICE, COST
 *
 * This creates an Excel file client-side with the required headers
 * for uploading multiple price/cost changes.
 *
 * @example
 * generateChangePriceCostTemplate();
 * // Downloads: change_price_cost_template.xlsx
 */
export const generateChangePriceCostTemplate = () => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Define the headers
  const headers = ['BARCODE', 'PRICE', 'COST'];

  // Create worksheet data with headers only
  const worksheetData = [headers];

  // Convert data to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 20 }, // BARCODE column
    { wch: 15 }, // PRICE column
    { wch: 15 }, // COST column
  ];

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, 'change_price_cost_template.xlsx');
};
