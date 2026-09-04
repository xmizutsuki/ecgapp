# Guest AI access

`ecg-tutor` supports both authenticated learners and guests in Beta 1.0.

- The Edge gateway is deployed with `verify_jwt=false` so guest requests can reach the function.
- If a Bearer token is present, the function validates it against Supabase Auth before treating the request as authenticated.
- Guest requests are rate-limited server-side with SHA-256 bucket keys. Raw IP addresses are not stored in Postgres.
- The official GitHub Pages origin and localhost development origins are accepted.
- Logged-in users retain a higher quota than guests.
- The Groq API key remains server-side only.

Database support is defined in `supabase/guest_ai_rate_limit.sql`.
