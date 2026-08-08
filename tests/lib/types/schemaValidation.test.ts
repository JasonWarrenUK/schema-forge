import { describe, it, expect } from 'vitest';
import {
	createIssue,
	createEmptyResult,
	computeResultStats,
} from '../../../src/types/schemaTypes';

// Note: Full test coverage is in tests/lib/schema/schemaValidation.test.ts
// This file ensures the types module is directly testable

describe('schemaValidation types module', () => {
	describe('createIssue', () => {
		it('creates an issue with required fields', () => {
			const issue = createIssue('required', 'Message.Learner.ULN', 'ULN is required');
			expect(issue.type).toBe('required');
			expect(issue.elementPath).toBe('Message.Learner.ULN');
			expect(issue.message).toBe('ULN is required');
		});
	});

	describe('createEmptyResult', () => {
		it('creates a valid empty result', () => {
			const result = createEmptyResult('ESFA/ILR/2025-26');
			expect(result.valid).toBe(true);
			expect(result.issues).toEqual([]);
		});
	});

	describe('computeResultStats', () => {
		it('computes result from empty issues', () => {
			const result = computeResultStats([], 'ESFA/ILR/2025-26');
			expect(result.valid).toBe(true);
			expect(result.errorCount).toBe(0);
		});
	});
});
