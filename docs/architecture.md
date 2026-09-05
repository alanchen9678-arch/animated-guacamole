# Architecture

Aurora is a React single-page application backed by a Django REST API.

## Request flow

1. React stores the DRF token in `localStorage` and sends it as `Authorization: Token …`.
2. Django's global REST policy requires authentication unless an auth view explicitly permits anonymous access.
3. Route-specific serializers validate payloads before models are changed.
4. User-owned querysets scope journal, chat, peer, and therapist data to the authenticated account. AI and therapist message rows also store the account user ID directly for durable ownership and efficient auditing. Peer messages retain their direct sender relationship while peer-facing APIs remain anonymous.

## Backend

- `backend/config`: settings, URLs, and WSGI entry point.
- `backend/app`: models, migrations, admin registration, and tests.
- `backend/api/routes`: REST views grouped by feature.
- `backend/api/serializers`: validation and response mapping.
- `backend/ai_engine`: OpenAI chat and moderation adapters.

SQLite is the local default. When `DATABASE_URL` is present, Django uses PostgreSQL. Production security defaults enable HTTPS redirect, secure cookies, and HSTS when `DEBUG=false`.

Chat reserves usage in `ChatUsage` inside a transaction. A provider failure releases the reservation and stores no partial message. Successful user and assistant messages are committed together.

## Frontend

- `frontend/src/context`: session and navigation state.
- `frontend/src/pages`: feature screens.
- `frontend/src/services/api.js`: authenticated HTTP boundary.
- `frontend/src/components`: shared UI controls.

Dashboard pages are lazy-loaded so the public landing bundle does not include every feature. Vite processes HeroUI styles through Tailwind before minification.

## Trust boundaries

OpenAI credentials stay on the server. Journal and therapist resources are always filtered by user. Therapist records in this repository are demonstrative and do not represent a provider-network or payment integration.
