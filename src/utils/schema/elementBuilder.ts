/** |===================|| Element Builder ||===================|
 *  | Build SchemaElement trees from raw XSD structures and
 *  | populate lookup maps.
 *  |===========================================================|
 */

import type {
	SchemaElement,
	NamedSimpleType,
	SchemaConstraints,
} from '../../types/interpreterTypes';
import type { RawXsdElement } from '../../schema/schemaParser';
import { EMPTY_CONSTRAINTS } from '../../types/interpreterTypes';
import { parseCardinality } from './cardinality';
import { extractConstraints } from './constraints';
import { resolveBaseType } from './typeResolver';

/**
 * Content models and declarations schema-forge does not build, mapped to the
 * message shown when one is encountered.
 *
 * Each of these previously produced an element with no children and no error,
 * so the data was dropped and the caller had no way to tell. Failing at load
 * is the honest signal that the schema is outside what this library handles.
 */
const UNSUPPORTED_COMPLEX_TYPE_MEMBERS: Array<[string, string]> = [
	['xs:choice', 'xs:choice content models are not supported'],
	['xs:all', 'xs:all content models are not supported'],
	['xs:group', 'xs:group references are not supported'],
	['xs:any', 'xs:any wildcards are not supported'],
	['xs:complexContent', 'xs:complexContent and xs:extension are not supported'],
	['xs:simpleContent', 'xs:simpleContent is not supported'],
	['xs:attribute', 'xs:attribute declarations are not supported'],
	['xs:attributeGroup', 'xs:attributeGroup references are not supported'],
];

const DOCS_HINT = 'See the Requirements and limitations section of the README.';

/** Rejects an element whose declaration uses a construct that would be silently dropped. */
function assertSupportedElement(rawElement: RawXsdElement, parentPath: string): void {
	const label = rawElement['@_name']
		? parentPath
			? `${parentPath}.${rawElement['@_name']}`
			: rawElement['@_name']
		: parentPath || '(root)';

	if (rawElement['@_ref']) {
		throw new Error(
			`Unsupported XSD construct at "${label}": xs:element ref="${rawElement['@_ref']}" is not supported. ${DOCS_HINT}`
		);
	}

	const complexType = rawElement['xs:complexType'];
	if (complexType) {
		for (const [member, message] of UNSUPPORTED_COMPLEX_TYPE_MEMBERS) {
			if (complexType[member as keyof typeof complexType] !== undefined) {
				throw new Error(`Unsupported XSD construct at "${label}": ${message}. ${DOCS_HINT}`);
			}
		}
	}
}

/**
 * Build a SchemaElement from a raw XSD element (recursive)
 * @param rawElement - Raw XSD element
 * @param parentPath - Parent element path (empty for root)
 * @param namedTypesMap - Map of named simple types
 * @returns SchemaElement with full tree
 */
export function buildElement(
	rawElement: RawXsdElement,
	parentPath: string,
	namedTypesMap: Map<string, NamedSimpleType>
): SchemaElement {
	assertSupportedElement(rawElement, parentPath);

	const name = rawElement['@_name'];
	const path = parentPath ? `${parentPath}.${name}` : name;
	const cardinality = parseCardinality(rawElement);

	let constraints: SchemaConstraints = { ...EMPTY_CONSTRAINTS };

	const hasComplexType = !!rawElement['xs:complexType'];
	const children: SchemaElement[] = [];

	if (rawElement['xs:simpleType']) {
		const restriction = rawElement['xs:simpleType']['xs:restriction'];
		constraints = extractConstraints(restriction);

		const baseTypeRef = restriction?.['@_base'];
		const baseType = resolveBaseType(baseTypeRef, namedTypesMap);

		return {
			name,
			path,
			baseType,
			constraints,
			cardinality,
			children,
			isComplex: false,
		};
	}

	if (hasComplexType) {
		const sequence = rawElement['xs:complexType']?.['xs:sequence'];
		if (sequence?.['xs:element']) {
			const childElements = Array.isArray(sequence['xs:element'])
				? sequence['xs:element']
				: [sequence['xs:element']];

			for (const childElement of childElements) {
				children.push(buildElement(childElement, path, namedTypesMap));
			}
		}

		return {
			name,
			path,
			baseType: 'string',
			constraints: { ...EMPTY_CONSTRAINTS },
			cardinality,
			children,
			isComplex: true,
		};
	}

	const typeRef = rawElement['@_type'];
	const baseType = resolveBaseType(typeRef, namedTypesMap);

	if (typeRef && !typeRef.startsWith('xs:')) {
		const namedType = namedTypesMap.get(typeRef);
		if (namedType) {
			constraints = { ...namedType.constraints };
		}
	}

	return {
		name,
		path,
		baseType,
		constraints,
		cardinality,
		children,
		isComplex: false,
	};
}

/**
 * Populate lookup maps by walking element tree
 * @param element - Root element or current element in traversal
 * @param elementsByPath - Map to populate with path -> element
 * @param elementsByName - Map to populate with name -> elements[]
 */
export function populateLookupMaps(
	element: SchemaElement,
	elementsByPath: Map<string, SchemaElement>,
	elementsByName: Map<string, SchemaElement[]>
): void {
	elementsByPath.set(element.path, element);

	const existing = elementsByName.get(element.name) ?? [];
	existing.push(element);
	elementsByName.set(element.name, existing);

	for (const child of element.children) {
		populateLookupMaps(child, elementsByPath, elementsByName);
	}
}
