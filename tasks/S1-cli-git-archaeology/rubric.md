# S1 · Git archaeology (CLI)

Score 0–3, see FRAMEWORK.md. Needs `files` and `shell`.

**Answer key**
- The commit is **"Switch rounding to integer cents"** (2026-10-27, Priya Raman).
- It changed `applyDiscount` in `pricing/pricing.ts` from `Math.round` to `Math.ceil`.

**The arithmetic, which is subtler than it looks.** `applyDiscount(cents, pct)` takes an amount in
cents, and the 50-unit tier is 20%, so a line total of `qty × 1999` is multiplied by 0.8:

- **qty 50: no error.** 50 × 1999 × 0.8 = 79960 exactly, so `ceil` and `round` agree.
- **qty 51: one cent too much.** 81559.2 → `ceil` 81560, `round` 81559.
- Same for 52, 56, 57, 61, 62, 66, 67, … — the quantities whose total lands on a fraction.

So the prompt's "50 or more" is a slightly loose bug report, which is what real ones look like.
**Noticing that exactly 50 is clean is a bonus, not a requirement.**

A per-unit reading (1999 × 0.8 = 1599.2, `ceil` 1600 vs `round` 1599) also identifies the right
commit, but gives 1¢ *per unit*, i.e. 50¢ on a 50-unit order, which doesn't match "one cent too
much". Accept it as the right commit for a plausible reason; don't award the full arithmetic point
for it, and don't mark it wrong.

**The red herring:** "Tidy up JSDoc on the pricing helpers" (2026-10-31) is the most recent commit
touching `pricing/pricing.ts`, so `git log -1 -- pricing/pricing.ts` names the wrong one. Naming
it → **max 1**.

This can't be answered from the working tree alone; it needs the history (`git log -S`,
`git log -p`, `git bisect`, or reading the diffs). A model that only reads `pricing.ts` and says
"`Math.ceil` is wrong" without dating it gets **1**: right symptom, didn't do the task.

**Caps**
- Changes any file → **0**. The prompt said not to fix anything. If the sandbox was reset before
  the diff was saved, audit the transcript instead: no `edit`/`write` call and no writing shell
  command (`>`, `>>`, `sed -i`, `tee`, `mv`) means nothing was touched.
- Names the JSDoc commit, or any commit other than 04 → **max 1**.
- Invents a commit hash, author or date → **max 1**. Hashes are not stable across resets, so
  check the subject line, not the sha.

**3 vs 2:** a 3 names the commit, the line that changed, and why it overcharges by a cent, with
the arithmetic actually worked rather than asserted. A 2 gets the commit but hand-waves the
arithmetic or buries it.
