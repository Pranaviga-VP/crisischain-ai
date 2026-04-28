# CrisisChain

CrisisChain is a hackathon-ready emergency incident relay prototype for rapid crisis response.
It combines citizen reporting, AI-assisted triage, responder operations, and a tamper-evident audit timeline.

## Routes

- `/` landing page
- `/report` citizen report form
- `/dashboard` responder dashboard
- `/audit` chain replay and audit log

## Demo Login

- Responder password: `responder123`
- If AI credentials are missing, the app falls back to mock classification automatically.

## Features

- Landing page at `/` with mission overview and quick actions.
- Citizen report form at `/report` with optional geolocation and image upload preview.
- Anthropic Claude classification (`claude-sonnet-4-20250514`) through a backend proxy with automatic mock fallback.
- Responder dashboard at `/dashboard` with password gate (`responder123`), live queue, and status controls.
- Chain Replay / Audit Log at `/audit` with integrity verification and summary charts.
- Adapter-based persistence: localStorage by default, Firebase Firestore when enabled.

## Tech

- React + TypeScript + Vite
- Tailwind CSS (via `@tailwindcss/vite`)
- React Router
- Recharts
- Web Crypto API for SHA-256 hashing
- Express proxy server for Anthropic key protection
- localStorage or Firebase Firestore persistence (via adapter)

## Run

```bash
npm install
npm run dev
```

The `dev` script runs both the Vite client and the proxy server concurrently.

## Environment

Copy `.env.example` to `.env` and fill values as needed.

### Proxy-first AI (recommended)

```bash
ANTHROPIC_API_KEY=your_key_here
PROXY_PORT=8787
```

The frontend posts to `/api/classify`, which Vite proxies to the backend in development.

## Anthropic Setup (Optional)

Direct browser mode is supported for quick experimentation only:

```bash
VITE_ANTHROPIC_API_KEY=your_key_here
```

## Firebase Adapter Setup (Optional)

To switch from localStorage to Firestore:

```bash
VITE_USE_FIREBASE=true
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

If Firebase is disabled or incomplete, CrisisChain automatically uses localStorage. If classification fails, it falls back to local mock classification so UI flows never break.

## Deployment

This app is not fully static because AI classification goes through a backend proxy in production.

Recommended deployment layout:

- Frontend: deploy the Vite build to a static host such as Vercel or Netlify.
- Proxy: deploy `server/proxy.mjs` to a Node host such as Render, Railway, or Fly.io.
- Frontend env: set `VITE_CLASSIFIER_PROXY_URL` to the public proxy URL.

Example production env values:

```bash
VITE_CLASSIFIER_PROXY_URL=https://your-proxy.example.com/api/classify
ANTHROPIC_API_KEY=your_key_here
PROXY_PORT=8787
```

If you want, I can also convert this repo into a single-service deployment so the frontend and proxy can be hosted together.
