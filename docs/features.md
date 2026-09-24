# Features

## Deferred: AI journal context

**Status: not approved and not implemented.** The chatbot does not read or send journal entries to OpenAI. The existing `allow_ai_access` preference is dormant and must not be connected to the chatbot until the requirements below are completed.

The proposed feature would add an off-by-default Settings control that lets a user authorize bounded retrieval from the previous four months. A qualifying chatbot request could send no more than three relevant text excerpts, capped at about 4,000 characters total, to OpenAI. Doodles would never be included, and unrelated requests would receive no journal context.

Before implementation:

- Obtain legal and privacy review covering applicable federal, state, and international health-data laws.
- Update the consumer health-data notice and privacy policy before enabling the feature.
- Present separate, informed opt-in consent that names OpenAI, identifies the data and purpose, explains applicable retention, and explains how to withdraw consent.
- Determine whether Dawn Harbor is subject to HIPAA and whether BAAs or other processor agreements are required.
- Decide whether OpenAI Zero Data Retention or Modified Abuse Monitoring is required and approved for the production project.
- Implement consent-version records, immediate withdrawal, access, deletion, and audit procedures without logging journal text.
- Prevent journal-derived chatbot replies from being shared with therapists unless both chat sharing and journal sharing are enabled.
- Complete prompt-injection, relevance, privacy, accessibility, failure-state, and data-boundary tests.

## Accounts and check-ins

Users can register, log in, edit their profile, complete one initial assessment, and submit weekly check-ins. Needs profiles use the initial assessment until five weekly entries exist, then use the latest five-week average.

## AI chat

Authenticated chat stores the newest 100 messages for display and sends the latest 12 prior messages as context. A database-backed 200-message allowance resets seven days after the current window begins. Failed provider calls neither consume allowance nor leave orphan messages.

## Journal

Each authenticated user can store one entry per day with text, mood, and a doodle. In-progress entries are kept in browser session storage, while saved entries are persisted to the account. Optional AI-chat-log and journal sharing with simulated therapists is off by default. Keyword-based support prompts include 988 guidance for crisis language.

## Therapist match

Matching ranks a bundled demo directory against needs and user preferences. Saved demo matches, request history, simulated therapist chat, and demo appointment history persist to the account. Outstanding requests can be cancelled; upcoming appointments can be reviewed, edited, or cancelled; overlapping appointments are rejected. Appointment times display their saved timezone. Account-wide therapist-sharing controls live on the Therapist Match homepage and apply to every current and future demo connection. These records remain inside Dawn Harbor; no external therapist or payment system is connected.

## Peer support

Users receive peer-facing pseudonymous profiles, join topic rooms, connect, and exchange direct messages. Dawn Harbor still links each peer identity to its owning account. Generated colors are stable across server restarts. Contact sharing, harassment, and unsafe advice are checked locally; configured AI moderation supplies a second automated check.

## Information library

The library summarizes common mental-health conditions and links to source material. Quiz feedback shows the correct answer, and the active quiz attempt is preserved in browser session storage for the current session. The backend retains a library-progress endpoint, but the current interface does not record or display a completion streak.
