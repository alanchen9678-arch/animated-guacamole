# API reference

All feature routes require `Authorization: Token <token>`. Register and login are public. JSON request fields use the camelCase names shown below.

## Authentication

- `POST /api/auth/register/` — create an account and token.
- `POST /api/auth/login/` — return a token and user payload.
- `POST /api/auth/logout/` — delete the current token.
- `GET|PATCH /api/auth/me/` — read or update the current profile.

## Core wellness data

Initial assessments require a `personality` object using the version 2 continuous-signal schema:

    {
      schemaVersion: 2,
      instrument: aurora-personality-v2,
      dimensions: {
        socialEnergy: {
          score: 3.67,
          consistency: 0.72,
          signalStrength: moderate
        }
      }
    }

The `dimensions` object must contain exactly `socialEnergy`, `cooperationTrust`, `selfManagement`, `emotionalRecovery`, and `opennessCuriosity`. Scores range from 1 to 5, consistency ranges from 0 to 1, and signal strength is `weak`, `moderate`, `strong`, or `inconsistent`. Legacy archetype payloads are rejected for new initial assessments and ignored by AI personalization.

Authentication and check-in summary responses include `hasCurrentPersonalityAssessment`. Existing users for whom it is false submit the 30-question upgrade with type `personality`. The upgrade requires an existing initial assessment, creates no replacement check-in record, and leaves historical wellness scores unchanged. A valid v2 profile makes the flag true; repeated upgrade submissions are rejected.

- `GET|POST /api/checkins/` — list/submit initial, personality-upgrade, and weekly assessments.
- `GET|POST /api/journal/` — list or upsert a daily entry. Accepts `date`, `title`, `content`, `mood`, and `doodleData`.
- `GET|PATCH /api/journal/privacy/` — read/update `allowAiAccess`, `allowJournalAccess`, and `allowChatAccess`.
- `GET|POST /api/library/progress/` — read progress or record today's quiz completion.

## Chat

Private AI message-log responses include the owning authenticated userId. The server derives this value from authentication and never accepts it from the client.

- `GET /api/chat/` — return the newest 100 saved messages in chronological order.
- `POST /api/chat/` with `{ "message": "…" }` — generate and store a reply. Returns `429` at the rolling weekly limit, `502` when the provider fails, and never stores a partial exchange.

## Therapist demo

Private therapist message-log responses include the owning authenticated userId. Peer-support responses intentionally remain anonymous.

- `GET|POST /api/therapist/matches/` — list/save a therapist ID.
- `GET|POST /api/therapist/matches/:id/messages/` — list/send demo therapist messages.
- `GET|POST /api/therapist/matches/:id/bookings/` — list/create internal booking requests.
- `PATCH /api/therapist/matches/:id/bookings/:bookingId/` — cancel an outstanding booking request while preserving its history.
- `GET|POST /api/therapist/matches/:id/appointments/` — list/create timezone-aware future appointments with overlap validation.
- `PATCH /api/therapist/matches/:id/appointments/:appointmentId/` — edit or cancel an upcoming appointment.
- `GET /api/therapist/sharing-preview/` — show the exact needs-profile, check-in, journal, and AI-chat records available to a therapist under current privacy settings.

Match IDs are checked against the authenticated user. These endpoints do not contact a real provider or payment processor.

## Peer support

- `GET|POST /api/peer/profile/`
- `GET /api/peer/rooms/`
- `GET|POST /api/peer/rooms/:id/messages/`
- `GET /api/peer/peers/`
- `POST /api/peer/connect/:userId/`
- `GET|POST /api/peer/dm/:userId/`

Peer POSTs may return `400` for policy violations and `503` if required AI moderation is unavailable.

## Production variables

Backend: `DATABASE_URL`, `SECRET_KEY`, `DEBUG=false`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL`.

Frontend: `VITE_API_BASE_URL` set to the backend origin. The OpenAI key must never be placed in frontend variables.
