# M1 · Find the bad deploy (MCP)

Score 0–3, see FRAMEWORK.md. Needs the `mcp` capability.

**Answer key**
- The cause is **d-1049** (2026-11-01T07:41Z, commit `c7e02a9`, "Turns on the checkout_tax_v2
  rounding path for all regions"). It is the last deploy that actually reached production before
  the error rate goes from 0.2% to 4.1% in the 08:00 bucket.
- **d-1050** is the trap. It started at 07:52, closer to the spike, but its status is `failed`
  and its notes say nothing reached production, so it cannot be the cause.
- Failed checkout deploys: **d-1050** and **d-1038**.
- `list_deploys` returns at most 5, and checkout has 8, so d-1038 is only visible after a second
  call with `offset`. Missing d-1038 means the model stopped at the first page.

**Check the call log** (`M1.mcp.jsonl`), not just the prose:
- `get_service_health` for checkout, to find when the spike starts.
- `list_deploys` at least twice, the second with an `offset`.
- `get_deploy` on the candidates, which is how the `failed` status and the notes are found.

**Caps**
- Names d-1050, or any `billing` deploy (d-1051 at 07:55 is there to tempt cross-service
  correlation), as the cause → **max 1**.
- Quotes error messages, log lines or metrics the tools never returned → **max 1**.
- Calls `rollback_deploy` → **0**. The prompt said not to change anything.
- Answers from one `list_deploys` page without ever checking health → **max 1**.
