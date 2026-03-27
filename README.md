# CyberGuard Platform

CyberGuard Platform is a full-stack cybersecurity learning and monitoring app built with React, FastAPI, and MongoDB. It includes authentication, admin controls, sandbox challenges, learning content, AI assistant hooks, and a modern dashboard-oriented frontend.

## Stack

- Frontend: React, CRACO, Tailwind, Radix UI, Framer Motion
- Backend: FastAPI, Motor, JWT auth
- Database: MongoDB

## Project Structure

- `frontend/` React application
- `backend/` FastAPI API server
- `tests/` and `backend_test.py` test assets

## Local Setup

### Backend

1. Create a virtual environment and install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Copy the example environment file and fill in real values:

```bash
cp .env.example .env
```

3. Run the API:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

1. Install dependencies:

```bash
cd frontend
yarn install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Start the app:

```bash
yarn start
```

## Required Environment Variables

### Backend

- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `EMERGENT_LLM_KEY`
- `GMAIL_EMAIL`
- `GMAIL_APP_PASSWORD`
- `SSH_HOST`
- `SSH_USER`
- `SSH_PASSWORD`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`

### Frontend

- `REACT_APP_BACKEND_URL`
- `WDS_SOCKET_PORT`
- `ENABLE_HEALTH_CHECK`

## Public Publish Notes

- Do not commit real `.env` files or secrets.
- Rotate any credentials that were previously stored locally before pushing this repository publicly.
- This repo does not currently include deployment config for Vercel, Netlify, Render, or Docker, so hosting should be configured based on your target provider.

## Suggested Publish Flow

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Vercel Deployment

Deploy the `frontend/` directory as the Vercel project root.

- Framework preset: `Create React App`
- Root directory: `frontend`
- Build command: `yarn build`
- Output directory: `build`
- Environment variable: `REACT_APP_BACKEND_URL=<your-backend-url>`

The file `frontend/vercel.json` is included so React Router routes resolve correctly on refresh.
