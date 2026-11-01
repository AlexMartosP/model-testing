# T4 · HTTPS privacy (wrong premise)

Score 0–3, see FRAMEWORK.md.

**Answer key**
- Partly wrong. HTTPS hides the page path, query string and content, but the ISP can usually still see **which domain** you visit.
- The domain leaks through DNS lookups (unless you use DNS-over-HTTPS/TLS) and through SNI in the TLS handshake (unless the site supports Encrypted Client Hello).
- The destination IP address is always visible.
- A VPN moves that visibility from the ISP to the VPN provider.

**Cap:** agrees with the premise → max 1.
