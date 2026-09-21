# Dawn Harbor

Dawn Harbor is a full-stack mental-wellness web application with authenticated check-ins, journaling, AI chat, therapist matching, peer support, and an educational library.

Dawn Harbor is not an emergency service or a replacement for professional care. Journal safety prompts direct users in crisis to call or text 988 in the United States.

## Stack

- React 19, Vite 8, HeroUI, and Tailwind CSS 4
- Django 6, Django REST Framework, and expiring database-token authentication
- SQLite for local development; PostgreSQL through `DATABASE_URL` in production
- OpenAI Responses API for AI chat and OpenAI Moderation API for peer messages
- Playwright for browser tests and Django's test runner for backend tests

## Local setup

Backend:

```text
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt pip-audit
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
../.venv/Scripts/python -m pip_audit -r requirements.txt
../.venv/Scripts/python manage.py makemigrations --check --dry-run
../.venv/Scripts/python manage.py check
../.venv/Scripts/python manage.py test

cd ../frontend
npm audit --audit-level=high
npm run build
npm run test:e2e
```

## Behavior boundaries

- Chat messages and a rolling seven-day usage allowance are stored in the database.
- Journal entries, doodles, moods, and global therapist-sharing preferences are persisted per user. Therapist sharing is managed from the Therapist Match homepage and applies to every match and booking.
- Therapist matches, booking-request history, chat messages, and timezone-aware appointments are persisted. Users can review sharing details and edit or cancel eligible requests and appointments; overlapping appointments are blocked. The bundled therapist directory and therapist replies are demo data; Dawn Harbor does not contact a real provider or collect payment.
- Peer identities are anonymous. After the initial assessment, each user is assigned to an available 20-person room for their highest-scoring support category; ties are selected randomly. The system seeds two rooms per category. Full categories use a waitlist, and manually added rooms promote eligible waiting users. Users can switch to another available room or leave their current room to wait for a future one. Peer recommendations prioritize the same support category. Messages pass local policy checks and, when configured, AI moderation before storage.
- The Information Library preserves the active quiz attempt in browser session storage so an in-progress quiz survives navigation and reloads within the same browser session.

See [architecture](docs/architecture.md), [features](docs/features.md), and [API reference](docs/api.md) for more detail. Production deployment is defined in `render.yaml`.
