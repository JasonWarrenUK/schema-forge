/** |===================|| Schema Registry Builder ||===================|
 *  | Main orchestrator: transforms raw XSD parser output into a
 *  | queryable SchemaRegistry with full element trees and lookups.
 *  |===================================================================|
 */

import {
	parseXsd,
	extractNamespace,
	extractVersion,
	extractElements,
	extractNamedSimpleTypes,
	extractNamedComplexTypes,
	type RawXsdElement,
} from './schemaParser';
import type {
	SchemaRegistry,
	SchemaRegistryOptions,
	SchemaElement,
} from '../types/interpreterTypes';
import { buildNamedTypesMap } from '../utils/schema/typeResolver';
import { buildElement, populateLookupMaps } from '../utils/schema/elementBuilder';

/**
 * Build a queryable SchemaRegistry from XSD content
 * @param xsdContent - Raw XSD file content as string
 * @param options - Optional configuration
 * @returns Complete SchemaRegistry with lookup maps
 */
export function buildSchemaRegistry(
	xsdContent: string,
	options?: SchemaRegistryOptions
): SchemaRegistry {
	const parsed = parseXsd(xsdContent);

	// Multi-document schemas need a file resolver, which this signature does
	// not take. Previously ignored, so everything defined in the other document
	// silently went missing or fell back to a string type.
	if (parsed['xs:schema']['xs:include'] !== undefined) {
		throw new Error(
			'Unsupported XSD construct: xs:include is not supported, so multi-document schemas cannot be resolved. See the Requirements and limitations section of the README.'
		);
	}
	if (parsed['xs:schema']['xs:import'] !== undefined) {
		throw new Error(
			'Unsupported XSD construct: xs:import is not supported, so multi-document schemas cannot be resolved. See the Requirements and limitations section of the README.'
		);
	}

	const namespace = extractNamespace(parsed);
	const schemaVersion = extractVersion(parsed);
	const rawElements = extractElements(parsed);
	const rawSimpleTypes = extractNamedSimpleTypes(parsed);

	const namedTypes = buildNamedTypesMap(rawSimpleTypes);

	if (rawElements.length === 0) {
		throw new Error('Invalid XSD: no root element found');
	} else if (rawElements.length > 1) {
		throw new Error('Multiple root elements not supported. XSD should have a single root element.');
	}

	// A named complex type resolves to nothing in the simple-types map, so the
	// element would collapse to a string leaf and its entire subtree would
	// disappear from the registry. Named complex types are idiomatic XSD, so
	// this is the most likely way a real schema silently produced wrong output.
	const namedComplexTypeNames = new Set(
		extractNamedComplexTypes(parsed)
			.map((type) => type['@_name'])
			.filter((name): name is string => !!name)
	);

	if (namedComplexTypeNames.size > 0) {
		assertNoNamedComplexTypeReferences(rawElements[0], '', namedComplexTypeNames);
	}

	const rootElement = buildElement(rawElements[0], '', namedTypes);

	const elementsByPath = new Map<string, SchemaElement>();
	const elementsByName = new Map<string, SchemaElement[]>();

	populateLookupMaps(rootElement, elementsByPath, elementsByName);

	return {
		namespace,
		schemaVersion,
		rootElement,
		elementsByPath,
		elementsByName,
		namedTypes,
	};
}

/**
 * Walks the raw element tree rejecting any element typed by a named complex
 * type.
 *
 * resolveBaseType only consults the named *simple* types, so such a reference
 * silently resolved to 'string': the element became a leaf, its children
 * vanished from the registry, and generation emitted "[object Object]" where
 * the subtree should have been.
 */
function assertNoNamedComplexTypeReferences(
	rawElement: RawXsdElement,
	parentPath: string,
	namedComplexTypeNames: Set<string>
): void {
	const name = rawElement['@_name'];
	const path = parentPath ? `${parentPath}.${name}` : name;

	const typeRef = rawElement['@_type'];
	if (typeRef && namedComplexTypeNames.has(typeRef)) {
		throw new Error(
			`Unsupported XSD construct at "${path}": references named xs:complexType "${typeRef}", which is not supported. Inline the complexType instead. See the Requirements and limitations section of the README.`
		);
	}

	const sequence = rawElement['xs:complexType']?.['xs:sequence'];
	const rawChildren = sequence?.['xs:element'];
	if (!rawChildren) return;

	const children = Array.isArray(rawChildren) ? rawChildren : [rawChildren];
	for (const child of children) {
		assertNoNamedComplexTypeReferences(child, path, namedComplexTypeNames);
	}
}
