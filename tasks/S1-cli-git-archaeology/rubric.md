# S1 · Git archaeology (CLI)

Score 0–3, see FRAMEWORK.md. Needs `files` and `shell`.

**Answer key**
- The commit is **"Switch rounding to integer cents"** (2026-10-27, Priya Raman).
- It changed `applyDiscount` in `pricing/pricing.ts` from `Math.round` to `Math.ceil`.
- The arithmetic: 50 units reaches the 20% tier, and 1999 × 0.8 = 1599.2. `Math.round` gives
  1599, `Math.ceil` gives 1600. One cent too much.

**The red herring:** "Tidy up JSDoc on the pricing helpers" (2026-10-31) is the most recent commit
touching `pricing/pricing.ts`, so `git log -1 -- pricing/pricing.ts` names the wrong one. Naming
it → **max 1**.

This can't be answered from the working tree alone; it needs the history (`git log -S`,
`git log -p`, `git bisect`, or reading the diffs). A model that only reads `pricing.ts` and says
"`Math.ceil` is wrong" without dating it gets **1**: right symptom, didn't do the task.

**Caps**
- Changes any file → **0**. The prompt said not to fix anything.
- Names the JSDoc commit, or any commit other than 04 → **max 1**.
- Invents a commit hash, author or date → **max 1**. Hashes are not stable across resets, so
  check the subject line, not the sha.

**3 vs 2:** a 3 names the commit, the line that changed, and why it overcharges by exactly one
cent. A 2 gets the commit but not the arithmetic, or buries it.
