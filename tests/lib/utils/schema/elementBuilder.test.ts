import { describe, it, expect } from 'vitest';
import { buildElement, populateLookupMaps } from '../../../../src/utils/schema/elementBuilder';
import type { RawXsdElement } from '../../../../src/schema/schemaParser';
import type { NamedSimpleType, SchemaElement } from '../../../../src/types/interpreterTypes';

describe('buildElement', () => {
	const emptyNamedTypes = new Map<string, NamedSimpleType>();

	it('should build simple element with xs:string type', () => {
		const rawElement: RawXsdElement = {
			'@_name': 'TestElement',
			'@_type': 'xs:string',
		};

		const result = buildElement(rawElement, '', emptyNamedTypes);

		expect(result.name).toBe('TestElement');
		expect(result.path).toBe('TestElement');
		expect(result.baseType).toBe('string');
		expect(result.isComplex).toBe(false);
		expect(result.children).toEqual([]);
	});

	it('should build nested path correctly', () => {
		const rawElement: RawXsdElement = {
			'@_name': 'Child',
			'@_type': 'xs:string',
		};

		const result = buildElement(rawElement, 'Parent', emptyNamedTypes);

		expect(result.path).toBe('Parent.Child');
	});

	it('should handle inline simpleType with constraints', () => {
		const rawElement: RawXsdElement = {
			'@_name': 'PostCode',
			'xs:simpleType': {
				'xs:restriction': {
					'@_base': 'xs:string',
					'xs:pattern': { '@_value': '[A-Z]{2}[0-9]{2}' },
					'xs:minLength': { '@_value': '4' },
				},
			},
		};

		const result = buildElement(rawElement, '', emptyNamedTypes);

		expect(result.baseType).toBe('string');
		expect(result.constraints.pattern).toBe('[A-Z]{2}[0-9]{2}');
		expect(result.constraints.minLength).toBe(4);
		expect(result.isComplex).toBe(false);
	});

	it('should handle complexType with children', () => {
		const rawElement: RawXsdElement = {
			'@_name': 'Person',
			'xs:complexType': {
				'xs:sequence': {
					'xs:element': [
						{ '@_name': 'Name', '@_type': 'xs:string' },
						{ '@_name': 'Age', '@_type': 'xs:int' },
					],
				},
			},
		};

		const result = buildElement(rawElement, '', emptyNamedTypes);

		expect(result.isComplex).toBe(true);
		expect(result.children).toHaveLength(2);
		expect(result.children[0].name).toBe('Name');
		expect(result.children[0].path).toBe('Person.Name');
		expect(result.children[1].name).toBe('Age');
		expect(result.children[1].path).toBe('Person.Age');
	});

	it('should handle single child element (not array)', () => {
		const rawElement: RawXsdElement = {
			'@_name': 'Container',
			'xs:complexType': {
				'xs:sequence': {
					'xs:element': { '@_name': 'Child', '@_type': 'xs:string' },
				},
			},
		};

		const result = buildElement(rawElement, '', emptyNamedTypes);

		expect(result.isComplex).toBe(true);
		expect(result.children).toHaveLength(1);
		expect(result.children[0].name).toBe('Child');
	});

	it('should resolve named type reference and inherit constraints', () => {
		const namedTypes = new Map<string, NamedSimpleType>([
			[
				'PostcodeType',
				{
					name: 'PostcodeType',
					baseType: 'string',
					constraints: { pattern: '[A-Z]{2}' },
				},
			],
		]);

		const rawElement: RawXsdElement = {
			'@_name': 'PostCode',
			'@_type': 'PostcodeType',
		};

		const result = buildElement(rawElement, '', namedTypes);

		expect(result.baseType).toBe('string');
		expect(result.constraints.pattern).toBe('[A-Z]{2}');
	});

	it('should parse cardinality from element attributes', () => {
		const rawElement: RawXsdElement = {
			'@_name': 'OptionalElement',
			'@_type': 'xs:string',
			'@_minOccurs': '0',
			'@_maxOccurs': 'unbounded',
		};

		const result = buildElement(rawElement, '', emptyNamedTypes);

		expect(result.cardinality).toEqual({ min: 0, max: Infinity });
	});
});

describe('populateLookupMaps', () => {
	it('should populate both lookup maps for single element', () => {
		const element: SchemaElement = {
			name: 'Test',
			path: 'Test',
			baseType: 'string',
			constraints: {},
			cardinality: { min: 1, max: 1 },
			children: [],
			isComplex: false,
		};

		const elementsByPath = new Map<string, SchemaElement>();
		const elementsByName = new Map<string, SchemaElement[]>();

		populateLookupMaps(element, elementsByPath, elementsByName);

		expect(elementsByPath.get('Test')).toBe(element);
		expect(elementsByName.get('Test')).toEqual([element]);
	});

	it('should recursively populate maps for element tree', () => {
		const child: SchemaElement = {
			name: 'Child',
			path: 'Parent.Child',
			baseType: 'string',
			constraints: {},
			cardinality: { min: 1, max: 1 },
			children: [],
			isComplex: false,
		};

		const parent: SchemaElement = {
			name: 'Parent',
			path: 'Parent',
			baseType: 'string',
			constraints: {},
			cardinality: { min: 1, max: 1 },
			children: [child],
			isComplex: true,
		};

		const elementsByPath = new Map<string, SchemaElement>();
		const elementsByName = new Map<string, SchemaElement[]>();

		populateLookupMaps(parent, elementsByPath, elementsByName);

		expect(elementsByPath.size).toBe(2);
		expect(elementsByPath.get('Parent')).toBe(parent);
		expect(elementsByPath.get('Parent.Child')).toBe(child);
		expect(elementsByName.get('Parent')).toEqual([parent]);
		expect(elementsByName.get('Child')).toEqual([child]);
	});

	it('should handle multiple elements with same name', () => {
		const child1: SchemaElement = {
			name: 'Field',
			path: 'Parent1.Field',
			baseType: 'string',
			constraints: {},
			cardinality: { min: 1, max: 1 },
			children: [],
			isComplex: false,
		};

		const child2: SchemaElement = {
			name: 'Field',
			path: 'Parent2.Field',
			baseType: 'int',
			constraints: {},
			cardinality: { min: 1, max: 1 },
			children: [],
			isComplex: false,
		};

		const elementsByPath = new Map<string, SchemaElement>();
		const elementsByName = new Map<string, SchemaElement[]>();

		populateLookupMaps(child1, elementsByPath, elementsByName);
		populateLookupMaps(child2, elementsByPath, elementsByName);

		expect(elementsByName.get('Field')).toHaveLength(2);
		expect(elementsByName.get('Field')).toEqual([child1, child2]);
	});

	it('gives each complex element its own constraints object', () => {
		const makeComplex = (name: string): RawXsdElement => ({
			'@_name': name,
			'xs:complexType': {
				'xs:sequence': {
					'xs:element': { '@_name': 'Leaf', '@_type': 'xs:string' },
				},
			},
		});

		const first = buildElement(makeComplex('First'), '', new Map());
		const second = buildElement(makeComplex('Second'), '', new Map());

		// Previously every complex element shared one EMPTY_CONSTRAINTS instance,
		// so mutating one element's constraints changed every other element's.
		expect(first.constraints).not.toBe(second.constraints);
	});
});
