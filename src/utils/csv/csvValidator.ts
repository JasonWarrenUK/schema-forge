/** |===================|| Human-Friendly Name ||==================|
 *  | Explanation
 *  |==============================================================|
 */

/**
 * Semantic Validator for CSV Data
 *
 * Validates parsed CSV data against schema constraints.
 * Uses SchemaRegistry for dynamic validation rules.
 */

import type { CSVRow } from './csvParser';
import type { SchemaRegistry, SchemaElement } from '../../types/interpreterTypes';
import { validateValue } from '../../schema/schemaValidator';
import type { SchemaValidationIssue, ColumnMapping } from '../../types/schemaTypes';
import { getTransform } from '../../transforms/registry';

// === Types ===
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
	/** Severity level */ severity: ValidationSeverity;
	/** Field that failed validation (if applicable) */ field?: string;
	/** Row index (0-based) where issue occurred */ row?: number;
	/** Human-readable error message */ message: string;
	/** Machine-readable error code */ code: string;
	/** Actual value that caused the issue */ actualValue?: unknown;
}

export interface ValidationResult {
	/** Whether validation passed with no errors */ valid: boolean;
	/** All issues found during validation */ issues: ValidationIssue[];
	/** Count of errors */ errorCount: number;
	/** Count of warnings */ warningCount: number;
}

// === Validation Functions ===

/**
 * Validate parsed CSV rows against schema constraints
 * @param rows - Parsed CSV rows to validate
 * @param headers - CSV headers from the file
 * @param registry - Schema registry for validation rules
 * @param mapping - Mapping configuration to use
 * @param shouldSkipMapping - Optional callback to skip certain mappings during validation.
 *   Called with (mapping) for header validation, (mapping, row) for row validation.
 *   Return true to skip the mapping.
 * @returns Validation result with all issues found
 */
export function validateRows(
	rows: CSVRow[],
	headers: string[],
	registry: SchemaRegistry,
	mapping: { mappings: ColumnMapping[] },
	shouldSkipMapping?: (mapping: ColumnMapping, row?: Record<string, string>) => boolean
): ValidationResult {
	const issues: ValidationIssue[] = [];

	// Check for missing required headers (based on mapping and schema)
	const missingHeaders = validateRequiredHeaders(headers, registry, mapping, shouldSkipMapping);
	issues.push(...missingHeaders);

	// Validate each row against schema
	rows.forEach((row, index) => {
		const rowIssues = validateRow(row, index, registry, mapping, shouldSkipMapping);
		issues.push(...rowIssues);
	});

	const errorCount = issues.filter((i) => i.severity === 'error').length;
	const warningCount = issues.filter((i) => i.severity === 'warning').length;

	return {
		valid: errorCount === 0,
		issues,
		errorCount,
		warningCount,
	};
}

/**
 * Check that all required headers are present based on mapping and schema
 * Note: Only validates non-grouped fields. Grouped fields are validated
 * per-row based on whether that group has data.
 */
function validateRequiredHeaders(
	headers: string[],
	registry: SchemaRegistry,
	mapping: { mappings: ColumnMapping[] },
	shouldSkipMapping?: (mapping: ColumnMapping, row?: Record<string, string>) => boolean
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const headerSet = new Set(headers.map((h) => h.trim().toLowerCase()));

	for (const m of mapping.mappings) {
		// Skip mappings the caller wants to handle separately (e.g. grouped fields)
		if (shouldSkipMapping?.(m)) continue;

		const element = registry.elementsByPath.get(m.xsdPath);
		if (!element) continue;

		// Check if field is required (cardinality.min >= 1)
		if (element.cardinality.min >= 1 && !headerSet.has(m.csvColumn.trim().toLowerCase())) {
			issues.push({
				severity: 'error',
				field: m.csvColumn,
				message: `Required column "${m.csvColumn}" is missing from CSV`,
				code: 'MISSING_REQUIRED_HEADER',
			});
		}
	}

	return issues;
}

/**
 * Validate a single row against schema constraints
 */
function validateRow(
	row: CSVRow,
	rowIndex: number,
	registry: SchemaRegistry,
	mapping: { mappings: ColumnMapping[] },
	shouldSkipMapping?: (mapping: ColumnMapping, row?: Record<string, string>) => boolean
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	for (const m of mapping.mappings) {
		const element = registry.elementsByPath.get(m.xsdPath);
		if (!element) continue;

		// Skip mappings the caller wants to handle separately (e.g. grouped fields without data)
		if (shouldSkipMapping?.(m, row)) {
			continue;
		}

		// Case-insensitive, trim-based column lookup
		const actualHeader = Object.keys(row).find(
			(h) => h.trim().toLowerCase() === m.csvColumn.trim().toLowerCase()
		);
		const rawValue = actualHeader ? row[actualHeader] : undefined;

		// Apply transform before validation (same as columnMapper), but only if value exists
		const value = rawValue && m.transform ? getTransform(m.transform)(rawValue) : rawValue;

		const schemaIssues = validateValue(value, element, {
			rowIndex,
			sourceField: m.csvColumn,
		});

		// Convert schema validation issues to ValidationIssue format
		for (const schemaIssue of schemaIssues) {
			issues.push(convertSchemaIssue(schemaIssue, m.csvColumn, rowIndex));
		}
	}

	return issues;
}

/**
 * Convert SchemaValidationIssue to ValidationIssue
 */
function convertSchemaIssue(
	schemaIssue: SchemaValidationIssue,
	field: string,
	rowIndex: number
): ValidationIssue {
	return {
		severity: schemaIssue.severity,
		field,
		row: rowIndex,
		message: schemaIssue.message,
		code: schemaIssue.code,
		actualValue: schemaIssue.actualValue,
	};
}
