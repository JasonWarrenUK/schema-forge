/** |===================|| Transform Registry ||==================|
 *  | Built-in transformation functions for CSV→XML mapping.
 *  | Transforms are referenced by name in mapping configurations.
 *  |=============================================================|
 */

export interface TransformMetadata {
	fn: (value: string) => unknown;
	description: string;
	example: string;
	category: 'type' | 'date' | 'string' | 'conditional';
}

/**
 * Historic truncation length, inherited from the schema this engine was built
 * against. Kept as the default so existing mappings are unaffected, but the
 * length is a property of the target schema rather than of addresses, so
 * prefer normalizeAddress(n) with the length your own schema requires.
 */
const DEFAULT_ADDRESS_LENGTH = 50;

/** Trim, straighten curly quotes, and truncate to the given length. */
function normalizeAddressTo(value: string, maxLength: number): string {
	return value
		.trim()
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.slice(0, maxLength);
}

export const TRANSFORMS: Record<string, TransformMetadata> = {
	// === Type Conversions ===
	stringToInt: {
		fn: (v: string) => parseInt(v, 10) || 0,
		description: 'Convert string to integer (defaults to 0 if invalid)',
		example: "'123' → 123, 'invalid' → 0",
		category: 'type',
	},

	stringToIntOptional: {
		fn: (v: string) => {
			const trimmed = v.trim();
			if (trimmed === '') return undefined;
			const parsed = parseInt(trimmed, 10);
			return Number.isNaN(parsed) ? undefined : parsed;
		},
		description: 'Convert to integer, or undefined if empty',
		example: "'' → undefined, '123' → 123",
		category: 'type',
	},

	stringToFloat: {
		fn: (v: string) => parseFloat(v) || 0,
		description: 'Convert string to floating point number (defaults to 0 if invalid)',
		example: "'123.45' → 123.45, 'invalid' → 0",
		category: 'type',
	},

	stringToIntStrict: {
		fn: (v: string) => {
			const trimmed = v.trim();
			if (!/^[+-]?\d+$/.test(trimmed)) return undefined;
			return parseInt(trimmed, 10);
		},
		description: 'Convert to integer, or undefined if not a whole number',
		example: "'0' → 0, '12abc' → undefined, 'invalid' → undefined",
		category: 'type',
	},

	stringToFloatStrict: {
		fn: (v: string) => {
			const trimmed = v.trim();
			if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return undefined;
			return parseFloat(trimmed);
		},
		description: 'Convert to number, or undefined if not numeric',
		example: "'0' → 0, '1.5xyz' → undefined",
		category: 'type',
	},

	stringToBoolean: {
		fn: (v: string) => v.trim().toLowerCase() === 'true',
		description: "Convert 'true'/'false' strings to boolean",
		example: "'true' → true, 'false' → false",
		category: 'type',
	},

	// === Date/Time ===
	passthroughDate: {
		fn: (v: string) => v,
		description: 'Pass a date through unchanged; performs no parsing or reformatting',
		example: "'2025-01-28' → '2025-01-28', '28/01/2025' → '28/01/2025'",
		category: 'date',
	},

	passthroughDateTime: {
		fn: (v: string) => v,
		description: 'Pass a datetime through unchanged; performs no parsing or reformatting',
		example: "'2025-01-28T10:30:00Z' → '2025-01-28T10:30:00Z'",
		category: 'date',
	},

	/** @deprecated Named for a conversion it never performed. Use passthroughDate. */
	isoDate: {
		fn: (v: string) => v,
		description: 'Deprecated alias for passthroughDate',
		example: "'2025-01-28' → '2025-01-28'",
		category: 'date',
	},

	/** @deprecated Named for a conversion it never performed. Use passthroughDateTime. */
	isoDateTime: {
		fn: (v: string) => v,
		description: 'Deprecated alias for passthroughDateTime',
		example: "'2025-01-28T10:30:00Z' → '2025-01-28T10:30:00Z'",
		category: 'date',
	},

	// === String Transformations ===
	trim: {
		fn: (v: string) => v.trim(),
		description: 'Remove leading/trailing whitespace',
		example: "' text ' → 'text'",
		category: 'string',
	},

	uppercase: {
		fn: (v: string) => v.toUpperCase(),
		description: 'Convert to uppercase',
		example: "'male' → 'MALE'",
		category: 'string',
	},

	uppercaseTrim: {
		fn: (v: string) => v.trim().toUpperCase(),
		description: 'Trim whitespace and convert to uppercase',
		example: "' male ' → 'MALE', 'Z0001946 ' → 'Z0001946'",
		category: 'string',
	},

	postcode: {
		fn: (v: string) => v.trim().toUpperCase(),
		description: 'Format postcode: trim and uppercase, preserve internal space',
		example: "' sw1a 1aa ' → 'SW1A 1AA'",
		category: 'string',
	},

	uppercaseNoSpaces: {
		fn: (v: string) => v.toUpperCase().replace(/\s+/g, ''),
		description: 'Convert to uppercase and remove all spaces',
		example: "'sw1a 1aa' → 'SW1A1AA'",
		category: 'string',
	},

	lowercase: {
		fn: (v: string) => v.toLowerCase(),
		description: 'Convert to lowercase',
		example: "'MALE' → 'male'",
		category: 'string',
	},

	removeSpaces: {
		fn: (v: string) => v.replace(/\s+/g, ''),
		description: 'Strip all whitespace',
		example: "'AB 123 CD' → 'AB123CD'",
		category: 'string',
	},

	digitsOnly: {
		fn: (v: string) => v.replace(/\D/g, ''),
		description: 'Extract only digit characters',
		example: "'Tel: 020-1234-5678' → '02012345678'",
		category: 'string',
	},

	normalizeAddress: {
		fn: (v: string) => normalizeAddressTo(v, DEFAULT_ADDRESS_LENGTH),
		description: `Normalise address: trim, fix quotes, truncate to ${DEFAULT_ADDRESS_LENGTH} chars. Use normalizeAddress(n) for a different length`,
		example: "'123 St Stephen's Rd' → '123 St Stephen's Rd'",
		category: 'string',
	},

	// === Type Conversions (Additional) ===
	boolToInt: {
		fn: (v: string) => {
			const trimmed = v.trim().toLowerCase();
			if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') return 1;
			return 0;
		},
		description: 'Convert boolean/checkbox to 0 or 1',
		example: "'true' → 1, 'false' → 0, '1' → 1, '' → 0",
		category: 'type',
	},

	// === Conditional ===
	nullIfEmpty: {
		fn: (v: string) => (v.trim() === '' ? null : v),
		description: 'Convert empty string to null',
		example: "'' → null, 'text' → 'text'",
		category: 'conditional',
	},
};

/**
 * Parse a transform string that may include parameters
 * Examples:
 *   - "trim" → { name: "trim", args: [] }
 *   - "constant(1)" → { name: "constant", args: ["1"] }
 *   - "constant(SEI)" → { name: "constant", args: ["SEI"] }
 */
function parseTransform(transformStr: string): { name: string; args: string[] } {
	const match = transformStr.match(/^(\w+)(?:\((.*)\))?$/);
	if (!match) {
		throw new Error(`Invalid transform format: "${transformStr}"`);
	}

	const [, name, argsStr] = match;
	const args = argsStr ? [argsStr.trim()] : [];

	return { name, args };
}

/**
 * Resolve a transform function by name (with optional parameters)
 * Supports both simple transforms ("trim") and parameterized ones ("constant(1)")
 * @throws Error if transform name not found or parameters invalid
 */
export function getTransform(transformStr: string): TransformMetadata['fn'] {
	const { name, args } = parseTransform(transformStr);

	// Handle parameterized transforms
	if (name === 'normalizeAddress' && args.length > 0) {
		const maxLength = Number(args[0]);
		if (!Number.isInteger(maxLength) || maxLength < 1) {
			throw new Error(`normalizeAddress() expects a positive integer, got "${args[0]}"`);
		}
		return (v: string) => normalizeAddressTo(v, maxLength);
	}

	if (name === 'constant') {
		if (args.length === 0) {
			throw new Error('constant() transform requires an argument');
		}
		const constantValue = args[0];
		// Try to parse as number, otherwise return as string
		const numValue = Number(constantValue);
		const value = Number.isNaN(numValue) ? constantValue : numValue;
		return () => value;
	}

	// Handle standard transforms
	const transform = TRANSFORMS[name];
	if (!transform) {
		throw new Error(
			`Unknown transform: "${name}". Available: ${Object.keys(TRANSFORMS).join(', ')}, constant(value)`
		);
	}
	return transform.fn;
}

/**
 * Get all available transform names grouped by category
 */
export function getTransformsByCategory(): Record<string, string[]> {
	const grouped: Record<string, string[]> = {
		type: [],
		date: [],
		string: [],
		conditional: [],
	};

	for (const [name, meta] of Object.entries(TRANSFORMS)) {
		grouped[meta.category].push(name);
	}

	return grouped;
}

/**
 * Get transform metadata for display in UI
 */
export function getTransformMetadata(name: string): TransformMetadata | null {
	return TRANSFORMS[name] ?? null;
}
