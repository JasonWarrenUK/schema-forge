/** Test Schema-Driven XML Generator
 *
 * Tests the new generateFromSchema function that uses SchemaRegistry
 * to dynamically generate XML instead of hardcoded interfaces.
 */

import { describe, it, expect } from 'vitest';
import { generateFromSchema } from '../../../../src/utils/xml/xmlGenerator';
import { buildSchemaRegistry } from '../../../../src/schema/registryBuilder';
import { readFileSync } from 'fs';
import * as fixtures from '../../../fixtures/lib/utils/xml/xmlGenerator';

// Load the actual ILR XSD schema
const xsdPath = new URL('../../../fixtures/schemafile25.xsd', import.meta.url).pathname;
const xsdContent = readFileSync(xsdPath, 'utf-8');
const registry = buildSchemaRegistry(xsdContent);

describe('generateFromSchema', () => {
	it('should generate valid XML declaration and root element with namespace', () => {
		const result = generateFromSchema(fixtures.minimalSchemaMessage, registry);

		expect(result.xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
		expect(result.xml).toContain('<Message xmlns="ESFA/ILR/2025-26" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');
		expect(result.xml).toContain('</Message>');
	});

	it('should generate elements in schema-defined order', () => {
		const result = generateFromSchema(fixtures.messageWithWrongOrder, registry);

		// Header should come before LearningProvider in output
		const headerIndex = result.xml.indexOf('<Header>');
		const providerIndex = result.xml.indexOf('<LearningProvider>');
		expect(headerIndex).toBeLessThan(providerIndex);

		// Within Header, CollectionDetails should come before Source
		const collectionIndex = result.xml.indexOf('<CollectionDetails>');
		const sourceIndex = result.xml.indexOf('<Source>');
		expect(collectionIndex).toBeLessThan(sourceIndex);
	});

	it('should handle repeatable elements (arrays)', () => {
		const result = generateFromSchema(fixtures.messageWithLearners, registry);

		expect(result.xml).toContain('<LearnRefNumber>L001</LearnRefNumber>');
		expect(result.xml).toContain('<LearnRefNumber>L002</LearnRefNumber>');
		expect((result.xml.match(/<Learner>/g) || []).length).toBe(2);
	});

	it('should omit optional elements when not provided', () => {
		const result = generateFromSchema(fixtures.minimalSchemaMessage, registry);

		expect(result.xml).not.toContain('<SoftwareSupplier>');
		expect(result.xml).not.toContain('<SoftwarePackage>');
		expect(result.xml).not.toContain('<Release>');
	});

	it('should include optional elements when provided', () => {
		const result = generateFromSchema(fixtures.messageWithOptionalFields, registry);

		expect(result.xml).toContain('<SoftwareSupplier>Founders and Coders</SoftwareSupplier>');
		expect(result.xml).toContain('<SoftwarePackage>Iris</SoftwarePackage>');
		expect(result.xml).toContain('<Release>1.0.0</Release>');
	});

	it('should escape XML special characters', () => {
		const result = generateFromSchema(fixtures.messageWithSpecialChars, registry);

		expect(result.xml).toContain('O&apos;Brien &amp; Co &lt;Test&gt;');
		expect(result.xml).not.toContain("O'Brien & Co <Test>");
	});

	it('should warn when required elements are missing', () => {
		const result = generateFromSchema(fixtures.messageMissingRequired, registry);

		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: expect.stringContaining('Year'),
					message: expect.stringContaining('missing'),
				}),
			])
		);
	});

	it('should warn when data structure does not match schema', () => {
		const result = generateFromSchema(fixtures.messageWithWrongType, registry);

		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: expect.stringContaining('Header'),
					message: expect.stringContaining('Expected object'),
				}),
			])
		);
	});

	it('should warn when array expected but single value provided', () => {
		const result = generateFromSchema(fixtures.messageWithNonArrayRepeatable, registry);

		expect(result.warnings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: expect.stringContaining('Learner'),
					message: expect.stringContaining('Expected array'),
				}),
			])
		);
	});

	it('should respect custom indent option', () => {
		const result = generateFromSchema(fixtures.minimalSchemaMessage, registry, { indent: 4 });

		// With 4-space indent, nested elements should have 4 spaces
		expect(result.xml).toContain('    <Header>');
		expect(result.xml).toContain('        <CollectionDetails>');
	});

	describe('escaping and malformed output', () => {
		it('escapes special characters in the namespace attribute', () => {
			const result = generateFromSchema(fixtures.minimalSchemaMessage, registry, {
				namespace: 'urn:x?a=1&b=2',
			});

			expect(result.xml).toContain('xmlns="urn:x?a=1&amp;b=2"');
			expect(result.xml).not.toContain('a=1&b=2"');
		});

		it('does not let a namespace break out of its attribute', () => {
			const result = generateFromSchema(fixtures.minimalSchemaMessage, registry, {
				namespace: 'urn:x" onload="evil',
			});

			expect(result.xml).not.toContain('onload="evil"');
			expect(result.xml).toContain('&quot;');
		});

		it('warns instead of emitting [object Object] for a non-primitive leaf', () => {
			const data = {
				Header: { CollectionDetails: { Collection: { nested: 'object' } } },
			};

			const result = generateFromSchema(data, registry);

			expect(result.xml).not.toContain('[object Object]');
			expect(result.warnings.some((w) => /Collection/.test(w.path))).toBe(true);
		});
	});
});
