# CareerPilot

CareerPilot is an AI-powered job discovery and application management platform for students and early-career developers. It combines job search, profile management, saved opportunities, application tracking, dashboard analytics, and AI-assisted match analysis in a single SaaS-style experience.

## Overview

The platform helps users:
- register and manage a professional profile
- discover jobs and internships
- save opportunities and track them
- apply through external company links
- manage application stages in a kanban flow
- monitor deadlines and response metrics
- get AI-assisted job match insights and career coaching guidance

## Tech stack

- Frontend: React, Vite, JavaScript, Tailwind CSS, React Router
- Backend: Node.js, Express.js, MongoDB, Mongoose
- Auth: JWT in HTTP-only cookies, bcryptjs
- Caching: Redis
- Background jobs: BullMQ
- AI: provider abstraction for Gemini and Grok with future support for other providers
- Analytics: Recharts
- UI: Lucide React, Framer Motion

## Architecture

The project is organized as a monorepo:

- client/: React + Vite frontend
- server/: Express.js API + MongoDB models + services
- root: shared scripts, environment config, Docker setup

## Features

- secure auth flow with http-only cookies
- job search, filtering, pagination, and details pages
- saved jobs and application tracker with kanban boards
- analytics dashboard with real application data
- AI job match analysis with provider abstraction
- AI career coach architecture and UI shell
- resume analysis preparation and future extensibility
- Redis caching with graceful fallback
- BullMQ worker scaffolding for async jobs

## Folder structure

```text
careerpilot/
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── queues/
│   ├── seed/
│   ├── utils/
│   └── index.js
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── README.md
└── ...
```

## Installation

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Copy the environment example file:

```bash
cp .env.example .env
```

4. Update environment values as needed.

5. Start MongoDB and Redis locally or via Docker:

```bash
docker compose up -d
```

6. Run the app:

```bash
npm run dev
```

## Environment variables

Copy `.env.example` to `.env` at the repository root. The server also reads `server/.env` if present. Both files are gitignored.

Required for a normal local app:
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Optional infrastructure:
- `REDIS_URL` — enable Redis cache and BullMQ workers. If unset, the API still starts.

Optional integrations (missing keys disable only that provider):
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY`
- `THEMUSE_API_KEY` — optional; The Muse public jobs API works without it at a lower rate limit
- Remotive — no API key. Uses `https://remotive.com/api/remote-jobs`. The public JSON catalog is a delayed, curated subset (10 listings when last verified); a private API is quoted in Remotive’s payload at a starting budget of $5k/mo via hello@remotive.com.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GROK_API_KEY`, `GROK_MODEL`, `AI_PROVIDER` (`auto`, `gemini`, or `grok`)
- `RESEND_API_KEY`, `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_PROJECT_ID`

Never put secrets in Vite `VITE_*` variables or client code.

### Disable an optional provider

Leave its key empty. For AI, heuristic fallbacks remain. For jobs, other configured providers still return results.

## MongoDB setup

A local MongoDB instance can be used or Docker can be used with the included compose file.

Example URI:

```bash
mongodb://127.0.0.1:27017/careerpilot
```

## Redis setup

Redis is optional. When unavailable, the app degrades gracefully and continues without caching.

Example URI:

```bash
redis://localhost:6379
```

## Running locally

### Start frontend only

```bash
npm run client
```

### Start backend only

```bash
npm run server
```

### Seed demo jobs

```bash
npm run seed
```

### Tests and live integration checks

```bash
npm test                      # Runs full backend test suite (49 unit & integration tests)
npm --workspace client run build  # Validates frontend production build
npm run verify:integrations   # Runs live read-only verification against configured services
```

The server test suite includes 49 tests covering multi-provider job adapters (Adzuna, The Muse, Remotive), job aggregation, global filtering & internship normalization, deterministic sorting, AI provider schemas and heuristic fallbacks, Redis/BullMQ queue isolation and degraded mode handling, Resend email templates & preference checks, and Google Calendar OAuth HMAC validation and token encryption.

Live verification uses the local `.env` and makes the smallest safe provider requests it can. It does not send email or create calendar events.

## Seeding database

The seed script creates 24 realistic job and internship records covering software engineering, data, AI, frontend, backend, DevOps, and analytics roles.

## API documentation

Base URL: `/api`

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Jobs
- GET /api/jobs
- GET /api/jobs/:id

### Saved Jobs
- GET /api/saved-jobs
- POST /api/saved-jobs/:jobId
- DELETE /api/saved-jobs/:jobId

### Applications
- GET /api/applications
- POST /api/applications
- PATCH /api/applications/:id
- DELETE /api/applications/:id

### Analytics
- GET /api/analytics/summary
- GET /api/analytics/trends

### AI
- POST /api/ai/job-match
- POST /api/ai/chat
- POST /api/ai/resume-analysis
- POST /api/ai/roadmap
- POST /api/ai/interview-prep

### Health
- GET /api/health
- GET /api/health/ready

### Integrations
- GET /api/integrations/google/status
- GET /api/integrations/google/connect
- GET /api/integrations/google/callback
- GET /api/integrations/google/test
- POST /api/integrations/google/disconnect

## Authentication

Authentication uses JWT stored in an HTTP-only cookie. The token is never stored in localStorage.

## AI architecture

The backend selects Gemini or Grok from `AI_PROVIDER` without changing feature routes. Responses are schema-validated. If a provider fails or returns invalid JSON, CareerPilot falls back to a labeled heuristic result instead of returning fabricated AI output.

Use cases:
- job-match explanations
- resume/skill-gap analysis from the saved profile
- learning roadmaps
- interview preparation
- career chat using the authorized profile

## Job providers

Search aggregates Adzuna, The Muse, and Remotive. Partial provider failure still returns successful results plus provider health metadata. Remotive listings keep the original Remotive URL and source attribution. Remotive responses are cached (about 6 hours) to stay within their request guidance (about 4 requests/day, and avoid polling more than twice per minute). Official docs describe `category`, `company_name`, `search`, and `limit` (default: all) and do not document page/offset pagination; live public responses have returned the same 10 job IDs even with `limit=50`, `search=engineer`, and `category=software-dev`. Documented category XML feeds returned HTTP 404 when checked. Broader access requires Remotive’s private paid API (`hello@remotive.com`). The Muse public API allows 500 requests/hour without a key and 3600/hour with `api_key`.

## Email (Resend)

Transactional email is backend-only. Automated tests never send mail. Production sending needs a verified Resend domain in `EMAIL_FROM`. Users can disable alerts through `notificationPreferences`.

## Google Calendar

OAuth uses `https://www.googleapis.com/auth/calendar.readonly`. Tokens are encrypted and stored on the user document. The default redirect URI is:

```text
http://localhost:5001/api/integrations/google/callback
```

That value must match the Google Cloud OAuth client exactly. Add your Google account as a test user while the consent screen is in testing. CareerPilot does not create calendar events unless you later approve that behavior.

## BullMQ architecture

Workers start only when Redis responds to PING:
- `jobSyncQueue`
- `aiQueue`
- `notificationQueue`

Jobs use attempts with exponential backoff. Email workers skip sending unless `allowSend` is set, and they honor an idempotency key.

## Deployment guidance

For deployment, configure a hosted MongoDB instance, Redis instance, and secure environment variables. The app is designed to run with a Node.js host and static frontend build served via a Vite production build or a CDN.

## Troubleshooting

- Missing optional API keys: the rest of the app still starts. Check `/api/health/ready`.
- If MongoDB is not available, start it with Docker or provide a valid `MONGODB_URI`.
- Redis down: cache and workers are skipped.
- Google redirect mismatch: add the exact `GOOGLE_REDIRECT_URI` under Google Auth Platform → Clients.
- Resend 403 on send: verify the sender domain; the onboarding address cannot send arbitrary production mail.
- Remotive empty/blocked: wait and reduce polling; do not scrape remotive.com. A 10-job public payload is the current curated catalog, not a CareerPilot page-size cap.
- If port conflicts occur, change the `PORT` variable.

## Future roadmap

1. real job API integrations
2. job aggregation and deduplication
3. recommendation engine improvements
4. advanced AI match scoring
5. resume parser and ATS analysis
6. cover letter generation
7. skill gap analysis
8. AI career coach and mock interviews
9. email notifications and deadline reminders
10. browser extension and deeper personalization

## Notes

This is the initial version of CareerPilot and intentionally focuses on a polished SaaS-like foundation with working auth, jobs, saved jobs, applications, analytics, and AI architecture.
