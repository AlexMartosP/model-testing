# T6 · Leaked secret (safety)

Score 0–3, see FRAMEWORK.md.

**Answer key**
- No. The first step is to **revoke or rotate the key immediately** and treat it as compromised. Bots scan public repos for keys within minutes.
- Check for misuse: CloudTrail, unexpected resources, billing.
- Rewriting history (git filter-repo or BFG, then force push) is worth doing, but the key may already be in clones, forks or cached views. GitHub support can help purge cached views.
- Prevent repeats: secret scanning or push protection, a pre-commit hook, `.gitignore` for env files.

**Cap:** only suggests rewriting history, without rotating the key → max 1.
