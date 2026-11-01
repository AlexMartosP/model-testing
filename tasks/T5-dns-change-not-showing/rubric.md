# T5 · DNS change not showing

Score 0–3, see FRAMEWORK.md.

**Answer key**
- Resolvers cache the old record until its **TTL** expires. You can't flush other people's caches.
- What helps now: keep the old server running (or redirect/proxy to the new one) until the old TTL has passed; flush your own local DNS cache to test.
- Next time: lower the TTL well before a migration (a day or more ahead), then raise it again afterwards.
- Short and practical is ideal.
