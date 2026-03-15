# LouvorPro

## Overview

LouvorPro is a worship ministry management platform for churches. It helps worship leaders manage their team, schedule services, organize their song library, plan setlists, and communicate with their team.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite + Tailwind CSS (artifacts/louvorpro)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **UI Components**: shadcn/ui
- **Routing**: Wouter
- **Data fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod resolvers
- **Build**: esbuild (CJS bundle for server)

## Core Modules

1. **Dashboard** — Summary cards (next service, team count, song count, pinned notes), upcoming service preview, pinned announcements
2. **Team** (`/members`) — Manage worship team members (name, email, phone, role, leader status)
3. **Songs** (`/songs`) — Song library with title, artist, musical key, BPM, tags, lyrics, chord chart, YouTube URL
4. **Schedule** (`/services`) — List of worship services with date, time, theme, status (draft/confirmed/completed)
5. **Service Detail** (`/services/:id`) — Full service view with setlist (ordered songs with key overrides and notes) + team assignments
6. **Announcements** (`/announcements`) — Team messages and notes with pin support

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   └── src/routes/     # members, songs, services, setlists, announcements, health
└── louvorpro/          # React + Vite frontend
    └── src/
        ├── pages/      # dashboard, members, songs, services, service-detail, announcements
        ├── components/ # app-sidebar, layout
        └── index.css   # Tailwind + CSS variables theme

lib/
├── api-spec/           # OpenAPI 3.1 spec (openapi.yaml) + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/
    └── src/schema/     # members, songs, services, service_assignments, setlist_items, announcements
```

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/louvorpro run dev` — Start frontend dev server
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — Push DB schema changes to PostgreSQL

## Architecture Notes

- API routes are contract-first: edit `lib/api-spec/openapi.yaml` first, then run codegen
- The frontend uses generated React Query hooks from `@workspace/api-client-react`
- Database uses Drizzle ORM with PostgreSQL (not SQLite — uses Replit's built-in Postgres)
- All routes are under `/api` prefix; frontend is served at `/`

## GitHub Repository

- **Repository**: https://github.com/kenyels-design/music-paradise
- **Branch**: `main`
- **Push method**: GitHub REST API (Git Data endpoints: Blobs/Trees/Commits/Refs) via `@replit/connectors-sdk` proxy. Native `git push` is not available because the Replit askpass token service (port 8284) does not respond for pid2 agent sessions.
- **Excluded from repo**: `attached_assets/*.mp4` files (48MB screen recordings from chat, not application code)
