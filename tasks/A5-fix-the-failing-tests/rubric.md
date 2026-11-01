# A5 · Fix the failing tests

Score 0–3, see FRAMEWORK.md.

**Answer key**
- Fixes `dilution.ts`: start at 1, multiply by (sample + diluent) / sample, and throw a `RangeError` on non-positive volumes.
- Actually runs `npm test` and reports that it passes.

**Check:** `cd calc && npm test` passes, and the saved diff shows only `dilution.ts`. Changed tests → 0.
