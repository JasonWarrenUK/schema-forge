/** |===================|| Schema Parser Types ||==================|
 *  | Parses XSD schema files into raw element structures. This
 *  | module handles the low-level parsing of XSD XML files
 *  | using fast-xml-parser. The raw structures are then
 *  | transformed into SchemaRegistry by the registry builder.
 *  |==============================================================|
 */

import { XMLParser } from 'fast-xml-parser';

/* <<--------------------------------------------------------------------->> */

export interface RawXsdElement {
	'@_name': string;
	'@_type'?: string; // xs:string, xs:int, or reference to named type
	/** Reference to a globally declared element. Not supported; detected so it can be reported. */
	'@_ref'?: string;
	'@_minOccurs'?: string;
	'@_maxOccurs'?: string;
	'xs:simpleType'?: RawXsdSimpleType;
	'xs:complexType'?: RawXsdComplexType;
}

export interface RawXsdSimpleType {
	'@_name'?: string;
	'xs:restriction'?: {
		'@_base': string; // xs:string, xs:int, etc.
		'xs:pattern'?: { '@_value': string } | { '@_value': string }[];
		'xs:length'?: { '@_value': string };
		'xs:minLength'?: { '@_value': string };
		'xs:maxLength'?: { '@_value': string };
		'xs:minInclusive'?: { '@_value': string };
		'xs:maxInclusive'?: { '@_value': string };
		'xs:minExclusive'?: { '@_value': string };
		'xs:maxExclusive'?: { '@_value': string };
		'xs:totalDigits'?: { '@_value': string };
		'xs:fractionDigits'?: { '@_value': string };
		'xs:enumeration'?: { '@_value': string } | { '@_value': string }[];
	};
}

/** minOccurs/maxOccurs carried by a particle itself rather than by its children. */
export interface RawXsdOccurs {
	'@_minOccurs'?: string;
	'@_maxOccurs'?: string;
}

/** The children a compositor may carry.
 *
 * The parser runs without preserveOrder, so siblings collapse into keys and the
 * relative order of an xs:element and a following xs:choice is not recoverable
 * from this shape. A walker can traverse each key but cannot reconstruct schema
 * order across different keys.
 */
export interface RawXsdParticleChildren {
	'xs:element'?: RawXsdElement | RawXsdElement[];
	'xs:sequence'?: RawXsdSequence | RawXsdSequence[];
	'xs:choice'?: RawXsdChoice | RawXsdChoice[];
	'xs:group'?: RawXsdGroup | RawXsdGroup[];
	/* Wildcards are never scheduled for support, so they are modelled only far
	   enough to be detected. */
	'xs:any'?: unknown;
}

export interface RawXsdSequence extends RawXsdOccurs, RawXsdParticleChildren {}

export interface RawXsdChoice extends RawXsdOccurs, RawXsdParticleChildren {}

/** xs:all admits only xs:element in XSD 1.0, so it carries no compositors. */
export interface RawXsdAll extends RawXsdOccurs {
	'xs:element'?: RawXsdElement | RawXsdElement[];
}

/** Both a global group definition (@_name plus a particle) and a reference to
 *  one (@_ref plus occurs). XSD gives the two the same element name, so the
 *  parser gives them the same key. */
export interface RawXsdGroup extends RawXsdOccurs {
	'@_name'?: string;
	'@_ref'?: string;
	'xs:sequence'?: RawXsdSequence;
	'xs:choice'?: RawXsdChoice;
	'xs:all'?: RawXsdAll;
}

export interface RawXsdComplexType {
	'@_name'?: string;
	/* At most one particle child is permitted here, so unlike nested positions
	   these are single values rather than T | T[]. */
	'xs:sequence'?: RawXsdSequence;
	'xs:choice'?: RawXsdChoice;
	'xs:all'?: RawXsdAll;
	'xs:group'?: RawXsdGroup;
	/* Constructs schema-forge does not build. Modelled only far enough to be
	   detected and reported rather than silently ignored. */
	'xs:any'?: unknown;
	'xs:complexContent'?: unknown;
	'xs:simpleContent'?: unknown;
	'xs:attribute'?: unknown;
	'xs:attributeGroup'?: unknown;
}

/* <<--------------------------------------------------------------------->> */

export interface ParsedXsdRoot {
	'xs:schema': {
		'@_targetNamespace': string;
		'@_version'?: string;
		'@_xmlns:xs': string;
		'xs:element'?: RawXsdElement | RawXsdElement[];
		'xs:simpleType'?: RawXsdSimpleType | RawXsdSimpleType[];
		'xs:complexType'?: RawXsdComplexType | RawXsdComplexType[];
		'xs:group'?: RawXsdGroup | RawXsdGroup[];
		/* Multi-document schemas. Detected so they can be reported: resolving
		   them needs a file resolver, which buildSchemaRegistry does not take. */
		'xs:include'?: unknown;
		'xs:import'?: unknown;
	};
}

/* <<--------------------------------------------------------------------->> */

export function parseXsd(xsdContent: string): ParsedXsdRoot {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		parseAttributeValue: false,
		trimValues: true,
	});

	const parsed = parser.parse(xsdContent);

	if (!parsed['xs:schema']) throw new Error('Invalid XSD: missing xs:schema root element');

	return parsed as ParsedXsdRoot;
}

/* <<--------------------------------------------------------------------->> */

export function extractNamespace(xsdRoot: ParsedXsdRoot): string {
	const namespace = xsdRoot['xs:schema']['@_targetNamespace'];

	if (!namespace) throw new Error('Invalid XSD: missing targetNamespace attribute');

	return namespace;
}

export function extractVersion(xsdRoot: ParsedXsdRoot): string | undefined {
	return xsdRoot['xs:schema']['@_version'];
}

export function extractElements(xsdRoot: ParsedXsdRoot): RawXsdElement[] {
	const elements = xsdRoot['xs:schema']['xs:element'];

	if (!elements) return [];

	return Array.isArray(elements) ? elements : [elements];
}

export function extractNamedSimpleTypes(xsdRoot: ParsedXsdRoot): RawXsdSimpleType[] {
	const types = xsdRoot['xs:schema']['xs:simpleType'];

	if (!types) return [];

	return Array.isArray(types) ? types : [types];
}

export function extractNamedComplexTypes(xsdRoot: ParsedXsdRoot): RawXsdComplexType[] {
	const types = xsdRoot['xs:schema']['xs:complexType'];

	if (!types) return [];

	return Array.isArray(types) ? types : [types];
}
