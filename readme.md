# Gym Management Website

Responsive **React + TypeScript** admin website. The first backend is **Google Apps Script + a private Google Sheet**. The UI talks only to the Apps Script `/exec` URL. Google passwords, service-account JSON, and Sheet credentials never go in frontend code or GitHub.

This repo is a **new gym project only**. It does not depend on any Society Maintenance app. It is **not** an Android/APK project.

## Why this is safe to put on a public GitHub Pages site

```
Visitor / Admin browser
        │  HTTPS POST  { action, data, token }
        ▼
Google Apps Script Web App  (/exec)
        │  runs as YOUR Google account
        ▼
Private Google Sheet  (not shared publicly)
```

**Wrong:** putting Sheet API keys or service-account files in JavaScript. Anyone can View Source.

**Right:** website → Apps Script → Sheet. Keep the Sheet sharing private.

Prototype auth limitation: admin passwords are SHA-256 + salt inside Apps Script (not bcrypt). Change the demo password before real use. Session tokens are HMAC-signed and expire in 12 hours.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

If `VITE_GYM_API_URL` is empty, **development** uses an in-memory demo API so you can click through the UI before connecting a Sheet.

- Demo login: `admin` / `Admin@123` (local mock only, or after you run `seedDemoData` in Apps Script)
- Open http://localhost:5173
- Public enquiry: `/enquire`
- Admin: `/login` → `/dashboard`

```bash
npm test
npm run build
```

Production builds **do not** use the mock. Set `VITE_GYM_API_URL` before building for GitHub Pages.

## Frontend env

`.env.example`:

```
VITE_GYM_API_URL=
```

`.env.local` (do not commit):

```
VITE_GYM_API_URL=https://script.google.com/macros/s/XXXXX/exec
```

Optional GitHub project-pages subpath (repo `gym` → `https://USER.github.io/gym/`):

```
VITE_BASE_PATH=/gym/
```

User site `https://yourgym.github.io/` can keep the default base `/`.

## Project layout

```
gym/
├── src/                 React UI
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/        Apps Script client (no secrets)
│   ├── types/
│   ├── hooks/
│   ├── utils/           money/date tests
│   └── config/
├── apps-script/         Code.gs + setup guide
├── public/
├── dist/                production website after npm run build
└── .env.example
```

Later you can replace `src/services/appsScriptApi.ts` with Supabase/Firebase and keep the same pages.

## Google Sheet (private)

Create a **new** Sheet for this gym. Do not reuse another project's Sheet.

Tabs (created by `setupGymWorkbook()`):

| Tab | Purpose |
|---|---|
| Members | GYM001, GYM002, … |
| Payments | PAY001, PAY002, … |
| MembershipPlans | Monthly / Quarterly / Half-Yearly / Yearly |
| AdminUsers | hashed passwords only |
| Expenses | gym costs |
| Settings | gymName, INR, Asia/Kolkata, … |
| AuditLog | login, member, payment, expense |
| Enquiries | public website join form |

Exact column lists and deploy steps: [apps-script/README.md](apps-script/README.md).

You will connect the Sheet at the end (share access with the person who deploys Apps Script — usually you). The website never opens the Sheet directly.

## GitHub

Do not commit `.env.local`, passwords, private keys, or Google credentials.

```bash
git init
git add .
git commit -m "Add gym management website"
git branch -M main
git remote add origin https://github.com/YOUR_USER/gym.git
git push -u origin main
```

This folder may already be a clone of `gym`. Then skip `git init` / `git remote add`.

## GitHub Pages

1. Deploy Apps Script and put the `/exec` URL in `.env.local` as `VITE_GYM_API_URL`.
2. For a project site, set `VITE_BASE_PATH=/gym/` (repo name) when you build.
3. `npm run build`
4. Final website files are in **`dist/`** (`dist/index.html` plus assets). `public/404.html` is copied into `dist` for SPA refresh.
5. GitHub → Settings → Pages → Deploy from branch, folder `/docs` **or** use GitHub Actions to publish `dist`.

Example Actions workflow (optional): Settings → Pages → GitHub Actions, then add `.github/workflows/pages.yml` that runs `npm ci`, `npm run build`, and uploads `dist`.

`npm run preview` serves `dist` locally.

## Routes

Public: `/` `/enquire`  
Staff: `/login` `/dashboard` `/members` `/members/new` `/members/:id` `/payments` `/payments/new` `/plans` `/expenses` `/enquiries` `/reports` `/settings`

## Demo data

In Apps Script: run `seedDemoData()` then `clearDemoData()` before production. Demo rows are tagged `DEMO_DATA`.
