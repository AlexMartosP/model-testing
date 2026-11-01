# be

The property monitoring API. Express 5 on Node, TypeScript run directly (no build step).

```bash
npm ci
npm start      # http://localhost:3001
npm test
```

Data lives in `data/homes.json` and is loaded into memory at startup (`src/store.ts`). Writes are
in memory only and are lost on restart.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | `{ ok: true }` |
| `GET` | `/api/homes` | Every home, each with `openIncidents` |
| `GET` | `/api/homes/:homeId` | One home, `404 home_not_found` if unknown |
| `GET` | `/api/homes/:homeId/incidents` | A home's incidents, newest first |

`GET /api/homes/:homeId/incidents` takes one optional query parameter:

- `status=open` — only incidents that are still open
- `status=resolved` — only incidents that have ended
- omitted — every incident for that home

## Conventions

- Validate request input with zod and `safeParse`, then return `400` with the issues. See
  `src/routes/homes.ts`.
- Errors are `{ error: "snake_case_code", ...context }`.
- Route modules export a `Router` and are mounted in `src/app.ts`.
- Tests start the app on port 0 and talk to it over HTTP. See `tests/homes.test.ts`.
