# Appointments

Express + MongoDB API (`server/`, ES modules, Node ≥ 20.6) and a Vite + React client (`client/`).

**Deploying (Render, Vercel, Docker):** see [DEPLOYMENT.md](DEPLOYMENT.md).

## Configuration

Each app reads its settings from a `.env` file; copy the `.env.example` next to it (both are already copied with local defaults). `.env` files are git-ignored.

**`server/.env`**

| Key | Default | Purpose |
|-----|---------|---------|
| `NODE_ENV` | `development` | Environment name, shown in the start-up log |
| `PORT` | `4000` | API port |
| `MONGODB_URI` | — (required unless in-memory) | Real MongoDB connection string, local or Atlas |
| `USE_MEMORY_DB` | `false` | `true` starts a throwaway in-memory MongoDB instead |
| `SEED_ON_START` | `false` | `true` inserts the 3 demo appointments at start-up if the collection is empty |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins |

**`client/.env`**

| Key | Default | Purpose |
|-----|---------|---------|
| `API_PROXY_TARGET` | `http://localhost:4000` | Where the Vite dev server proxies `/api`; must match the server `PORT` |

## Run (server)

```bash
cd server
npm run dev          # real MongoDB from MONGODB_URI, restarts on file changes
npm start            # same, without watch
npm run seed         # insert the 3 demo appointments into the real DB (only if empty)
npm run dev:memory   # in-memory MongoDB, seeded, ignores MONGODB_URI
npm test
```

If MongoDB is unreachable or `MONGODB_URI` is missing, the server exits with a one-line reason. Ctrl+C / SIGTERM closes the DB connection cleanly.

## Run (client)

```bash
cd client
npm run dev    # http://localhost:5173, proxies /api to API_PROXY_TARGET
npm run lint && npm test && npm run build
```

## Features

- ✅ Appointment list, status tabs with counts, add appointment
- ✅ Search by customer name (partial, case-insensitive, debounced 300 ms, synced to `?search=` alongside `?status=`)
- ✅ Change an appointment's status from its row (dropdown; tab counts refresh, failed saves revert with an inline error)
- ✅ Appointment details modal (click a name): full details, status change, delete with confirmation; keyboard accessible (focus trap, Escape, focus return)
- ✅ Delete an appointment (from the modal, after confirming)

## Manual demo checklist

- [x] (4) Type in the search box; list narrows, tab counts update, URL gains `?search=`; × and Escape clear it; reload keeps search and status

## API notes

### `GET /api/appointments`

| Param    | Description |
|----------|-------------|
| `status` | Optional. `Pending`, `Confirmed` or `Cancelled`. |
| `search` | Optional. Case-insensitive **partial** match on `customerName` only. Trimmed; empty or whitespace-only means no search. Max 100 characters. Matched literally (regex characters are escaped). |

`status` and `search` combine with AND. `meta.counts` (`All`, `Pending`, `Confirmed`, `Cancelled`) **reflects the search** but ignores the `status` filter, so tabs can show matches per status.

```bash
curl 'http://localhost:4000/api/appointments?search=ale'
curl 'http://localhost:4000/api/appointments?search=a&status=Confirmed'
```

Errors (400 `VALIDATION_ERROR`, field `search`): `Search must be text.` (repeated param) and `Search must be at most 100 characters.`

### `PATCH /api/appointments/:id`

Changes an appointment's status. The body must be exactly `{ "status": "Pending" | "Confirmed" | "Cancelled" }`; any other field is rejected, so this endpoint can't edit names or dates. Any status can move to any other (including back to `Pending`); setting the current status is a no-op that returns 200.

```bash
curl -X PATCH 'http://localhost:4000/api/appointments/<id>' \
  -H 'Content-Type: application/json' -d '{"status":"Confirmed"}'
```

| Status | When |
|--------|------|
| 200 | `{ "data": <updated appointment> }` |
| 400 `VALIDATION_ERROR` | unknown/missing status, or extra fields (`Only "status" can be updated.`) |
| 400 `INVALID_ID` | `:id` isn't a valid id |
| 400 `INVALID_JSON` | body isn't valid JSON |
| 404 `NOT_FOUND` | no appointment with that id |

### `DELETE /api/appointments/:id`

Permanently deletes one appointment. There is no bulk delete.

```bash
curl -X DELETE 'http://localhost:4000/api/appointments/<id>'
```

| Status | When |
|--------|------|
| 204 | deleted (no body) |
| 400 `INVALID_ID` | `:id` isn't a valid id |
| 404 `NOT_FOUND` | no appointment with that id (including one already deleted) |

## Change-request log

### Customer-name search
Received at ~minute 50. Clarifying questions asked: where the project lives (the folder was empty, so base app was built first); how to apply DESIGN.md (tokens and components only); which fonts (Inter + JetBrains Mono as licensed-font substitutes). Agreed behaviour: case-insensitive partial match on customerName only; AND with status; trimmed, empty means no search, max 100 chars; `meta.counts` reflect the search but ignore status; 300 ms debounce; escaped regex input. Impact: ~10–15 min on top of an existing app; here the base app was also built. Implemented in: `server/src/utils/escapeRegex.js`, `server/src/validators/appointment.js`, `server/src/services/appointmentService.js`, `server/tests/appointments.test.js`, `client/src/api/appointments.js`, `client/src/hooks/{useDebouncedValue,useListParams,useAppointments}.js`, `client/src/components/SearchInput.jsx`, `client/src/App.jsx`, `client/src/App.test.jsx`.
