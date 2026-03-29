## Vercel Ready

This repo is now structured so Vercel can deploy it directly:

- static frontend from `frontend/`
- Python API from `api/index.py`
- SPA routing handled by `vercel.json`
- Netlify SPA routing handled by `frontend/public/_redirects`

### What Works On Vercel

- authentication UI
- static product pages
- tool explorer
- API-backed reads
- standard FastAPI routes

### What Is Disabled On Vercel

- websocket terminals
- Docker SSH live shell
- long-running recon execution with native binaries

These features require a persistent backend host or VM.

### Required Environment Variables

- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `MONGO_URL` if using MongoDB
- `DB_NAME`
- `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD` if email features are needed
- `FRONTEND_URL`

### Deploy Flow

1. Import repo into Vercel
2. Set the required environment variables
3. Deploy

The app will come up in deploy-safe mode automatically on `*.vercel.app`.
