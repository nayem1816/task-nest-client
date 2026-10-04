# TaskNest Web

Web client for TaskNest: the marketing site, the authenticated workspace (inbox,
contacts, AI agent, automation, analytics) and the embeddable chat widget.

The API, architecture notes and decision records live in
[task-nest-server](https://github.com/nayem1816/task-nest-server).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vitest ·
Testing Library

## Running locally

Requirements: Node 22.12+ and a running API (see the server README).

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3100
```

The home page shows whether it can reach the API, which is the quickest way to
confirm both sides are configured.

## How it talks to the API

The browser only ever calls `/api/v1/*` on this app's own origin. A Next.js
rewrite forwards those requests to `API_ORIGIN`, so the refresh cookie is
first-party and the app needs no CORS. `src/proxy.ts` adds the visitor's address
and the shared `EDGE_PROXY_SECRET` so the API can rate limit per person rather
than per web server.

The access token is kept in memory only. On load the app exchanges the refresh
cookie for a new one; on a 401 it refreshes once and replays the request.

API types are generated from the server's OpenAPI document:

```bash
npm run api:types   # needs the API running on :4100
```

## Scripts

| Command             | What it does               |
| ------------------- | -------------------------- |
| `npm run dev`       | Dev server on port 3100    |
| `npm test`          | Unit and component tests   |
| `npm run lint`      | ESLint (Next + TypeScript) |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run build`     | Production build           |
| `npm run api:types` | Regenerate API types       |
