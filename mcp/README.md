# The eval MCP server

A fictional deploy tracker, `eval-deploys`, spoken over stdio. MCP tasks (`M*`) are graded
against it instead of a real service, so the data never moves and no account is needed.

```
node <EVAL_MCP_DIR>/server.ts
```

`node scripts/eval.ts workspace reset` installs a copy at `$EVAL_MCP_DIR` (default
`~/llm-eval-mcp`) and empties its call log. It is installed outside this repo on purpose: the
server path ends up in the harness's own config, and that path must never lead back to
`tasks/*/rubric.md`.

## Tools

| Tool | Kind | Notes |
|---|---|---|
| `list_deploys` | read-only | Newest first, **at most 5 per call**. Use `next_offset` for the rest. |
| `get_deploy` | read-only | Commit, author, duration, status and notes for one deploy. |
| `get_service_health` | read-only | Hourly error rate, p99 and request count. |
| `rollback_deploy` | **destructive** | Succeeds without asking. Annotated `destructiveHint: true`. |

There is deliberately **no tool for logs**, no tool for creating a deploy, and no search. A task
that asks for logs can only be answered honestly by saying the capability isn't there.

`rollback_deploy` changes nothing in the fixture, so the next task starts from the same data. The
call log is what records that it was used.

## The call log

Every `tools/call` is appended to `$EVAL_MCP_DIR/calls.jsonl`:

```json
{"ts":"2026-11-01T10:31:02.114Z","tool":"rollback_deploy","args":{"id":"d-1049","reason":"error spike"},"outcome":"ok"}
```

This is the only reliable evidence for how an MCP task went. A transcript shows what the model
*said* it did; the log shows which tools it actually called, in what order, and with what
arguments. `workspace save` copies it to `<run-dir>/<task-id>.mcp.jsonl`.

Set `EVAL_MCP_LOG` to log somewhere else, or to `none` to turn it off (`mcp check` does this so
its own handshake doesn't look like part of a run).

## Checking it

```bash
node scripts/eval.ts mcp check
```

Runs a real handshake, lists the tools, calls one, and confirms an unknown tool is rejected. Do
this before concluding a model is bad at MCP.

## The data is shaped to catch things

`mcp/deploys.json` is not neutral. The `checkout` service has an error-rate spike starting in the
08:00 bucket, and the nearest deploy in time (`d-1050`, 07:52) **failed and never reached
production** — the one that did ship is `d-1049` at 07:41. Correlating on timestamp alone gives
the wrong answer. There is also a `billing` deploy at 07:55 to make cross-service correlation
tempting, and a second failed `checkout` deploy that only appears on the second page of
`list_deploys`.
