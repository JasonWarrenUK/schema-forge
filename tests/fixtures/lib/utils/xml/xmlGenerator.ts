
/** Dynamic Schema-Driven Generator Fixtures */

/** Minimal message structure for schema-driven generation */
export const minimalSchemaMessage = {
	Header: {
		CollectionDetails: {
			Collection: 'ILR',
			Year: '2526',
			FilePreparationDate: '2026-01-26',
		},
		Source: {
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			UKPRN: 10000001,
			SerialNo: '01',
			DateTime: '2026-01-26T10:00:00Z',
		},
	},
	LearningProvider: {
		UKPRN: 10000001,
	},
	Learner: [],
};

/** Message with optional source fields populated */
export const messageWithOptionalFields = {
	Header: {
		CollectionDetails: {
			Collection: 'ILR',
			Year: '2526',
			FilePreparationDate: '2026-01-26',
		},
		Source: {
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			UKPRN: 10000001,
			SoftwareSupplier: 'Founders and Coders',
			SoftwarePackage: 'Iris',
			Release: '1.0.0',
			SerialNo: '01',
			DateTime: '2026-01-26T10:00:00Z',
		},
	},
	LearningProvider: { UKPRN: 10000001 },
	Learner: [],
};

/** Message with fields in wrong order (to test schema ordering) */
export const messageWithWrongOrder = {
	// Deliberately in wrong order - generator should fix it
	LearningProvider: { UKPRN: 10000001 },
	Learner: [],
	Header: {
		Source: {
			DateTime: '2026-01-26T10:00:00Z',
			UKPRN: 10000001,
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			SerialNo: '01',
		},
		CollectionDetails: {
			FilePreparationDate: '2026-01-26',
			Year: '2526',
			Collection: 'ILR',
		},
	},
};

/** Minimal learner data for schema-driven generation */
export const minimalSchemaLearner = {
	LearnRefNumber: 'L001',
	ULN: 1234567890,
	Ethnicity: 31,
	Sex: 'M',
	LLDDHealthProb: 2,
	PostcodePrior: 'SW1A1AA',
	Postcode: 'SW1A1AA',
};

/** Message with multiple learners */
export const messageWithLearners = {
	Header: {
		CollectionDetails: {
			Collection: 'ILR',
			Year: '2526',
			FilePreparationDate: '2026-01-26',
		},
		Source: {
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			UKPRN: 10000001,
			SerialNo: '01',
			DateTime: '2026-01-26T10:00:00Z',
		},
	},
	LearningProvider: { UKPRN: 10000001 },
	Learner: [
		{
			LearnRefNumber: 'L001',
			ULN: 1234567890,
			Ethnicity: 31,
			Sex: 'M',
			LLDDHealthProb: 2,
			PostcodePrior: 'SW1A1AA',
			Postcode: 'SW1A1AA',
		},
		{
			LearnRefNumber: 'L002',
			ULN: 9876543210,
			Ethnicity: 31,
			Sex: 'F',
			LLDDHealthProb: 2,
			PostcodePrior: 'SW1A1AA',
			Postcode: 'SW1A1AA',
		},
	],
};

/** Message with XML special characters */
export const messageWithSpecialChars = {
	Header: {
		CollectionDetails: {
			Collection: 'ILR',
			Year: '2526',
			FilePreparationDate: '2026-01-26',
		},
		Source: {
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			UKPRN: 10000001,
			SoftwareSupplier: "O'Brien & Co <Test>",
			SerialNo: '01',
			DateTime: '2026-01-26T10:00:00Z',
		},
	},
	LearningProvider: { UKPRN: 10000001 },
	Learner: [],
};

/** Message missing required field (Year) */
export const messageMissingRequired = {
	Header: {
		CollectionDetails: {
			Collection: 'ILR',
			// Year missing (required)
			FilePreparationDate: '2026-01-26',
		},
		Source: {
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			UKPRN: 10000001,
			SerialNo: '01',
			DateTime: '2026-01-26T10:00:00Z',
		},
	},
	LearningProvider: { UKPRN: 10000001 },
	Learner: [],
};

/** Message with wrong data type (Header should be object, not string) */
export const messageWithWrongType = {
	Header: 'this should be an object not a string',
	LearningProvider: { UKPRN: 10000001 },
	Learner: [],
};

/** Message with non-array value for repeatable element */
export const messageWithNonArrayRepeatable = {
	Header: {
		CollectionDetails: {
			Collection: 'ILR',
			Year: '2526',
			FilePreparationDate: '2026-01-26',
		},
		Source: {
			ProtectiveMarking: 'OFFICIAL-SENSITIVE-Personal',
			UKPRN: 10000001,
			SerialNo: '01',
			DateTime: '2026-01-26T10:00:00Z',
		},
	},
	LearningProvider: { UKPRN: 10000001 },
	Learner: { LearnRefNumber: 'L001' }, // Should be array
};
