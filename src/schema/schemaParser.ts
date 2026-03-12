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
		'xs:minLength'?: { '@_value': string };
		'xs:maxLength'?: { '@_value': string };
		'xs:minInclusive'?: { '@_value': string };
		'xs:maxInclusive'?: { '@_value': string };
		'xs:enumeration'?: { '@_value': string } | { '@_value': string }[];
	};
}

export interface RawXsdComplexType {
	'@_name'?: string;
	'xs:sequence'?: {
		'xs:element'?: RawXsdElement | RawXsdElement[];
	};
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
