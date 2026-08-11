import { describe, it, expect } from 'vitest';
import { buildSchemaRegistry } from '../../../src/schema/registryBuilder';
import * as fixtures from '../../fixtures/lib/unsupportedXsd';

/**
 * Every construct below used to build a registry successfully and silently
 * drop the content, so a caller checking for errors saw none and generated
 * XML missing whole subtrees. They now fail at load, which is the honest
 * signal that the schema is outside what schema-forge handles.
 */
describe('unsupported XSD constructs', () => {
	it.each([
		['xs:choice', fixtures.withChoice],
		['xs:all', fixtures.withAll],
		['xs:group', fixtures.withGroup],
		['xs:any', fixtures.withAny],
		['xs:attribute', fixtures.withAttribute],
		['xs:complexContent', fixtures.withComplexContent],
		['xs:simpleContent', fixtures.withSimpleContent],
		['named xs:complexType', fixtures.withNamedComplexType],
		['xs:element ref', fixtures.withElementRef],
		['xs:include', fixtures.withInclude],
		['xs:import', fixtures.withImport],
	])('throws for %s', (construct, xsd) => {
		expect(() => buildSchemaRegistry(xsd)).toThrow(new RegExp(construct.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'i'));
	});

	it('names the element path so the problem can be located', () => {
		expect(() => buildSchemaRegistry(fixtures.withChoice)).toThrow(/Root/);
	});

	it('still builds a supported schema', () => {
		const registry = buildSchemaRegistry(fixtures.supported);

		expect(registry.rootElement.name).toBe('Root');
		expect(registry.rootElement.children).toHaveLength(1);
		expect(registry.namespace).toBe('urn:test');
	});
});
