# web

The property monitoring dashboard. React 19 and Vite, TypeScript.

```bash
npm ci
npm run dev      # http://localhost:5173
npm test
npm run build
```

It expects `be` to be running on `http://localhost:3001`. Override with `VITE_API_URL`.

## Layout

```
src/
  api.ts                  every call to the backend, and the types that come back
  format.ts               pure display helpers (unit tested in tests/)
  App.tsx                 loads the homes, owns which one is selected
  components/
    HomeList.tsx          the left panel, with an open-incident badge per home
    IncidentList.tsx      the right panel, the selected home's incidents
  styles.css              one stylesheet, CSS custom properties at the top
```

## Conventions

- Colours, spacing and radii come from the custom properties in `styles.css`. Don't hardcode hex
  values in components.
- `api.ts` is the only module that knows the backend exists.
- The layout is two columns above 48rem and one column below. Keep new panels working at both.
