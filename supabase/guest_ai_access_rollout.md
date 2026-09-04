Beta 1.0 guest AI rollout:

- CardioTutor and CaseCoach can call `ecg-tutor` without a signed-in session.
- Authenticated sessions are still detected and validated when present.
- Guest traffic uses server-side hashed rate-limit buckets.
- Production deployment must set `ecg-tutor` with `verify_jwt=false`.
