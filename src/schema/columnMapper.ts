import type { ColumnMapping } from '../types/schemaTypes';
import type { SchemaRegistry } from '../types/interpreterTypes';
import { isRepeatable } from '../types/interpreterTypes';
import { getTransform } from '../transforms/registry';

/**
 * Maps a single CSV row to a nested structure using column mappings
 *
 * @param csvRow - Object with CSV column headers as keys
 * @param mappings - Array of column mappings to apply
 * @param registry - Schema registry for path validation
 * @returns Nested object structure following XSD paths
 */
export function mapCsvToSchema(
	csvRow: Record<string, string>,
	mappings: ColumnMapping[],
	registry: SchemaRegistry
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const mapping of mappings) {
		const columnKey = Object.keys(csvRow).find(
			(key) => key.trim().toLowerCase() === mapping.csvColumn.trim().toLowerCase()
		);

		if (!columnKey) continue;

		const rawValue = csvRow[columnKey];

		// Resolve transform by name if specified
		const value = mapping.transform ? getTransform(mapping.transform)(rawValue) : rawValue;

		setNestedValue(result, mapping.xsdPath, value, registry);
	}

	return result;
}

/**
 * - Sets a value in a nested object using dot notation path
 * - Creates intermediate objects as needed
 * - Uses registry to determine if an element should be an array
 *
 * @example
 * setNestedValue({}, "Root.Parent.Field", "12345", registry)
 * // Returns: { Root: { Parent: [{ Field: "12345" }] } }
 */
function setNestedValue(
	obj: Record<string, unknown>,
	path: string,
	value: unknown,
	registry: SchemaRegistry
): void {
	const parts = path.split('.');
	let current = obj;
	let currentPath = '';

	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		currentPath = currentPath ? `${currentPath}.${part}` : part;

		const element = registry.elementsByPath.get(currentPath);
		const repeatable = element ? isRepeatable(element) : false;

		if (repeatable) {
			if (!(part in current)) {
				current[part] = [{}];
			}
			// For CSV mapping, we currently assume a single repeatable item per row
			// We reuse the first element in the array to build up the complex object
			const arr = current[part] as Record<string, unknown>[];
			current = arr[0];
		} else {
			if (!(part in current)) {
				current[part] = {};
			}
			current = current[part] as Record<string, unknown>;
		}
	}

	const lastPart = parts[parts.length - 1];
	current[lastPart] = value;
}
