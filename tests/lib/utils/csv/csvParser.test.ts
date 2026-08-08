import { describe, it, expect } from 'vitest';
import { parseCSVContent } from '../../../../src/utils/csv/csvParser';
import * as fixtures from '../../../fixtures/lib/utils/csv/csvParser';

describe('parseCSVContent', () => {
	it('parses simple CSV data', () => {
		const result = parseCSVContent(fixtures.simpleCsv);

		expect(result.headers).toEqual(['name', 'age']);
		expect(result.rows).toEqual([
			{ name: 'Alice', age: '30' },
			{ name: 'Bob', age: '25' },
		]);
	});

	it('handles quoted fields with commas', () => {
		const result = parseCSVContent(fixtures.csvWithQuotedCommas);

		expect(result.rows[0].address).toBe('14 Forty Lane, Wembley Park');
		expect(result.rows[1].address).toBe('123 Main St, London');
	});

	it('handles escaped quotes within fields', () => {
		const result = parseCSVContent(fixtures.csvWithEscapedQuotes);

		expect(result.rows[0].note).toBe('She said "hello"');
	});

	it('trims whitespace from headers', () => {
		const result = parseCSVContent(fixtures.csvWithWhitespaceHeaders);

		expect(result.headers).toEqual(['name', 'age', 'city']);
	});

	it('handles BOM marker at start of file', () => {
		const result = parseCSVContent(fixtures.csvWithBom);

		expect(result.headers).toEqual(['name', 'age']);
	});

	it('skips empty lines', () => {
		const result = parseCSVContent(fixtures.csvWithEmptyLines);

		expect(result.rows).toHaveLength(2);
	});

	it('throws on empty CSV', () => {
		expect(() => parseCSVContent('')).toThrow('CSV file is empty');
		expect(() => parseCSVContent('\n\n')).toThrow('CSV file is empty');
	});

	it('handles empty field values', () => {
		const result = parseCSVContent(fixtures.csvWithEmptyFields);

		expect(result.rows[0]).toEqual({ name: 'Alice', age: '', city: 'London' });
		expect(result.rows[1]).toEqual({ name: '', age: '25', city: '' });
	});
});
