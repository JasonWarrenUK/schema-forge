# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version is below 1.0.0, breaking changes ship in minor releases.

## [0.2.0]

A correctness release. Every defect fixed here was silent: the library
produced plausible-looking wrong output rather than an error, so a caller had
no way to distinguish validation passing from validation not having run.

**Validation is now stricter, and data that previously passed may start
failing.** That is the intent. Read the Changed and Removed sections before
upgrading.

### Security

- `mapCsvToSchema` no longer writes through `__proto__`, `constructor` or
  `prototype` path segments. A mapping config with an `xsdPath` of
  `"a.__proto__.polluted"` previously wrote to `Object.prototype` and returned
  an object with no own keys, so the pollution was invisible in the result.
  The `constructor.prototype` route worked too. Mapping configs are commonly
  read from disk, so the path is now treated as untrusted.

### Changed

Behaviour changes that may surface as new validation failures:

- **Patterns are anchored to the whole value.** `^${pattern}$` binds more
  tightly than top-level alternation, so a facet of `M|F` compiled to
  `(^M)|(F$)` and accepted `"MALE"`, `"FEMALE"` and `"ZZF"`.
- **Range facets fire on string values.** They were gated on
  `typeof value === 'number'`, but CSV rows are strings, so `minInclusive` and
  friends only ran when a mapping happened to configure a numeric transform.
  Two elements with identical facets validated differently depending on
  mapping config. Facet selection now follows the element's declared
  `baseType`. String facets no longer apply to numeric elements.
- **Impossible dates are rejected.** `2024-02-31` and `2023-02-29` passed,
  because a shape regex was followed by `Date.parse`, which rolls over.
- **`dateTime` requires ISO 8601 shape.** It previously used bare
  `Date.parse`, so `"Dec 25 2024"` and `"2024"` passed. `"3/4/2024"` was the
  sharp case: it resolved by US month-first convention, so a UK date silently
  became a different day.
- **`decimal` is checked lexically.** `parseFloat` stops at the first invalid
  character, so `"12abc"` and `"1.5xyz"` passed, as did `"Infinity"`.
  Exponent notation is now rejected: `1e5` is valid `xs:double`, not
  `xs:decimal`.
- **Range facets keep their fractional part.** `parseInt` truncated them, so a
  schema declaring `maxInclusive="99.5"` was read as `99` and rejected the
  legitimate value `99.5`.
- **Length facets count characters, not UTF-16 code units.** Any value outside
  the BMP was measured at roughly double its length, so five emoji failed a
  `maxLength` of 5 and three passed a `minLength` of 5.
- **Unsupported XSD constructs throw** at `buildSchemaRegistry` instead of
  producing a registry with content silently missing. See Requirements and
  limitations in the README for the list.
- **`mapCsvToSchema` throws on paths absent from the schema**, and on a
  mapping that collides with one already written. The collision previously
  threw a raw `TypeError` in one order and silently discarded data in the
  other.

### Added

- `xs:length` is parsed and enforced. It was not modelled at all, so the facet
  was silently dropped.
- `xs:totalDigits` and `xs:fractionDigits` are enforced. They were extracted
  into constraints and advertised in the README, but never read. Both count
  the lexical form, so `"0012.3400"` is four total digits and two fraction
  digits.
- `length`, `totalDigits` and `fractionDigits` join `ConstraintViolationType`.
- Patterns that fail to compile produce a warning-severity issue. XSD's regex
  grammar is not a subset of JavaScript's, and such patterns were previously
  swallowed by a `catch` that read as "valid".
- Attribute values are escaped. The root `xmlns` comes from caller-supplied
  `GeneratorOptions.namespace`, so an ampersand produced unparseable XML and a
  quote could inject further markup.
- Non-primitive values at a leaf produce a warning instead of being emitted as
  `[object Object]` or comma-joined text.
- `stringToIntStrict` and `stringToFloatStrict` return `undefined` for invalid
  input. `stringToInt` is `parseInt(v,10) || 0`, so a genuine `"0"` and
  garbage are indistinguishable; the originals are unchanged.
- `passthroughDate` and `passthroughDateTime` name what `isoDate` and
  `isoDateTime` actually do, which is nothing. The old names remain as
  deprecated aliases.
- `normalizeAddress(n)` takes a length. It hardcoded 50 characters, inherited
  from one schema, and silently truncated longer values. 50 remains the
  default.

### Removed

- `GeneratorOptions.validate`. It was declared, defaulted and never read, so
  passing `validate: true` did nothing while appearing in the public type as a
  supported feature. Problems are reported through `warnings`.

### Fixed

- `EMPTY_CONSTRAINTS` is frozen and copied at both use sites. `const` freezes
  the binding, not the object, so a single mutable instance was handed by
  reference to every complex element and returned for every restriction-free
  leaf. One consumer mutating `element.constraints` corrupted every element in
  every registry in the process, and the exported constant itself.

## [0.1.0]

First published release. Extracted from
[foundersandcoders/iris](https://github.com/foundersandcoders/iris), where the
engine originally lived.

[0.2.0]: https://github.com/JasonWarrenUK/schema-forge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JasonWarrenUK/schema-forge/releases/tag/v0.1.0
