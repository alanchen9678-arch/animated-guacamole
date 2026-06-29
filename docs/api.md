# Chatbot API Deployment

The chatbot already posts from the frontend to `POST /api/chat/` on the Django backend. For the hosted version to work on Render with Supabase as the database, the backend service needs a valid OpenAI key and the frontend needs to point at the deployed backend URL.

## Required production wiring

Backend on Render:

- `DATABASE_URL`: your Supabase Postgres connection string
- `SECRET_KEY`: any strong Django secret
- `DEBUG=false`
- `ALLOWED_HOSTS=your-backend-service.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://your-frontend-service.onrender.com`
- `OPENAI_API_KEY=sk-...`
- `OPENAI_MODEL=gpt-4.1-mini`

Frontend on Render:

- `VITE_API_BASE_URL=https://your-backend-service.onrender.com`

## Important behavior notes

- The chat endpoint is authenticated. Users must log in first so the frontend can send `Authorization: Token ...`.
- The OpenAI key belongs on the Render backend service, not in the frontend and not in Supabase.
- Supabase is only providing the hosted Postgres database in this setup unless you explicitly move auth or edge functions there too.
- The backend now stores AI conversations in the `Conversation` and `Message` tables, so replies can use recent chat history instead of only the latest message.

## Quick verification checklist

1. Open the deployed frontend and create or log into an account.
2. In Render, confirm the backend has `OPENAI_API_KEY` set and redeployed after saving it.
3. Confirm the frontend `VITE_API_BASE_URL` matches the live backend origin exactly.
4. Confirm `CORS_ALLOWED_ORIGINS` matches the live frontend origin exactly, including `https://`.
5. Send a message in the chatbot. A successful response should return HTTP `200` from `POST /api/chat/`.

## Common failure cases

- `401 Unauthorized`: the user is not logged in or the token is missing from `localStorage`.
- `500 OPENAI_API_KEY is not set`: the key is missing on the backend service.
- `502 OpenAI request failed`: the backend reached the route but the OpenAI call failed.
- Browser CORS error: the frontend or backend origin env vars do not match the deployed domains exactly.
