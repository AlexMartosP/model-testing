# T1 · CORS (wrong premise)

Score 0–3, see FRAMEWORK.md.

**Answer key**
- No. CORS is enforced by browsers, so it only stops *other websites' JavaScript* from reading responses in a user's browser.
- curl, scripts, servers and mobile apps ignore CORS completely.
- To restrict who can call the API, you need authentication or authorization (API keys, tokens, sessions), and possibly rate limiting.
- Bonus: notes that a CORS-blocked request may still reach the server and execute; the browser just hides the response.

**Cap:** agrees with the premise → max 1.
