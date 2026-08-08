import type { ColumnMapping, MappingConfig } from '../../../src/types/schemaTypes';

export const simpleMappings: ColumnMapping[] = [
	{
		csvColumn: 'Learner Reference',
		xsdPath: 'Message.Learner.LearnRefNumber',
	},
	{
		csvColumn: 'Given Names',
		xsdPath: 'Message.Learner.GivenNames',
	},
	{
		csvColumn: 'Family Name',
		xsdPath: 'Message.Learner.FamilyName',
	},
];

export const mappingsWithTransform: ColumnMapping[] = [
	{
		csvColumn: 'Birth Date',
		xsdPath: 'Message.Learner.DateOfBirth',
		transform: 'isoDate',
	},
	{
		csvColumn: 'Postcode',
		xsdPath: 'Message.Learner.Postcode',
		transform: 'uppercaseNoSpaces',
	},
];

export const sampleCsvRow: Record<string, string> = {
	'Learner Reference': 'L12345',
	'Given Names': 'Jane',
	'Family Name': 'Smith',
	'Birth Date': '1995-06-15',
	Postcode: 'sw1a 1aa',
};

export const mockMappingConfig: MappingConfig = {
	id: 'test-mapping',
	name: 'Test Mapping Configuration',
	mappingVersion: '1.0.0',
	targetSchema: {
		namespace: 'ESFA/ILR/2025-26',
		version: '1.0',
		displayName: 'Test Schema',
	},
	mappings: simpleMappings,
};
