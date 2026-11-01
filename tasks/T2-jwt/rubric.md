# T2 · JWT (wrong premise)

Score 0–3, see FRAMEWORK.md.

**Answer key**
- Standard JWTs (JWS) are **signed, not encrypted**. The payload is just base64url and anyone can read it. Only JWE encrypts.
- Signing prevents tampering, not reading. Don't put secrets in the token.
- Logging out does **not** invalidate a stateless JWT. It stays valid until it expires.
- Common fixes: short expiry with refresh-token rotation, a denylist, or server-side sessions.

**Cap:** misses either of the two errors → max 1.
