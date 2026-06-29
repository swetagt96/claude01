# 🌿 PlantPal — Plant Health Check & Watering App

Upload a photo of a plant to get **identification**, a **health & pest assessment**, and a
**complete care plan** tailored to your local climate — then save it to your garden to get
**watering reminders** that sync across devices and fire in the background.

## Features

- **Photo analysis** — pluggable vision AI (OpenAI-compatible) with a rich built-in **demo
  mode** so it works with no API key. Returns species identification, a health score,
  detected issues (disease / pest / nutrient deficiency / environmental), and a full care
  plan: light, water, soil, pot, repot, fertilizer, temperature, and humidity — plus growth
  and pest-prevention tips.
- **Local-climate tailoring** — browser geolocation + [Open-Meteo](https://open-meteo.com)
  (no API key) rate climate fit and adjust the watering schedule to current conditions.
- **My Garden** — save plants with photo thumbnails, see color-coded **due / overdue**
  status, and reset the schedule with one-tap **Water now**.
- **Accounts + cross-device sync** — email/password auth (scrypt-hashed passwords, session
  tokens). The garden syncs to the backend when signed in and falls back to `localStorage`
  when logged out, migrating local plants to your account on first login.
- **Background push reminders** — service worker + Web Push (VAPID). A server-side scheduler
  sends a notification when a plant is due, even when the app is closed — de-duped to once
  per plant per day. Logged-out users get in-app reminders while the tab is open.

## Tech stack

| Layer    | Stack                                   | Location  |
| -------- | --------------------------------------- | --------- |
| Frontend | React + Vite + TypeScript               | `client/` |
| Backend  | Express + TypeScript                    | `server/` |
| Storage  | JSON file store (demo) — swap for a DB  | `server/data/` |

## Getting started

```bash
# from this directory (plant-care-app/)
npm run install:all      # installs client + server deps

npm run dev:server       # API on http://localhost:4000
npm run dev:client       # app on http://localhost:5173 (proxies /api to the server)
```

The app works **out of the box in demo mode**. The Vite dev server proxies `/api` requests
to the backend, so just open http://localhost:5173.

### Configuration (optional)

Copy `server/.env.example` to `server/.env`:

```bash
# Real AI vision identification (OpenAI or any OpenAI-compatible endpoint).
# Leave blank to use the built-in demo analyzer.
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Web Push — auto-generated and persisted on first run if left blank.
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@plantpal.example
```

## API overview

| Method & path                 | Auth | Description                                |
| ----------------------------- | ---- | ------------------------------------------ |
| `GET /api/health`             | —    | Status + mode (`ai` / `demo`)              |
| `GET /api/climate`            | —    | Current climate for a lat/lon (Open-Meteo) |
| `POST /api/analyze`           | —    | Analyze an uploaded plant photo            |
| `POST /api/auth/register`     | —    | Create an account                          |
| `POST /api/auth/login`        | —    | Sign in                                    |
| `POST /api/auth/logout`       | ✓    | Sign out                                   |
| `GET /api/auth/me`            | ✓    | Current user                               |
| `GET /api/plants`             | ✓    | List the user's saved plants               |
| `POST /api/plants`            | ✓    | Save a plant                               |
| `POST /api/plants/:id/water`  | ✓    | Mark watered, reset the schedule           |
| `PATCH /api/plants/:id`       | ✓    | Update nickname / watering frequency       |
| `DELETE /api/plants/:id`      | ✓    | Remove a plant                             |
| `GET /api/push/public-key`    | —    | VAPID public key                           |
| `POST /api/push/subscribe`    | ✓    | Register a push subscription               |
| `POST /api/push/unsubscribe`  | ✓    | Remove a push subscription                 |

## Known limitations

- Demo mode returns realistic sample data from a small plant library until an
  `OPENAI_API_KEY` is provided (the vision pipeline is fully wired).
- The JSON file store is intended for demo scale; use a real database for production.
- Background push requires the app to have been opened once (to register the service
  worker and subscribe) and to run over HTTPS or `localhost`.

> PlantPal gives general horticultural guidance and is not a substitute for professional advice.
