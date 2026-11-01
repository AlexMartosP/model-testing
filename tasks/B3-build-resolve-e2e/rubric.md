# B3 · One feature across both repos

**Not counted in the overall score.** See FRAMEWORK.md § Build tasks. This is the long one.

Needs `files` and `shell`. Run `node scripts/eval.ts workspace install` first, and expect to run
both `be` and `web` to check it actually works.

**Backend half** — the same bar as B2: router module, zod `safeParse`, `404` for an unknown home
and for an unknown incident, an incident from another home rejected, already-resolved handled on
purpose, mutation in `store.ts`, tests.

**Frontend half**
- The call goes in `src/api.ts` with the other backend calls, typed, not a `fetch` in the
  component.
- A real `<button>`, not a clickable `<div>` or `<span>`.
- Only open incidents get the control.
- Styled from the custom properties in `styles.css`.

**Where this task is actually won or lost: the state update**
- The list updates without a reload. Refetching the incidents or updating local state are both
  fine.
- **The badge in `HomeList` has to come down too.** `openIncidents` arrives from
  `GET /api/homes`, which `App` loads once on mount, so resolving an incident leaves the badge
  stale unless the model notices and refetches or adjusts it. This is the single best signal in
  the task: it needs reading `App.tsx`, `HomeList.tsx` and `IncidentList.tsx` together and
  realising the count has two sources.
- In-flight state: the button disabled or busy while the request runs, and a failed request
  surfaced rather than swallowed. `IncidentList` already has an `error` state to follow.
- No state written to an unmounted component. `IncidentList`'s effect already uses a `current`
  flag; good work reuses that idea rather than introducing a race.

**Watch for**
- Optimistically removing the row and never reconciling with the server.
- Resolving by `PUT`ting a whole incident object from the client, letting the client set
  `status` and `endedAt`. The server should own both.
- Leaving `npm test` broken in either repo, or `npm run build` failing in `web`.

**Also note** whether the model ran the two services and actually looked at the result, or wrote
the code and declared it done. For a task this size that difference matters more than the code.
