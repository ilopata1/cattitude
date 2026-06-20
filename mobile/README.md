# Cattitude — Ionic Angular Client

Clever Sailor consumer app for the Cattitude charter vessel. Web-first; Capacitor native builds come later.

## Prerequisites

- Node.js 20.19+ (Angular 20 requirement; upgrade from Node 18 if needed)
- Backend running locally for the Ask tab (`cd backend && uvicorn main:app --reload --port 8000`)

## Development

```bash
cd mobile
npm install
npm start
```

Open http://localhost:8100

## Production build

```bash
npm run build
```

Production builds use `baseHref: /cattitude/` for GitHub Pages at https://ilopata1.github.io/cattitude/.

Output is written to `mobile/www/` for static hosting (Cloudflare Pages, GitHub Pages, etc.).

Production builds include a service worker and web app manifest for offline use and home-screen install. The service worker prefetches the app shell, bootstrap JSON, and images; Ask tab API calls use network-first caching.

To test the PWA locally, serve the production build over HTTPS (or localhost):

```bash
npx serve www -p 8100
```

`ng serve` does not register the service worker (development mode only).

## Bootstrap content

Vessel content is extracted from the legacy PWA:

```bash
node ../utilities/extract_bootstrap_content.mjs
```

This writes:

- `src/data/bootstrap/cattitude.json`
- `src/assets/images/systems/*`

Re-run after editing `app/index.html` until the Ionic app is the source of truth.

## Environment

| File | Purpose |
|------|---------|
| `src/environments/environment.ts` | Local API URL |
| `src/environments/environment.prod.ts` | Railway production API |

## Project layout

```
src/app/
  core/           # Models, services, Postgres enum types
  pages/          # Home, Do, Know, Fix, Ask tabs
  shared/         # Header + emergency modal
  tabs/           # Tab shell
```
