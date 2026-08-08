import { describe, expect, it } from 'vitest';
import { createIssue, createEmptyResult, computeResultStats } from '../../../src/index';
import * as fixtures from '../../fixtures/lib/schema';

describe('createIssue', () => {
	it('creates an issue with required fields', () => {
		const issue = createIssue('required', 'Message.Learner.ULN', 'ULN is required');

		expect(issue).toMatchObject({
			severity: 'error',
			type: 'required',
			elementPath: 'Message.Learner.ULN',
			message: 'ULN is required',
			code: 'SCHEMA_REQUIRED',
		});
	});

	it('uses provided severity instead of default', () => {
		const issue = createIssue('pattern', 'Message.Learner.Sex', 'Invalid sex code', {
			severity: 'warning',
		});

		expect(issue.severity).toBe('warning');
	});

	it('uses provided code instead of generated one', () => {
		const issue = createIssue('enumeration', 'Message.Header.Collection', 'Invalid collection', {
			code: 'CUSTOM_CODE',
		});

		expect(issue.code).toBe('CUSTOM_CODE');
	});

	it('includes optional fields when provided', () => {
		const issue = createIssue('maxLength', 'Message.Learner.FamilyName', 'Name too long', {
			actualValue: 'A very long name that exceeds the limit',
			rowIndex: 5,
			sourceField: 'FamilyName',
			constraint: { maxLength: 100 },
		});

		expect(issue.actualValue).toBe('A very long name that exceeds the limit');
		expect(issue.rowIndex).toBe(5);
		expect(issue.sourceField).toBe('FamilyName');
		expect(issue.constraint).toEqual({ maxLength: 100 });
	});
});

describe('createEmptyResult', () => {
	it('creates a valid empty result', () => {
		const result = createEmptyResult('ESFA/ILR/2025-26');

		expect(result).toEqual({
			valid: true,
			issues: [],
			errorCount: 0,
			warningCount: 0,
			infoCount: 0,
			schemaNamespace: 'ESFA/ILR/2025-26',
			schemaVersion: undefined,
		});
	});

	it('includes schema version when provided', () => {
		const result = createEmptyResult('ESFA/ILR/2025-26', '1.0');

		expect(result.schemaVersion).toBe('1.0');
	});
});

describe('computeResultStats', () => {
	it('computes counts correctly from mixed issues', () => {
		const result = computeResultStats(fixtures.mixedIssues, 'ESFA/ILR/2025-26');

		expect(result.errorCount).toBe(2);
		expect(result.warningCount).toBe(1);
		expect(result.infoCount).toBe(1);
		expect(result.issues).toBe(fixtures.mixedIssues);
	});

	it('marks result as invalid when errors exist', () => {
		const result = computeResultStats([fixtures.errorIssue1], 'ESFA/ILR/2025-26');

		expect(result.valid).toBe(false);
	});

	it('marks result as valid when only warnings/info exist', () => {
		const result = computeResultStats(fixtures.warningsOnly, 'ESFA/ILR/2025-26');

		expect(result.valid).toBe(true);
	});

	it('marks result as valid when no issues exist', () => {
		const result = computeResultStats([], 'ESFA/ILR/2025-26');

		expect(result.valid).toBe(true);
		expect(result.errorCount).toBe(0);
		expect(result.warningCount).toBe(0);
		expect(result.infoCount).toBe(0);
	});

	it('includes schema version when provided', () => {
		const result = computeResultStats([], 'ESFA/ILR/2025-26', '1.0');

		expect(result.schemaVersion).toBe('1.0');
	});
});
