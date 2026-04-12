# TeamOps Frontend (Person B Scope)

This frontend implements the assigned Person B deliverables for TeamOps:

1. React frontend with login/register, dashboard, and Kanban board UI.
2. Drag-and-drop cards between columns using `dnd-kit`.
3. Socket.io client integration for real-time card updates.
4. Activity log sidebar and notification bell with live updates.
5. Deployment-ready frontend with environment-based API/socket URLs.

## Folder Highlights

- `src/views/LoginPage.jsx` and `src/views/RegisterPage.jsx`: authentication UI.
- `src/views/DashboardPage.jsx`: workspace overview screen.
- `src/views/BoardPage.jsx`: Kanban board + dnd + socket sync + activity log.
- `src/views/AppLayout.jsx`: shared navigation and notification bell.
- `src/views/NotificationsPage.jsx`: full notification history.
- `src/services/api.js`: backend API calls with mock fallback.
- `src/services/socket.js`: Socket.io client singleton.
- `src/services/mockData.js`: local demo data if backend is not running.

## Run Locally

```bash
npm install
npm run dev
```

The app starts on `http://localhost:5173` by default.

## Environment Variables

Create `.env` in the `frontend` folder.

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

If backend is unavailable, the app falls back to local mock data so you can still demo UI flows.

## Scripts

- `npm run dev` - start development server.
- `npm run lint` - run ESLint checks.
- `npm run build` - create production build.
- `npm run preview` - preview production build locally.

## Suggested Integration Contract with Person A Backend

- `POST /auth/login`
- `POST /auth/register`
- `GET /workspaces`
- `GET /boards/:boardId`
- `PATCH /boards/:boardId/cards/:cardId/move`
- `GET /notifications`
- `PATCH /notifications/read-all`

Socket events expected:

- `board:join` and `board:leave`
- `card:moved`
- `activity:new`
- `notification:new`

## Deployment (Frontend + Backend)

### Frontend (Vercel or Netlify)

1. Push repo to GitHub.
2. Import `frontend` as project root.
3. Set build command: `npm run build`.
4. Set output directory: `dist`.
5. Add env vars `VITE_API_URL` and `VITE_SOCKET_URL`.

### Backend (Render/Railway/Fly.io)

1. Deploy Express + PostgreSQL backend.
2. Enable CORS for frontend deployed domain.
3. Update frontend env vars to deployed backend URLs.
4. Re-deploy frontend.

## Status

Current frontend passes:

- `npm run lint`
- `npm run build`
