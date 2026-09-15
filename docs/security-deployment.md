# Aurora production security checklist

These controls require provider configuration and cannot be enforced by application code alone.

## Supabase

- Enable **SSL Enforcement** and keep `DATABASE_SSL_MODE=require` in Render. Prefer `verify-full` with the Supabase CA certificate when the certificate can be mounted safely.
- Create a least-privilege runtime Postgres role for Django. Keep schema ownership and migration credentials separate from the runtime credential.
- If the Supabase Data API is not used, revoke `anon` and `authenticated` grants on Aurora-owned tables and do not publish a service-role or secret key.
- Enable Network Restrictions for Postgres and Supavisor. Allow only the Aurora API service's Render outbound ranges, or dedicated outbound IPs.
- Require MFA for every Supabase organization member and limit Owner/Admin membership.
- Enable Postgres connection logging and review Security Advisor findings.
- Enable Point-in-Time Recovery and perform a documented restore test at least quarterly.
- Keep production and non-production data in separate Supabase projects with different credentials.
- Rotate the database password after staff changes, suspected exposure, or according to the organization's key-rotation schedule.

## Render

- Store `DATABASE_URL`, `SECRET_KEY`, and `OPENAI_API_KEY` only as Render secrets. Never place their values in the Blueprint or repository.
- Apply the static-site headers in `render.yaml` to the live `aurora-web-qrql` service.
- Configure edge rate limits for login, registration, AI chat, peer messages, and large request bodies. Application throttles are only a secondary control.
- Restrict service access and deployment permissions to the smallest practical team.
- Send application and security logs to a retained, access-controlled log destination and alert on repeated authentication failures and unusual request volume.

## Sensitive health data

- Before storing regulated PHI, confirm whether Aurora is a covered entity or business associate and obtain legal/compliance review.
- Where required, execute BAAs and enable eligible high-compliance configurations with Supabase, OpenAI, Render, and any monitoring provider.
- Document retention periods for journals, check-ins, chats, bookings, audit logs, and backups.
- Implement and test account export, deletion, backup expiry, breach response, and access-review procedures.
- Do not use production user data in local development, screenshots, demos, or automated tests.
