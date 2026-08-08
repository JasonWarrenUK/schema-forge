/**
 * Test fixtures for schema module
 */
import type { SchemaElement, Cardinality, SchemaValidationIssue } from '../../../src/index';

// === Cardinality Fixtures ===

export const requiredSingle: Cardinality = { min: 1, max: 1 };
export const requiredMultiple: Cardinality = { min: 2, max: 5 };
export const optionalSingle: Cardinality = { min: 0, max: 1 };
export const optionalUnbounded: Cardinality = { min: 0, max: Infinity };
export const requiredUnbounded: Cardinality = { min: 1, max: Infinity };

// === Element Factory ===

/** Create a minimal SchemaElement for testing cardinality functions */
export function makeElement(cardinality: Cardinality): SchemaElement {
	return {
		name: 'Test',
		path: 'Test',
		baseType: 'string',
		constraints: {},
		cardinality,
		children: [],
		isComplex: false,
	};
}

// === Issue Fixtures (for computeResultStats tests) ===

export const errorIssue1: SchemaValidationIssue = {
	severity: 'error',
	type: 'required',
	elementPath: 'Message.Learner.ULN',
	message: 'ULN is required',
	code: 'SCHEMA_REQUIRED',
};

export const errorIssue2: SchemaValidationIssue = {
	severity: 'error',
	type: 'required',
	elementPath: 'Message.Learner.LearnRefNumber',
	message: 'LearnRefNumber is required',
	code: 'SCHEMA_REQUIRED',
};

export const warningIssue: SchemaValidationIssue = {
	severity: 'warning',
	type: 'pattern',
	elementPath: 'Message.Learner.Email',
	message: 'Email format looks unusual',
	code: 'SCHEMA_PATTERN',
};

export const infoIssue: SchemaValidationIssue = {
	severity: 'info',
	type: 'maxLength',
	elementPath: 'Message.Learner.FamilyName',
	message: 'Name approaching max length',
	code: 'SCHEMA_MAXLENGTH',
};

export const mixedIssues: SchemaValidationIssue[] = [
	errorIssue1,
	errorIssue2,
	warningIssue,
	infoIssue,
];

export const warningsOnly: SchemaValidationIssue[] = [warningIssue, infoIssue];
