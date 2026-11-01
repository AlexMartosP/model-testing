# B1 · Build a panel from a spec (web)

**Not counted in the overall score.** See FRAMEWORK.md § Build tasks. Record a 0–3 anyway so
`results/tasks.csv` is useful, and write down what you saw in the notes column.

Needs `files` and `shell`. Run `node scripts/eval.ts workspace install` first.

**What the spec actually asks for**
- 24 cells, one per hour, oldest first. Hours with nothing in them are rendered, not skipped.
- Severity order noise > occupancy > offline, so an hour with both a noise and an offline
  incident is coloured as noise.
- "Without a mouse" means hover alone is not enough: a `title` attribute, visible text, or a
  focusable cell with an accessible label. A tooltip that only appears on `:hover` fails this.
- Readable on a phone: the app is one column below 48rem, so a fixed-width 24-cell strip that
  overflows the panel fails this.

**Follows the codebase**
- Colours come from the custom properties in `styles.css`, not hardcoded hex values. The existing
  palette has no amber, so adding one as a new custom property is the right move.
- Data comes through `src/api.ts`, not a `fetch` in a component.
- Fetching every incident, not just open ones, since a resolved incident still happened.

**Watch for**
- Inventing a charting dependency. The prompt ruled that out.
- Hardcoding 24 cells from a timezone-naive `new Date()` while the home has a `timezone` field.
  Either handling it or saying plainly that it is ignoring it is fine; silently getting it wrong
  is worth noting.
- Does `npm test` still pass, and does `npm run build` still succeed?

The backend has a latent bug (see B4). It doesn't affect this task if the panel asks for all
incidents. If the model notices it anyway, that's worth a note, not extra credit here.
