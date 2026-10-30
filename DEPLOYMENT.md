# Deployment

| Piece | Where | Config file |
|-------|-------|-------------|
| API (`server/`) | **Render** web service (Node runtime or Docker) | `render.yaml`, `server/Dockerfile` |
| Frontend (`client/`) | **Vercel** (or a Render static site) | `client/vercel.json`, `render.yaml` |
| Database | MongoDB Atlas | `MONGODB_URI` |
| Everything locally in containers | Docker Compose | `docker-compose.yml`, `client/Dockerfile` |

How the pieces talk: the browser calls `/api/...` on the **frontend's own domain**, and Vercel (`client/vercel.json`) or the Render static site (`render.yaml` routes) forwards it to the API. There's no CORS and no build variable to get wrong.

```
Browser ──► https://<app>.vercel.app/api/...  ──(rewrite)──► https://appointments-api-lam8.onrender.com/api/...  ──► Atlas
```

> The API URL `https://appointments-api-lam8.onrender.com` is written in `client/vercel.json` and `render.yaml`. If your API service gets a different URL, change it in both.
>
> Optional alternative: set `VITE_API_BASE_URL` to call the API directly from the browser. Then `CORS_ORIGIN` on the API must list every frontend URL.

---

## 0. Before you start

1. **Push the project to GitHub** (Render and Vercel deploy from a repo). The repo root is this folder, containing `server/` and `client/`.
   - `.env` files are git-ignored. Check with `git status` that `server/.env` is **not** listed before your first push. It contains your Atlas password.
2. **MongoDB Atlas → Security → Network Access → Add IP Address → `0.0.0.0/0`** (Allow access from anywhere). Render's outgoing IPs change, so a single IP won't work. The database user + password still protect the cluster.
3. Have your Atlas connection string ready (Atlas → **Connect → Drivers**).

---

## 1. API on Render

### Option A: Blueprint (uses `render.yaml`)

1. Render dashboard → **New → Blueprint** → pick the repo.
2. Render reads `render.yaml` and proposes **appointments-api** (and **appointments-web**; delete that one if the frontend goes to Vercel).
3. Fill in the values it asks for:
   - `MONGODB_URI` = your Atlas string, e.g. `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/`
   - `CORS_ORIGIN` = your frontend URL. If you don't have it yet, put `https://*.vercel.app` and tighten it after step 2.
4. **Apply**. When it's live, open `https://<api-name>.onrender.com/api/health`. It should show `{"ok":true,"db":"connected"}`.

### Option B: Manual web service

**New → Web Service** → repo, then:

| Setting | Value |
|---------|-------|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Environment variables:

| Key | Value |
|-----|-------|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas string |
| `MONGODB_DB_NAME` | `appointments` |
| `SEED_ON_START` | `false` (set `true` once if you want the 3 demo rows, then back to `false`) |
| `CORS_ORIGIN` | `https://your-app.vercel.app` (comma-separate several; `*` wildcard allowed, e.g. `https://*.vercel.app` for preview deploys) |

Do **not** set `PORT`; Render provides it and the server reads it.

### Option C: Docker on Render

Same as B, but Runtime **Docker**, Root Directory `server`, Dockerfile Path `./Dockerfile`. No build/start commands. Same env vars.

---

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory: `client`**. Framework preset: Vite (also set in `client/vercel.json`).
3. **Environment Variables**: none needed; `/api` is forwarded by `vercel.json`. Only if you choose direct calls instead:
   - `VITE_API_BASE_URL` = `https://<api-name>.onrender.com` (no trailing slash, no `/api`)
   - Type **Config**, not Secret. It's a public URL that ends up in the browser bundle anyway, and Vercel refuses `VITE_*` secrets.
   - Environments: tick **Production** *and* Preview. A variable scoped only to Preview is missing from the production build.
4. **Deploy**. Note the URL, e.g. `https://appointments.vercel.app`.
5. Back on Render, set the API's `CORS_ORIGIN` to that URL (add `,https://*.vercel.app` if you want preview deployments to work too). Saving restarts the API.

> `VITE_API_BASE_URL` is compiled into the JavaScript at build time. After changing it, **redeploy** the frontend; changing the variable alone does nothing.

### Alternative: frontend on Render

Use the **appointments-web** service from the Blueprint, or **New → Static Site**: Root Directory `client`, Build Command `npm ci && npm run build`, Publish Directory `dist`, env var `VITE_API_BASE_URL` as above, plus a rewrite rule `/*` → `/index.html`. Then put its `https://….onrender.com` URL in the API's `CORS_ORIGIN`.

---

## 3. Check the deployment

1. `https://<api>.onrender.com/api/health` shows `{"ok":true,"db":"connected"}`.
2. Open the frontend, add an appointment, search for it, filter by status, reload (search and filter stay).
3. Browser devtools → Network: requests go to `…onrender.com/api/appointments` and return 200.

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| Frontend shows "Cannot reach the API server" | API asleep, down, or blocked by CORS. Open `/api/health` directly. If that works, `CORS_ORIGIN` doesn't match the exact frontend URL (scheme included, no trailing slash). |
| First request takes ~30–60 s | Render **free** plan sleeps after 15 min idle; the first request wakes it. Use a paid plan to avoid it. |
| Render deploy fails health check / logs say `bad auth` | Wrong Atlas user/password in `MONGODB_URI` (use a *database user*; URL-encode `@ : / ? # %` in the password). |
| Logs say `Could not reach the cluster` | Atlas Network Access doesn't allow `0.0.0.0/0`. |
| Requests go to `/api/...` on the Vercel domain and 404 | `VITE_API_BASE_URL` wasn't set when the frontend was built. Set it and redeploy. |
| Data lands in a `test` database | `MONGODB_DB_NAME` unset and the URI has no database name. It defaults to `appointments`. |

---

## Docker

### Whole stack locally (MongoDB + API + frontend)

```bash
docker compose up --build
```

Open http://localhost:8080. nginx serves the app and proxies `/api` to the API container; MongoDB data persists in the `mongo-data` volume. On first start the API seeds 3 demo appointments into the empty database.

- Use Atlas instead of the bundled MongoDB: create a root `.env` with `MONGODB_URI=mongodb+srv://…` (git-ignored).
- Different port: `CLIENT_PORT=3000 docker compose up --build`.
- Stop: `docker compose down` (add `-v` to delete the database volume).

### Images on their own

```bash
# API
docker build -t appointments-api ./server
docker run -p 4000:4000 -e MONGODB_URI="mongodb+srv://…" -e CORS_ORIGIN=http://localhost:5173 appointments-api

# Frontend (nginx). Either proxy /api to an API:
docker build -t appointments-web ./client
docker run -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:4000 appointments-web
# …or bake in a public API URL instead:
docker build -t appointments-web --build-arg VITE_API_BASE_URL=https://<api>.onrender.com ./client
```

What the images do:
- **API**: Node 22 Alpine, production dependencies only, runs as the non-root `node` user, `HEALTHCHECK` on `/api/health`, graceful shutdown on `SIGTERM`. `.env`, tests and `node_modules` are excluded via `.dockerignore`.
- **Frontend**: multi-stage build → nginx 1.27 Alpine. SPA fallback, `/assets` cached for a year, `/api/` proxied to `API_UPSTREAM`.

---

## All environment variables

**API (`server/`)**

| Key | Required | Default | Notes |
|-----|----------|---------|-------|
| `MONGODB_URI` | yes (unless `USE_MEMORY_DB=true`) | — | Atlas or local connection string |
| `MONGODB_DB_NAME` | no | `appointments` | Overrides the database name in the URI |
| `PORT` | no | `4000` | Render sets it automatically |
| `NODE_ENV` | no | `development` | Use `production` when deployed |
| `CORS_ORIGIN` | in production | `http://localhost:5173` | Comma-separated; `*` wildcard |
| `SEED_ON_START` | no | `false` | Seeds 3 demo rows if the collection is empty |
| `USE_MEMORY_DB` | no | `false` | Local testing only; needs devDependencies |

**Frontend (`client/`)**

| Key | When | Notes |
|-----|------|-------|
| `VITE_API_BASE_URL` | production build (Vercel / Render static) | API origin, e.g. `https://appointments-api.onrender.com`. Empty → same origin |
| `API_PROXY_TARGET` | `npm run dev` only | Where Vite proxies `/api` locally |
| `API_UPSTREAM` | Docker image only (runtime) | Where nginx proxies `/api` |
