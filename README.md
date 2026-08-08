# schema-forge

An XSD-driven schema system for dynamic validation, XML generation and CSV-to-schema mapping.

Parse XSD files into queryable registries, then use those registries to validate data, map CSV rows to nested schema objects and generate valid XML.

## Requirements

schema-forge ships raw TypeScript with no build step. It requires a runtime or bundler that consumes `.ts` directly: **Bun**, Vite or SvelteKit. It will not work under plain Node or `tsc`-compiled projects.

## Installation

```sh
bun add @jasonwarrenuk/schema-forge
```

## Usage

Everything is exported from the package root. Deep imports into `src/` are not a supported interface.

### Build a registry from an XSD

```ts
import { buildSchemaRegistry } from "@jasonwarrenuk/schema-forge";

const xsdContent = await Bun.file("schema.xsd").text();
const registry = buildSchemaRegistry(xsdContent);

registry.elementsByPath.get("Message.Learner.ULN");
// → SchemaElement { name: 'ULN', baseType: 'string', constraints: { ... } }
```

`buildSchemaRegistry` is synchronous. It throws if the XSD has no root element, or more than one.

### Validate a value against an element

```ts
import { validateValue } from "@jasonwarrenuk/schema-forge";

const element = registry.elementsByPath.get("Message.Learner.ULN");
const issues = validateValue("1234567890", element, { rowIndex: 0, sourceField: "ULN" });
// → [] when valid, otherwise SchemaValidationIssue[]
```

### Validate CSV rows

```ts
import { parseCSVContent, validateRows } from "@jasonwarrenuk/schema-forge";

const { headers, rows } = parseCSVContent(csvString);

// Note: validateRows takes a MappingConfig, not a bare array
const result = validateRows(rows, headers, registry, { mappings });
```

### Map CSV rows to nested objects

```ts
import { mapCsvToSchema } from "@jasonwarrenuk/schema-forge";

const mappings = [
	{ csvColumn: "Student ID", xsdPath: "Message.Learner.LearnRefNumber" },
	{ csvColumn: "Postcode", xsdPath: "Message.Learner.Postcode", transform: "postcode" },
];

const nested = mapCsvToSchema(csvRow, mappings, registry);
// → { Message: { Learner: { LearnRefNumber: "ABC123", Postcode: "E1 6AN" } } }
```

Column matching is case-insensitive. `mapCsvToSchema` takes the mappings array directly, unlike `validateRows`.

### Generate XML

```ts
import { generateFromSchema } from "@jasonwarrenuk/schema-forge";

const { xml, warnings } = generateFromSchema(data, registry);
```

Generation always produces output. Missing required elements and type mismatches are reported as `warnings`, not thrown.

## Supported XSD features

| Feature | Details |
|---|---|
| Base types | `string`, `int`, `integer`, `long`, `decimal`, `date`, `dateTime`, `boolean` |
| Constraints | `pattern`, `minLength`, `maxLength`, `minInclusive`, `maxInclusive`, `minExclusive`, `maxExclusive`, `enumeration` |
| Complex types | `xs:sequence` with nested elements |
| Cardinality | `minOccurs`, `maxOccurs` (including `unbounded`) |
| Named types | Simple type reuse and inheritance |
| Namespaces | `targetNamespace` extraction and preservation |

### Requirements and limitations

The parser expects a specific XSD shape and throws when it is not met:

- Elements must use the literal `xs:` prefix throughout
- Exactly one top-level element
- A `targetNamespace` must be present

The following are **not** supported, and are currently dropped silently rather than raising an error:

- `xs:choice`, `xs:all`, `xs:any`
- `xs:complexContent` / `xs:extension`, `xs:simpleContent`
- `xs:attribute`
- `xs:include`, `xs:import` (single-document schemas only)
- Named `xs:complexType` references (inline `xs:complexType` only)

`totalDigits` and `fractionDigits` are parsed into constraints but not yet enforced. Only the first `xs:pattern` on a restriction is honoured.

## Built-in transforms

17 named transforms, plus parameterised `constant(value)`.

**Type conversions:** `stringToInt`, `stringToIntOptional`, `stringToFloat`, `stringToBoolean`, `boolToInt`

**String:** `trim`, `uppercase`, `lowercase`, `uppercaseTrim`, `uppercaseNoSpaces`, `postcode`, `removeSpaces`, `digitsOnly`, `normalizeAddress`

**Date/time:** `isoDate`, `isoDateTime` (currently pass-through, no format conversion)

**Conditional:** `nullIfEmpty`

Some transforms carry assumptions inherited from their original use: `normalizeAddress` truncates to 50 characters, and `digitsOnly` strips a leading `+`.

## Provenance

schema-forge was extracted from [foundersandcoders/iris](https://github.com/foundersandcoders/iris), an ILR toolkit, where the engine originally lived. This repository is now the canonical home; iris consumes it as a dependency.

## Dependencies

- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) — XSD/XML parsing
- [papaparse](https://www.papaparse.com/) — CSV parsing

## Licence

MIT
