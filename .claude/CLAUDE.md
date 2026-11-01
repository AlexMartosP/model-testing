# model-testing

Personal eval framework. See `README.md` for the workflow and `FRAMEWORK.md` for the rules.

## Quality Gate Commands

- **Typecheck:** `npm run typecheck` (needs `npm install` once; typescript and @types/node are devDependencies only)
- **Build:** not applicable (no build step, Node runs the TypeScript directly)
- **Test:** `npm run smoke` (there is no unit test suite; this exercises the MCP server handshake, the harness registry and the summarizer)
- **Lint:** not applicable (no linter configured)

## Things that are easy to get wrong here

- `fixtures/calc` and `fixtures/report` have **deliberately failing tests**. They are the answer
  key for tasks A5 and S3. Never "fix" them.
- `fixtures/be` has a **deliberately planted bug** (`src/routes/incidents.ts` reads the query
  parameter as `state` while everything else calls it `status`). It is the subject of task B4.
  Never fix it, and keep the six existing tests passing with it in place.
- `fixtures/history/` is replayed into real git commits by `workspace reset`. The commit
  `04-integer-cents` introduces the bug task S1 asks about, and `06-jsdoc` exists to be a red
  herring. Don't reorder or collapse the layers.
- `mcp/deploys.json` is shaped so that correlating on timestamp alone gives the wrong answer
  (`d-1050` failed and never shipped). Don't "tidy" the data.
- Task rubrics must never end up anywhere a model under test can read. That is why the workspace
  and the MCP server are installed outside this repo.
