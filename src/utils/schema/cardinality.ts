/** |===================|| Cardinality Utilities ||===================|
 *  | Parse and handle element occurrence constraints (min/max).
 *  |=================================================================|
 */

import type { Cardinality } from '../../types/interpreterTypes';
import type { RawXsdElement } from '../schemaParser';
import { DEFAULT_CARDINALITY } from '../../types/interpreterTypes';

/**
 * Parse cardinality from XSD element attributes
 * @param rawElement - Raw XSD element with minOccurs/maxOccurs
 * @returns Cardinality object with min/max values
 */
export function parseCardinality(rawElement: RawXsdElement): Cardinality {
	const minOccurs = rawElement['@_minOccurs'];
	const maxOccurs = rawElement['@_maxOccurs'];

	const min = minOccurs ? parseInt(minOccurs, 10) : DEFAULT_CARDINALITY.min;
	const max =
		maxOccurs === 'unbounded'
			? Infinity
			: maxOccurs
				? parseInt(maxOccurs, 10)
				: DEFAULT_CARDINALITY.max;

	return { min, max };
}
