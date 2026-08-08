/** Builder path fixtures
 *
 * XSD paths that a caller's builder functions might implicitly output, used
 * to exercise validateSchemaCompatibility's additionalPaths handling.
 *
 * These values are copied from Iris, the schema-forge engine's original home,
 * because they exercise realistic deep paths against the vendored schema. The
 * engine itself has no knowledge of them.
 */

export const FAM_PATHS = [
	'Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMType',
	'Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMCode',
	'Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMDateFrom',
	'Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMDateTo',
] as const;
