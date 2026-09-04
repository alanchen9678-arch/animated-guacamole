# Features

## Accounts and check-ins

Users can register, log in, edit their profile, complete one initial assessment, and submit weekly check-ins. Needs profiles use the initial assessment until five weekly entries exist, then use the latest five-week average.

## AI chat

Authenticated chat stores the newest 100 messages for display and sends the latest 12 prior messages as context. A database-backed 200-message allowance resets seven days after the current window begins. Failed provider calls neither consume allowance nor leave orphan messages.

## Journal

Each user can store one entry per day with text, mood, and a doodle. Local storage supports offline/anonymous UI state; authenticated state is reconciled with the backend. Optional chatbot and journal sharing controls are private by default. Keyword-based support prompts include 988 guidance for crisis language.

## Therapist match

Matching ranks a bundled demo directory against needs and user preferences. Saved matches, booking-request history, therapist chat, and appointment history persist to the account. Outstanding requests can be cancelled; upcoming appointments can be reviewed, edited, or cancelled; overlapping appointments are rejected. Appointment times display their saved timezone. A privacy-aware preview lists the exact check-ins, recent journal entries, and recent AI-chat messages that would be shared. Booking sends an internal request only; no external therapist or payment system is connected.

## Peer support

Users receive anonymous profiles, join topic rooms, connect, and exchange direct messages. Generated colors are stable across server restarts. Contact sharing, harassment, and unsafe advice are blocked locally; configured AI moderation supplies a second safety check.

## Information library

The library summarizes common mental-health conditions and links to source material. Quiz feedback shows the correct answer, and completing a quiz records an idempotent daily streak.
