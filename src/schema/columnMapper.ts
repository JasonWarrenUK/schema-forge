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
 * Path segments that reach the prototype chain rather than an own property.
 * Writing through any of these escapes the result object and mutates shared
 * state, so they are rejected outright rather than sanitised.
 */
const UNSAFE_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * - Sets a value in a nested object using dot notation path
 * - Creates intermediate objects as needed
 * - Uses registry to determine if an element should be an array
 *
 * Mapping configurations are data, often loaded from disk or supplied by a
 * user, so every segment is checked against the schema before it is written.
 *
 * @throws If a segment is unsafe, the path is absent from the schema, or the
 * path collides with a value already written by an earlier mapping.
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

	for (const part of parts) {
		if (UNSAFE_SEGMENTS.has(part)) {
			throw new Error(`Unsafe path segment "${part}" in xsdPath "${path}"`);
		}
	}

	if (!registry.elementsByPath.has(path)) {
		throw new Error(`Path "${path}" not found in schema`);
	}

	let current = obj;
	let currentPath = '';

	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		currentPath = currentPath ? `${currentPath}.${part}` : part;

		const element = registry.elementsByPath.get(currentPath);
		const repeatable = element ? isRepeatable(element) : false;

		if (repeatable) {
			if (!Object.hasOwn(current, part)) {
				current[part] = [{}];
			}
			const existing = current[part];
			if (!Array.isArray(existing)) {
				throw new Error(
					`Path conflict at "${currentPath}": "${path}" expects a repeatable element, but a value was already mapped there`
				);
			}
			current = existing[0] as Record<string, unknown>;
		} else {
			if (!Object.hasOwn(current, part)) {
				current[part] = {};
			}
			const existing = current[part];
			if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
				throw new Error(
					`Path conflict at "${currentPath}": "${path}" descends through it, but a scalar value was already mapped there`
				);
			}
			current = existing as Record<string, unknown>;
		}
	}

	const lastPart = parts[parts.length - 1];

	// Writing a scalar over an object built by an earlier, deeper mapping would
	// silently discard it.
	const existingLeaf = current[lastPart];
	if (Object.hasOwn(current, lastPart) && typeof existingLeaf === 'object' && existingLeaf !== null) {
		throw new Error(
			`Path conflict at "${path}": a nested value was already mapped there by a deeper path`
		);
	}

	current[lastPart] = value;
}
