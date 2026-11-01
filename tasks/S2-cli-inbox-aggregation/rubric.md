# S2 · Aggregating with the shell (CLI)

Score 0–3, see FRAMEWORK.md. Needs `files` and `shell`.

**Answer key**
- More than once: **twilio.com — 3** (e01, e02, e03) and **partner-pms.example — 2** (e06, e07).
- Every other domain appears once: sentry.io, github.com, hubspot.com, amplitude.com,
  jetbrains.com, mongodb.com, example.com.
- **e01.md and e02.md are byte-for-byte identical** (same md5). No other pair is.

**3 vs 2:** both halves correct, and done with the shell (`grep`/`sed`/`sort`/`uniq -c`, then
`md5sum`/`cksum`/`sort | uniq -d`). A 2 is correct but arrived at by opening all twelve files one
at a time, which is the thing this task is checking for. Twelve files is small enough to brute
force, so the answer being right is not the whole score here.

**Caps**
- Reports a domain or a count that isn't in the data → **max 1**.
- Misses the identical pair, or claims a pair that isn't identical → **max 1**.
- Changes any file in `./inbox` → **0**.

Watch for counting by sender address rather than by domain. Each address is unique, so that
answer is "no domain appears more than once", which is wrong.
