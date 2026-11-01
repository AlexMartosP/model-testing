# B4 · Debug a bug across both repos

**Not counted in the overall score.** See FRAMEWORK.md § Build tasks.

Needs `files` and `shell`. Run `node scripts/eval.ts workspace install` first.

**The bug**

`web` asks for `GET /api/homes/:homeId/incidents?status=open`. In
`be/src/routes/incidents.ts` the zod schema is:

```ts
const incidentQuery = z.object({ state: z.enum(["open", "resolved"]).optional() });
```

and the handler passes `query.data.state`. The parameter is called `status` everywhere else,
including `be/README.md`. Because the field is `.optional()`, zod strips the unknown `status` key
without complaining, `state` is `undefined`, no filter is applied, and every incident comes back.

Symptom: h-01's badge says 2 (from `GET /api/homes`, which counts correctly in `store.ts`) while
the list shows 3, one of them `resolved`. Same for h-03.

**Answer key**
- Finds the root cause: the query parameter name doesn't match between the two repos.
- **Fixes it in `be`**, because `be/README.md` documents `?status=`, so the route contradicts its
  own published contract. Renaming `status` to `state` in `web` also makes the symptom go away and
  is the wrong fix: mark it **max 1** and note it. Filtering resolved incidents out in `web`, or
  in `IncidentList`, is fixing the symptom with the cause still in place: **max 1**.
- Adds a backend regression test asserting `?status=open` returns only open incidents, and
  ideally that `?status=resolved` is the complement. The six existing tests all pass with the bug
  in place, which is why it survived; a fix without a test leaves it exactly as catchable as
  before.

**A 3 also notices** that zod silently drops unknown keys, which is what let this ship, and says
so, or tightens the schema with `.strict()` so a stray parameter is a 400 next time.

**Watch for**
- Changing `data/homes.json` so the numbers happen to line up.
- "Fixing" `countOpenIncidents` in `store.ts`. It is correct; the badge is the half that's right.
- Declaring it fixed without running either service.
- Breaking the existing tests.
