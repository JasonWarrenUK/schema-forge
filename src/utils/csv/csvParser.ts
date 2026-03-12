/** |===================|| Human-Friendly Name ||==================|
 *  | Explanation
 *  |==============================================================|
 */

/**
 * CSV Parser with header-based column matching
 *
 * Parses CSV files by reading headers first, then mapping data to column names.
 * Tolerates column reordering since mapping is based on header names, not position.
 * Handles quoted fields, escaped characters, and BOM markers.
 */
import Papa from 'papaparse';

export type CSVRow = Record<string, string>;
export interface CSVData {
	headers: string[];
	rows: CSVRow[];
}

/**
 * Parse a CSV file from the filesystem
 * @param filePath - Absolute path to CSV file
 * @returns Parsed CSV data with headers and rows
 */
export async function parseCSV(filePath: string): Promise<CSVData> {
	const file = Bun.file(filePath);
	const contents = await file.text();

	return parseCSVContent(contents);
}

/**
 * Parse CSV content string (useful for testing and browser/Tauri contexts)
 * @param contents - Raw CSV string
 * @returns Parsed CSV data with headers and rows
 */
export function parseCSVContent(contents: string): CSVData {
	if (!contents.trim()) throw new Error('CSV file is empty');

	const result = Papa.parse<CSVRow>(contents, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (header) => header.trim(),
	});

	if (result.errors.length > 0) {
		const firstError = result.errors[0];
		throw new Error(`CSV parsing error at row ${firstError.row}: ${firstError.message}`);
	}

	if (result.data.length === 0) {
		throw new Error('CSV file is empty');
	}

	const headers = result.meta.fields ?? [];

	return { headers, rows: result.data };
}
