/** |===================|| Schema Interpretation Types ||==================|
 *  | These types represent the parsed structure of an XSD file in a form
 *  | that's useful for validation, generation, and mapping.
 *  |=======================================================================|
 */

export interface Cardinality {
	min: number;
	max: number;
}

export type XsdBaseType =
	| 'string'
	| 'int'
	| 'integer'
	| 'long'
	| 'decimal'
	| 'date'
	| 'dateTime'
	| 'boolean';

export interface SchemaConstraints {
	pattern?: string /* from xs:pattern */;
	minLength?: number /* from xs:minLength */;
	maxLength?: number /* from xs:maxLength */;
	minInclusive?: number /* from xs:minInclusive */;
	maxInclusive?: number /* from xs:maxInclusive */;
	minExclusive?: number /* from xs:minExclusive */;
	maxExclusive?: number /* from xs:maxExclusive */;
	totalDigits?: number /* from xs:totalDigits */;
	fractionDigits?: number /* from xs:fractionDigits */;
	enumeration?: string[] /* from xs:enumeration */;
}

export interface SchemaElement {
	name: string;
	path: string; // from root
	baseType: XsdBaseType;
	constraints: SchemaConstraints;
	cardinality: Cardinality;
	children: SchemaElement[];
	isComplex: boolean;
	documentation?: string; // from xs:annotation/xs:documentation
}

export interface NamedSimpleType {
	name: string;
	baseType: XsdBaseType;
	constraints: SchemaConstraints;
}

export interface SchemaRegistry {
	/** Target namespace from the XSD */
	namespace: string;
	/** XSD schema version attribute (e.g., "1.0") */
	schemaVersion?: string;
	/** Optional: filename of loaded XSD (e.g., "schemafile25.xsd") */
	sourceFile?: string;
	rootElement: SchemaElement;
	elementsByPath: Map<string, SchemaElement>;
	elementsByName: Map<string, SchemaElement[]>;
	namedTypes: Map<string, NamedSimpleType>;
}

export interface SchemaRegistryOptions {
	includeDocumentation?: boolean;
	resolveNamedTypes?: boolean;
}

export type ElementLookupResult =
	| { found: true; element: SchemaElement }
	| { found: false; error: string };

export function isRequired(element: SchemaElement): boolean {
	return element.cardinality.min >= 1;
}

export function isRepeatable(element: SchemaElement): boolean {
	return element.cardinality.max > 1;
}

export function isOptional(element: SchemaElement): boolean {
	return element.cardinality.min === 0;
}

/**
 * Determines if an element is effectively required given current mappings.
 * Walks the ancestor chain: if any optional ancestor has no mapped descendants,
 * it won't be generated — so its mandatory children aren't truly required.
 * If an optional ancestor DOES have mapped descendants, its mandatory children
 * become effectively required.
 */
export function isEffectivelyRequired(
	element: SchemaElement,
	registry: SchemaRegistry,
	mappedPaths: Set<string>,
): boolean {
	// Element itself is optional — never effectively required
	if (element.cardinality.min < 1) return false;

	// Walk up ancestor chain via path decomposition
	const segments = element.path.split('.');
	for (let i = 1; i < segments.length - 1; i++) {
		const ancestorPath = segments.slice(0, i + 1).join('.');
		const ancestor = registry.elementsByPath.get(ancestorPath);
		if (!ancestor) continue;

		// Only care about optional ancestors
		if (ancestor.cardinality.min >= 1) continue;

		// Optional ancestor found — check if any mapped path falls under it
		const prefix = ancestorPath + '.';
		let hasMapping = false;
		for (const mp of mappedPaths) {
			if (mp.startsWith(prefix)) {
				hasMapping = true;
				break;
			}
		}

		// If no mappings under this optional ancestor, it won't be generated
		// so this element isn't effectively required
		if (!hasMapping) return false;
	}

	// All ancestors either mandatory or have mappings — element is required
	return true;
}

export const DEFAULT_CARDINALITY: Cardinality = { min: 1, max: 1 };
export const EMPTY_CONSTRAINTS: SchemaConstraints = {};
