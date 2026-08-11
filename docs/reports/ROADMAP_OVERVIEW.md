# schema-forge PHASE_1: Roadmap Overview

**34 tasks across 6 milestones.** Files: `.claude/roadmaps.json` (machine-readable), `docs/roadmaps/PHASE_1.md` (full task list with Mermaid dependency diagram).

> Follows the extraction work that made schema-forge a standalone package (0.1.0) and the correctness release that fixed the defects it was extracted with (0.2.0). Nothing here is a regression from those releases; it is the work they deliberately deferred.

---

## What we're building

schema-forge parses one XSD dialect: `xs:` prefixed, single root, inline `xs:complexType` containing a direct `xs:sequence`. Everything outside that shape used to produce a registry with content silently missing, which is how a library can validate data against a schema it only half-read and report no problems. The 0.2.0 release converted those cases into errors that name the construct and the element path. That was the right immediate fix, and it is not a destination: throwing on `xs:choice` is honest but still means the library cannot read a large share of real schemas.

This phase makes them work. Four milestones cover the construct families, ordered by what they share rather than by how visible each one is. One milestone closes the coverage and hygiene gaps that accumulated during extraction. The last commits to a stable API and ships 1.0.0.

The deliberate omission is a build step. schema-forge exports raw TypeScript, so it is usable from Bun, Vite and SvelteKit but not from plain Node or a `tsc`-compiled project. Adding `dist/` remains possible later without breaking anything, and is out of scope here.

## Milestone sequence and the reasoning behind it

**M1, Particle model.** `buildElement` reads `xs:complexType.xs:sequence` and nothing else, so every other compositor loses its children. Rather than special-casing each one, this milestone extracts a generic particle walker. The refactor is the expensive part; `xs:choice`, `xs:all` and `xs:group` then fall out cheaply, and M2 inherits the same widened type model.

**M2, Named type resolution.** The highest-value milestone. `<xs:element name="Root" type="RootType"/>` beside a top-level `<xs:complexType name="RootType">` is ordinary XSD, and it currently collapses the whole subtree to a string leaf. Notably `extractNamedComplexTypes` already exists, is tested, and is exported from the public barrel, but has no production call site: the work was started and never wired in. Inheritance and `ref=` join it because they share the resolution machinery.

**M3, Attributes.** Independent of the particle work, since attributes hang off `complexType` rather than the content model, so it can run in parallel. The parser already receives attribute nodes; `buildElement` discards them. This milestone carries them through the registry, the generator, the validator and the mapper.

**M4, Multi-document schemas.** The only milestone that changes the public API, which is why it is separated. `buildSchemaRegistry` is synchronous and takes a string, so resolving `xs:include` needs a way to fetch other documents.

**M5, Coverage and hygiene.** Independent of everything else and pickable at any point. `validateRows` ships with no tests because its original tests were too coupled to the domain the engine came from. `noUncheckedIndexedAccess` was deferred at 0.1.0 on the assumption it would surface dozens of errors; measured for this roadmap, it is 40, each a genuine spot where an out-of-bounds index yields `undefined` at runtime.

**M6, 1.0.** Gated on the four construct milestones, because the supported-XSD surface has to settle before freezing an API around it.

## Decisions that shaped the structure

**Ordered by shared refactor, not by user impact.** Named complex types are the most likely construct to bite a new user, so an impact-first ordering would start there. But it needs the same widened type model as the compositors, so doing M1 first means the expensive refactor happens once. The alternative repeats it or works around it.

**The resolver is synchronous and injected.** `buildSchemaRegistry(xsd, { resolve })` keeps the function synchronous, so no existing call site breaks and the package stays runtime-agnostic: the caller decides whether a `schemaLocation` means the filesystem, a bundled map or a pre-populated cache. Adding an async variant later is additive; converting an async API back to synchronous is not. The cost is that a caller whose only source is asynchronous must pre-populate a map first, which is the minority case for XSD.

**Each construct milestone ends by deleting its own guards.** The 0.2.0 throwing tests are the specification: `tests/lib/schema/unsupportedConstructs.test.ts` asserts each construct fails. As support lands, each moves from a throwing test to a building-and-generating one, so the guards cannot outlive the limitation they describe.

**1.0 means the XSD surface is settled, not that every feature exists.** The criteria are full construct coverage, complete test coverage of the public API, and an API review including removing the `isoDate` aliases deprecated in 0.2.0. A major version is the moment to drop them.

## External blockers (flag early)

None. No task depends on a third party, an unconfirmed decision or another team, so the phase has no external gates.

Two open design questions sit inside tasks rather than blocking them. **3AT.6** needs a convention for addressing an attribute in a mapping path; an `@` prefix (`Root.Child.@id`) is the XPath-flavoured option and reads unambiguously against element paths. **1PM.4** needs a decision on whether `xs:all` relaxes the generator's schema-order emission or keeps declaration order. Both are recorded as notes and are decidable when the task is picked up.
