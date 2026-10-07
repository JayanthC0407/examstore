# ExamStore

Previous-year question papers in one place. **Students** search, preview and download papers; **admins** upload and manage them. Both sides live in one web app, and the role on your account decides what you see.

**Live site:** https://examstore.onrender.com

> Hosted on Render's free plan: after 15 minutes without visitors the site sleeps, so the first visit can take 30–60 seconds to load.

## Screenshots

*Shown with sample data.*

### For students

![Home page with search, stats and departments](docs/screenshots/home.webp)

| Browse and filter | Read a paper in the browser |
|---|---|
| ![Browsing CSE papers with filters](docs/screenshots/browse.webp) | ![Paper page with the built-in PDF viewer](docs/screenshots/paper.webp) |

### For admins

| Dashboard | Upload a paper |
|---|---|
| ![Admin dashboard with stats, recent uploads and most downloaded](docs/screenshots/admin-overview.webp) | ![Upload form with a PDF attached and details filled in](docs/screenshots/admin-upload.webp) |

![Managing papers: search, edit and delete](docs/screenshots/admin-papers.webp)

### Dark mode and mobile

![Search results in dark mode](docs/screenshots/browse-dark.webp)

<p align="center">
  <img src="docs/screenshots/mobile-home.webp" alt="Home page on a phone" width="260" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-paper.webp" alt="Reading a paper on a phone" width="260" />
</p>

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. (In development, port 5000 is only the API; visiting it redirects to 5173.)

- With no `MONGODB_URI` set, the backend starts a local MongoDB automatically and keeps its data in `backend/.data/`. **The first run downloads MongoDB (~600 MB on Windows)**, which takes a few minutes once. To skip that, set `MONGODB_URI` in `backend/.env` to a local MongoDB or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
- Uploaded PDFs are stored in `backend/uploads/`.

## Becoming an admin

Any of these works:

1. Put the email in `ADMIN_EMAILS` in `backend/.env` (comma-separated). That account becomes admin when it signs up or logs in.
2. Promote an existing account from the terminal:
   ```bash
   npm run make-admin -- someone@student.nitw.ac.in
   npm run make-admin -- someone@student.nitw.ac.in --revoke
   ```
3. An existing admin can use **Admin → Users → Make admin**.

## What's inside

| | Students | Admins |
|---|---|---|
| Browse and search by subject, code or year | ✓ (no sign-in needed) | ✓ |
| Filter by department, semester, year, exam type | ✓ | ✓ |
| Preview PDF in the browser and download | ✓ (signed in) | ✓ |
| Upload papers (drag and drop, subject autocomplete, duplicate detection) | | ✓ |
| Edit details, replace the PDF, delete | | ✓ |
| Dashboard (papers, downloads, users, most downloaded) | | ✓ |
| Grant or revoke admin access | | ✓ |

Only emails on `ALLOWED_EMAIL_DOMAINS` (default `student.nitw.ac.in`) can sign up, except those listed in `ADMIN_EMAILS`.

## Project layout

```
backend/            Express 5 + Mongoose API
  src/config/       env loading, catalogue (departments, exam types)
  src/models/       User, Paper
  src/routes/       auth, papers, admin, meta
  src/lib/          db (with local fallback), storage (local disk / Cloudinary)
  src/scripts/      make-admin
frontend/           React 19 + Vite + Tailwind CSS 4
  src/pages/        Home, Browse, PaperDetail, Auth, Account, admin/*
  src/components/   Header, Layout, PaperCard, ui primitives
  src/store/        auth + catalogue state (zustand)
```

To add a department or exam type, edit `backend/src/config/catalog.js`. The UI picks it up automatically.

## API

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout` | public |
| GET / PATCH | `/api/auth/me` · POST `/api/auth/me/password` | signed in |
| GET | `/api/meta` (departments, years, stats) | public |
| GET | `/api/papers?q&department&semester&year&examType&sort&page` | public |
| GET | `/api/papers/:id` | public |
| GET | `/api/papers/:id/file[?download=1]` | signed in |
| POST / PATCH / DELETE | `/api/papers[/:id]` (multipart field `file`) | admin |
| GET | `/api/admin/stats`, `/api/admin/users`, `/api/admin/subjects` | admin |
| PATCH | `/api/admin/users/:id/role` | admin |

## Deploying

The backend serves the built frontend, so production is one service on one port:

```bash
npm install
npm run build
NODE_ENV=production npm start
```

Set these environment variables on your host (Render, Railway, a VPS, …):

- `MONGODB_URI`: required in production
- `JWT_SECRET`: required; a long random string
- `ADMIN_EMAILS`, `ALLOWED_EMAIL_DOMAINS`: as above
- `STORAGE_DRIVER=cloudinary` plus the `CLOUDINARY_*` keys: PDFs are stored as private files in Cloudinary, since most hosts' disks aren't persistent. Students never get a direct Cloudinary link; files are streamed through the backend after the sign-in check. Each paper remembers where its file is stored, so switching drivers later is safe.

See `backend/.env.example` for every option.
