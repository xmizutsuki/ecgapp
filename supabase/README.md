# Optional Supabase backend

The static ECG Lab demo does **not** require Supabase. Configure this folder only when enabling real accounts, persisted progress, administration, and the AI tutor.

1. Create a Supabase project.
2. Run `schema.sql` and then `seed.sql` in the SQL editor.
3. Configure the public project URL and publishable key in `config.js`.
4. Set `OPENAI_API_KEY` as an Edge Function secret before deploying `functions/ecg-tutor`.
5. Never commit `service_role`, database passwords, or `OPENAI_API_KEY`.

The ECG files served by GitHub Pages are educational simulations generated at build time and are independent of Supabase Storage.
