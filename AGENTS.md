# Repository Guidelines

## Project Structure & Module Organization

TeamOps is a monorepo with two independent Node.js packages:

- **`teamops-backend/`** — Express 5 REST API + Socket.io server. All Mongoose models and formatter helpers live in a single file: `models/index.js`. Routes map to `controllers/`, and real-time events are handled in `socket/index.js`. The server auto-seeds MongoDB on first start if no data exists.
- **`teamops-frontend/`** — React 19 + Vite SPA. Pages live in `src/views/`, backend calls are centralised in `src/services/api.js` (which falls back to `src/services/mockData.js` when the backend is unreachable), and the Socket.io client is a singleton in `src/services/socket.js`.

The backend uses **MongoDB via Mongoose** (not PostgreSQL — `db/init.sql` is unused). All model definitions and their JSON formatters (`formatUser`, `formatCard`, etc.) are co-located in `models/index.js`.

## Build, Test, and Development Commands

**Backend** (from `teamops-backend/`):
```bash
npm install
npm run dev       # nodemon server.js — auto-restarts on changes
npm start         # node server.js — production
```

**Frontend** (from `teamops-frontend/`):
```bash
npm install
npm run dev       # Vite dev server → http://localhost:5173
npm run lint      # ESLint check
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
```

No test suite is configured (`npm test` exits with an error in both packages).

## Coding Style & Naming Conventions

- **Backend**: CommonJS (`require`/`module.exports`). No linter configured — follow the existing style (2-space indent, single quotes, `camelCase` identifiers, `snake_case` for JSON response keys via formatter functions).
- **Frontend**: ES Modules (`import`/`export`). ESLint enforced with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`. Rule: `no-unused-vars` ignores symbols matching `^[A-Z_]`.
- JSON responses use `snake_case` keys (enforced by the `format*` helpers in `models/index.js`).

## Environment Variables

**Backend** (`.env` in `teamops-backend/`):
| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/teamops` | MongoDB connection |
| `JWT_SECRET` | — | JWT signing secret |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `PORT` | `5000` | HTTP port |

**Frontend** (`.env` or `.env.local` in `teamops-frontend/`):
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:5000/api`) |
| `VITE_SOCKET_URL` | Socket.io server URL (e.g. `http://localhost:5000`) |

## Seed Data

On first start, `seedDatabase()` creates four users (password `123456` for all):
- `zainab@teamops.dev`, `ahmed@teamops.dev`, `zunairah@teamops.dev`, `hassan@teamops.dev`

## Socket Events

Backend emits / frontend listens on: `card:moved`, `activity:new`, `notification:new`. Frontend emits `board:join` and `board:leave` to subscribe to a board room.

## Commit Guidelines

Imperative, sentence-cased subject lines observed in history:
```
Implement TeamOps auth and board updates
Add render.yaml defining backend and frontend services
```

## Deployment

`render.yaml` at the repo root defines a Render.com deploy: backend as a **web service** and frontend as a **static site**. Build commands pull from each sub-directory.
