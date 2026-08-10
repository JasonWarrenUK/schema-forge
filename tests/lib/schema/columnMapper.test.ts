import { describe, it, expect } from 'vitest';
import { mapCsvToSchema } from '../../../src/schema/columnMapper';
import * as fixtures from '../../fixtures/lib/columnMapper';
import { buildSchemaRegistry } from '../../../src/schema/registryBuilder';
import { readFileSync } from 'fs';

describe('columnMapper', () => {
	// Load actual schema for path validation
	const xsdPath = new URL('../../fixtures/schemafile25.xsd', import.meta.url).pathname;
	const xsdContent = readFileSync(xsdPath, 'utf-8');
	const registry = buildSchemaRegistry(xsdContent);

	describe('mapCsvToSchema', () => {
		it('should map simple CSV columns to nested structure', () => {
			const result = mapCsvToSchema(fixtures.sampleCsvRow, fixtures.simpleMappings, registry);

			expect(result).toEqual({
				Message: {
					Learner: [
						{
							LearnRefNumber: 'L12345',
							GivenNames: 'Jane',
							FamilyName: 'Smith',
						},
					],
				},
			});
		});

		it('should apply transform functions when provided', () => {
			const result = mapCsvToSchema(
				fixtures.sampleCsvRow,
				fixtures.mappingsWithTransform,
				registry
			);

			expect(result).toEqual({
				Message: {
					Learner: [
						{
							DateOfBirth: '1995-06-15',
							Postcode: 'SW1A1AA',
						},
					],
				},
			});
		});

		it('should handle case-insensitive column matching', () => {
			const csvRow = {
				'LEARNER REFERENCE': 'L12345',
				'given names': 'Jane',
			};

			const mappings: typeof fixtures.simpleMappings = [
				{ csvColumn: 'Learner Reference', xsdPath: 'Message.Learner.LearnRefNumber' },
				{ csvColumn: 'Given Names', xsdPath: 'Message.Learner.GivenNames' },
			];

			const result = mapCsvToSchema(csvRow, mappings, registry);

			expect(result.Message).toBeDefined();
			expect((result.Message as any).Learner[0].LearnRefNumber).toBe('L12345');
			expect((result.Message as any).Learner[0].GivenNames).toBe('Jane');
		});

		it('should skip mappings for missing CSV columns', () => {
			const partialRow = {
				'Learner Reference': 'L12345',
				// Missing 'Given Names' and 'Family Name'
			};

			const result = mapCsvToSchema(partialRow, fixtures.simpleMappings, registry);

			expect(result).toEqual({
				Message: {
					Learner: [
						{
							LearnRefNumber: 'L12345',
						},
					],
				},
			});
		});

		it('should handle deep nested paths', () => {
			const deepMappings = [
				{
					csvColumn: 'Aim Reference',
					xsdPath: 'Message.Learner.LearningDelivery.AimSeqNumber',
				},
			];

			const csvRow = { 'Aim Reference': '1' };

			const result = mapCsvToSchema(csvRow, deepMappings, registry);

			expect(result).toEqual({
				Message: {
					Learner: [
						{
							LearningDelivery: [
								{
									AimSeqNumber: '1',
								},
							],
						},
					],
				},
			});
		});
	});

	describe('malicious and malformed paths', () => {
		it('should reject a path segment that reaches the prototype chain', () => {
			expect(() =>
				mapCsvToSchema({ evil: 'PWNED' }, [{ csvColumn: 'evil', xsdPath: 'Message.__proto__.polluted' }], registry)
			).toThrow(/unsafe path segment/i);

			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});

		it('should reject the constructor.prototype route as well', () => {
			expect(() =>
				mapCsvToSchema(
					{ evil: 'PWNED' },
					[{ csvColumn: 'evil', xsdPath: 'Message.constructor.prototype.polluted2' }],
					registry
				)
			).toThrow(/unsafe path segment/i);

			expect(({} as Record<string, unknown>).polluted2).toBeUndefined();
		});

		it('should reject a path that is not present in the schema', () => {
			expect(() =>
				mapCsvToSchema({ v: 'x' }, [{ csvColumn: 'v', xsdPath: 'Message.NoSuchElement.Field' }], registry)
			).toThrow(/not found in schema/i);
		});

		it('should throw when a scalar is mapped where a later path descends', () => {
			// Both paths exist in the schema, so this is a genuine collision rather
			// than a typo: "Message" is written as a scalar, then "Message.Header"
			// tries to descend through it.
			const mappings = [
				{ csvColumn: 'a', xsdPath: 'Message' },
				{ csvColumn: 'b', xsdPath: 'Message.Header' },
			];

			expect(() => mapCsvToSchema({ a: '1', b: '2' }, mappings, registry)).toThrow(/conflict/i);
		});

		it('should throw rather than silently drop when the collision is reversed', () => {
			// Previously this overwrote the nested object with the scalar and
			// returned successfully, losing everything mapped underneath it.
			const mappings = [
				{ csvColumn: 'b', xsdPath: 'Message.Header' },
				{ csvColumn: 'a', xsdPath: 'Message' },
			];

			expect(() => mapCsvToSchema({ a: '1', b: '2' }, mappings, registry)).toThrow(/conflict/i);
		});
	});
});
