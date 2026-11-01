# B2 · Build an endpoint (backend)

**Not counted in the overall score.** See FRAMEWORK.md § Build tasks.

Needs `files` and `shell`. Run `node scripts/eval.ts workspace install` first.

**What good looks like**
- A route on the incidents router, mounted through `src/app.ts`, not a handler bolted onto
  `app.ts` directly. `POST /api/homes/:homeId/incidents/:incidentId/resolve` is the obvious
  shape, but any sensible path is fine as long as it is RESTful and consistent.
- Params validated with zod and `safeParse`, returning `400` with `{ error: "invalid_params" }`
  and the issues, like `src/routes/homes.ts` does.
- `404 home_not_found` for an unknown home, and a distinct `404` for an unknown incident.
- The incident belonging to a *different* home is a 404, not a successful resolve. This is the
  edge case most likely to be missed.
- Already-resolved is handled deliberately: a `409`, or idempotent and documented as such. Either
  is defensible; silently re-resolving and overwriting `endedAt` is not.
- The mutation lives in `src/store.ts` with the rest of the data access, not inline in the route.
- Tests in `tests/`, following the `withServer` pattern: the happy path, unknown home, unknown
  incident, and the already-resolved case.
- `README.md`'s endpoint table updated.

**Watch for**
- Breaking the existing six tests. Run `npm test`.
- Reaching for `express.json()` body validation when the route needs none.
- Using `new Date()` without ISO formatting, so `endedAt` no longer matches the shape of every
  other timestamp in `data/homes.json`.
