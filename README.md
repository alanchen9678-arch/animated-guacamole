# Aurora

Aurora is a full-stack mental-wellness web application with authenticated check-ins, journaling, AI chat, therapist matching, peer support, and an educational library.

Aurora is not an emergency service or a replacement for professional care. Journal safety prompts direct users in crisis to call or text 988 in the United States.

## Stack

- React 19, Vite 8, HeroUI, and Tailwind CSS 4
- Django 6, Django REST Framework, and token authentication
- SQLite for local development; PostgreSQL through `DATABASE_URL` in production
- OpenAI Responses API for AI chat and peer-message moderation
- Playwright for browser tests and Django's test runner for backend tests

## Local setup

Backend:

```text
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt
copy backend/.env.example backend/.env
cd backend
../.venv/Scripts/python manage.py migrate
../.venv/Scripts/python manage.py runserver
```

Frontend, in a second terminal:

```text
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend runs at `http://127.0.0.1:5173` and the API at `http://127.0.0.1:8000` by default. Set `OPENAI_API_KEY` in `backend/.env` to enable AI chat and AI-assisted peer moderation.

## Verification

```text
cd backend
../.venv/Scripts/python manage.py test
../.venv/Scripts/python manage.py check

cd ../frontend
npm run build
npm run test:e2e
npm audit
```

## Behavior boundaries

- Chat messages and a rolling seven-day usage allowance are stored in the database.
- Journal entries, doodles, moods, and global therapist-sharing preferences are persisted per user. Therapist sharing is managed from the Therapist Match homepage and applies to every match and booking.
- Therapist matches, booking-request history, chat messages, and timezone-aware appointments are persisted. Users can review sharing details and edit or cancel eligible requests and appointments; overlapping appointments are blocked. The bundled therapist directory and therapist replies are demo data; Aurora does not contact a real provider or collect payment.
- Peer identities are anonymous. Messages pass local policy checks and, when configured, AI moderation before storage.
- Educational quiz completion records a daily learning streak.

See [architecture](docs/architecture.md), [features](docs/features.md), and [API reference](docs/api.md) for more detail. Production deployment is defined in `render.yaml`.
