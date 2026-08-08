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

});
