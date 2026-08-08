import { describe, it, expect } from 'vitest';
import { buildSchemaRegistry } from '../../../src/schema/registryBuilder';
import * as fixtures from '../../fixtures/lib/xsdParser';

describe('buildSchemaRegistry', () => {
	describe('basic registry structure', () => {
		it('should build registry from minimal XSD', () => {
			const registry = buildSchemaRegistry(fixtures.minimalXsd);

			expect(registry.namespace).toBe(fixtures.expectedNamespace);
			expect(registry.rootElement.name).toBe('TestElement');
			expect(registry.rootElement.path).toBe('TestElement');
			expect(registry.rootElement.baseType).toBe('string');
		});

		it('should throw error if no root element found', () => {
			const emptyXsd = `<?xml version="1.0"?>
                              <xs:schema targetNamespace="http://test.example.com/2025"
                                                  xmlns:xs="http://www.w3.org/2001/XMLSchema">
                              </xs:schema>`;

			expect(() => buildSchemaRegistry(emptyXsd)).toThrow('Invalid XSD: no root element found');
		});
	});

	describe('cardinality parsing', () => {
		it('should parse optional element (minOccurs=0, maxOccurs=1)', () => {
			const registry = buildSchemaRegistry(fixtures.elementWithCardinality);
			const optional = registry.elementsByPath.get('TestContainer.OptionalElement');

			expect(optional).toBeDefined();
			expect(optional?.cardinality).toEqual({ min: 0, max: 1 });
		});

		it('should parse required element (minOccurs=1, maxOccurs=1)', () => {
			const registry = buildSchemaRegistry(fixtures.elementWithCardinality);
			const required = registry.elementsByPath.get('TestContainer.RequiredElement');

			expect(required).toBeDefined();
			expect(required?.cardinality).toEqual({ min: 1, max: 1 });
		});

		it('should parse repeating element (maxOccurs=unbounded)', () => {
			const registry = buildSchemaRegistry(fixtures.elementWithCardinality);
			const repeating = registry.elementsByPath.get('TestContainer.RepeatingElement');

			expect(repeating).toBeDefined();
			expect(repeating?.cardinality).toEqual({ min: 0, max: Infinity });
		});

		it('should use default cardinality when attributes absent', () => {
			const registry = buildSchemaRegistry(fixtures.minimalXsd);

			expect(registry.rootElement.cardinality).toEqual({ min: 1, max: 1 });
		});
	});

	describe('constraint extraction', () => {
		it('should extract pattern, minLength, maxLength from inline simpleType', () => {
			const registry = buildSchemaRegistry(fixtures.inlineSimpleType);
			const element = registry.rootElement;

			expect(element.constraints.pattern).toBe('[A-Z]{2}[0-9]{4}');
			expect(element.constraints.minLength).toBe(6);
			expect(element.constraints.maxLength).toBe(6);
		});

		it('should extract enumeration values', () => {
			const registry = buildSchemaRegistry(fixtures.enumerationType);
			const element = registry.rootElement;

			expect(element.constraints.enumeration).toEqual(['Active', 'Inactive', 'Pending']);
		});

		it('should handle named type constraints', () => {
			const registry = buildSchemaRegistry(fixtures.namedSimpleType);
			const element = registry.elementsByName.get('Postcode')?.[0];

			expect(element).toBeDefined();
			expect(element?.constraints.pattern).toBe('[A-Z]{1,2}[0-9]{1,2}[A-Z]? [0-9][A-Z]{2}');
		});
	});

	describe('type resolution', () => {
		it('should resolve xs:string to string base type', () => {
			const registry = buildSchemaRegistry(fixtures.minimalXsd);

			expect(registry.rootElement.baseType).toBe('string');
		});

		it('should resolve xs:int to int base type', () => {
			const registry = buildSchemaRegistry(fixtures.elementWithCardinality);
			const intElement = registry.elementsByPath.get('TestContainer.RequiredElement');

			expect(intElement?.baseType).toBe('int');
		});

		// ... (rest remain unchanged)
	});

	describe('complex types and nesting', () => {
		it('should mark complex types correctly', () => {
			const registry = buildSchemaRegistry(fixtures.complexTypeWithSequence);

			expect(registry.rootElement.isComplex).toBe(true);
			expect(registry.rootElement.children.length).toBe(3);
		});

		it('should build element tree with correct paths', () => {
			const registry = buildSchemaRegistry(fixtures.complexTypeWithSequence);

			expect(registry.rootElement.path).toBe('Person');

			const firstName = registry.elementsByPath.get('Person.FirstName');
			expect(firstName).toBeDefined();
			expect(firstName?.path).toBe('Person.FirstName');
			expect(firstName?.baseType).toBe('string');

			const age = registry.elementsByPath.get('Person.Age');
			expect(age).toBeDefined();
			expect(age?.path).toBe('Person.Age');
			expect(age?.baseType).toBe('int');
		});

		it('should handle child element cardinality', () => {
			const registry = buildSchemaRegistry(fixtures.complexTypeWithSequence);
			const age = registry.elementsByPath.get('Person.Age');

			expect(age?.cardinality).toEqual({ min: 0, max: 1 });
		});
	});

	describe('lookup maps', () => {
		it('should populate elementsByPath map', () => {
			const registry = buildSchemaRegistry(fixtures.complexTypeWithSequence);

			expect(registry.elementsByPath.size).toBe(4); // Person + 3 children
			expect(registry.elementsByPath.get('Person')).toBeDefined();
			expect(registry.elementsByPath.get('Person.FirstName')).toBeDefined();
			expect(registry.elementsByPath.get('Person.LastName')).toBeDefined();
			expect(registry.elementsByPath.get('Person.Age')).toBeDefined();
		});

		it('should populate elementsByName map', () => {
			const registry = buildSchemaRegistry(fixtures.complexTypeWithSequence);

			expect(registry.elementsByName.get('Person')).toHaveLength(1);
			expect(registry.elementsByName.get('FirstName')).toHaveLength(1);
			expect(registry.elementsByName.get('LastName')).toHaveLength(1);
			expect(registry.elementsByName.get('Age')).toHaveLength(1);
		});

		it('should handle multiple elements with same name (different paths)', () => {
			// This would require a fixture with duplicate names at different paths
			// For now, verify the structure supports it
			const registry = buildSchemaRegistry(fixtures.complexTypeWithSequence);
			const byName = registry.elementsByName.get('FirstName');

			expect(Array.isArray(byName)).toBe(true);
		});
	});

	describe('deep nesting (ILR-style structure)', () => {
		it('should build deeply nested element tree', () => {
			const registry = buildSchemaRegistry(fixtures.deeplyNestedStructure);

			expect(registry.rootElement.name).toBe('Message');
			expect(registry.rootElement.isComplex).toBe(true);
		});

		it('should create correct paths for deeply nested elements', () => {
			const registry = buildSchemaRegistry(fixtures.deeplyNestedStructure);

			expect(
				registry.elementsByPath.get('Message.Header.CollectionDetails.Collection')
			).toBeDefined();
			expect(registry.elementsByPath.get('Message.Header.CollectionDetails.Year')).toBeDefined();
			expect(registry.elementsByPath.get('Message.Header.Source.UKPRN')).toBeDefined();
			expect(registry.elementsByPath.get('Message.Learner.ULN')).toBeDefined();
		});

		it('should preserve constraints in deeply nested elements', () => {
			const registry = buildSchemaRegistry(fixtures.deeplyNestedStructure);
			const ukprn = registry.elementsByPath.get('Message.Header.Source.UKPRN');

			expect(ukprn?.baseType).toBe('int');
			expect(ukprn?.constraints.minInclusive).toBe(10000000);
			expect(ukprn?.constraints.maxInclusive).toBe(99999999);
		});

		it('should handle repeating elements in deep structures', () => {
			const registry = buildSchemaRegistry(fixtures.deeplyNestedStructure);
			const learner = registry.elementsByPath.get('Message.Learner');

			expect(learner?.cardinality).toEqual({ min: 1, max: Infinity });
		});
	});

	describe('basic registry structure', () => {
		it('should build registry from minimal XSD', () => {
			const registry = buildSchemaRegistry(fixtures.minimalXsd);

			expect(registry.namespace).toBe(fixtures.expectedNamespace);
			expect(registry.rootElement.name).toBe('TestElement');
			expect(registry.rootElement.path).toBe('TestElement');
			expect(registry.rootElement.baseType).toBe('string');
		});

		it('should throw error if no root element found', () => {
			const emptyXsd = `<?xml version="1.0"?>
                          <xs:schema targetNamespace="http://test.example.com/2025"
                                              xmlns:xs="http://www.w3.org/2001/XMLSchema">
                          </xs:schema>`;

			expect(() => buildSchemaRegistry(emptyXsd)).toThrow('Invalid XSD: no root element found');
		});

		it('should throw error if multiple root elements found', () => {
			const multiRootXsd = `<?xml version="1.0"?>
                          <xs:schema targetNamespace="http://test.example.com/2025"
                                              xmlns:xs="http://www.w3.org/2001/XMLSchema">
                                  <xs:element name="Root1" type="xs:string" />
                                  <xs:element name="Root2" type="xs:string" />
                          </xs:schema>`;

			expect(() => buildSchemaRegistry(multiRootXsd)).toThrow(
				'Multiple root elements not supported'
			);
		});
	});
});
