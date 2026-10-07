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

See `.env.example`.

Required values:
- PORT
- MONGODB_URI
- JWT_SECRET
- CLIENT_URL
- REDIS_URL
- GEMINI_API_KEY
- GROK_API_KEY

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

## Authentication

Authentication uses JWT stored in an HTTP-only cookie. The token is never stored in localStorage.

## AI architecture

The AI layer is built on a provider abstraction so future integrations can be added cleanly.

Current providers:
- Gemini
- Grok
- local heuristic fallback when no provider keys are configured

This keeps keys server-side and avoids exposing them in the client.

## BullMQ architecture

BullMQ queues are prepared for:
- job synchronization
- AI recommendation workflows
- resume analysis
- cover letter generation
- deadline notifications

The app does not depend on these workers being active to function.

## Deployment guidance

For deployment, configure a hosted MongoDB instance, Redis instance, and secure environment variables. The app is designed to run with a Node.js host and static frontend build served via a Vite production build or a CDN.

## Troubleshooting

- If MongoDB is not available, start it with Docker or provide a valid MONGODB_URI.
- If Redis is unavailable, the app still works because caching is optional.
- If AI credentials are missing, the app uses local heuristic scoring instead of failing.
- If port conflicts occur, change the PORT variable in the environment.

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
