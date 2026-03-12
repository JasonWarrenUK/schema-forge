/** |===================|| Schema-Driven XML Generator ||==================|
 *  | Generate XML by traversing SchemaRegistry instead of hardcoded
 *  | interfaces. Element structure and ordering come from XSD at runtime.
 *  |======================================================================|
 */

import {
	type SchemaRegistry,
	type SchemaElement,
	isRequired,
	isRepeatable,
} from '../../types/interpreterTypes';

export interface GeneratorOptions {
	namespace?: string;
	/** Indentation spaces per level (default: 2) */
	indent?: number;
	validate?: boolean;
}

export interface GeneratorResult {
	xml: string;
	warnings: GeneratorWarning[];
}

export interface GeneratorWarning {
	path: string;
	message: string;
	value?: unknown;
}

/**
 * Generate XML from data using schema registry structure
 * @param data - Key-value data matching schema element names
 * @param registry - Schema registry defining structure and ordering
 * @param options - Optional generator configuration
 * @returns Generated XML string with any warnings
 */
export function generateFromSchema(
	data: Record<string, unknown>,
	registry: SchemaRegistry,
	options?: GeneratorOptions
): GeneratorResult {
	const opts = {
		namespace: options?.namespace ?? registry.namespace,
		indent: options?.indent ?? 2,
		validate: options?.validate ?? false,
	};

	const warnings: GeneratorWarning[] = [];
	const lines: string[] = ['<?xml version="1.0" encoding="utf-8"?>'];

	const rootXml = generateElement(
		registry.rootElement,
		data,
		0,
		opts.indent,
		opts.namespace,
		warnings
	);

	lines.push(rootXml);

	return { xml: lines.join('\n'), warnings };
}

function generateElement(
	element: SchemaElement,
	data: Record<string, unknown> | unknown,
	depth: number,
	indentSize: number,
	namespace: string | undefined,
	warnings: GeneratorWarning[]
): string {
	const indent = ' '.repeat(depth * indentSize);

	const isRoot = depth === 0;
	const openTag = isRoot
		? `<${element.name} xmlns="${namespace}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
		: `<${element.name}>`;

	// If element has no children (leaf node), generate simple element
	if (!element.isComplex) return generateLeafElement(element, data, indent, warnings);

	// Complex element: generate children in schema order
	const childLines: string[] = [openTag];

	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		// Data doesn't match expected structure
		if (isRequired(element)) {
			warnings.push({
				path: element.path,
				message: `Expected object for complex element "${element.name}", got ${typeof data}`,
				value: data,
			});
		}
		childLines.push(`${indent}</${element.name}>`);
		return childLines.join('\n');
	}

	const dataObj = data as Record<string, unknown>;

	// Generate children in the order defined by the schema
	for (const child of element.children) {
		const childData = dataObj[child.name];

		// Handle repeatable elements (arrays)
		if (isRepeatable(child)) {
			if (Array.isArray(childData)) {
				for (const item of childData) {
					const childXml = generateElement(child, item, depth + 1, indentSize, undefined, warnings);
					if (childXml) childLines.push(childXml);
				}
			} else if (childData !== undefined) {
				warnings.push({
					path: child.path,
					message: `Expected array for repeatable element "${child.name}", got ${typeof childData}`,
					value: childData,
				});
			}
		} else {
			// Single element
			if (childData === undefined) {
				if (isRequired(child)) {
					warnings.push({
						path: child.path,
						message: `Required element "${child.name}" is missing`,
					});
				}
				continue;
			}

			const childXml = generateElement(
				child,
				childData,
				depth + 1,
				indentSize,
				undefined,
				warnings
			);
			if (childXml) childLines.push(childXml);
		}
	}

	childLines.push(`${indent}</${element.name}>`);
	return childLines.map((line) => (line.startsWith('<') ? `${indent}${line}` : line)).join('\n');
}

/**
 * Generate leaf element (no children)
 */
function generateLeafElement(
	element: SchemaElement,
	data: unknown,
	indent: string,
	warnings: GeneratorWarning[]
): string {
	// Treat empty strings as missing data
	const isEmpty = data === undefined || data === null || (typeof data === 'string' && data.trim() === '');

	if (isEmpty) {
		if (isRequired(element)) {
			warnings.push({
				path: element.path,
				message: `Required element "${element.name}" has no value`,
			});
		}
		return ''; // Omit optional empty elements
	}

	const value = escapeXml(String(data));
	return `${indent}<${element.name}>${value}</${element.name}>`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
