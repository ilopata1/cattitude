# Cattitude — Ionic Angular Client

Clever Sailor consumer app for the Cattitude charter vessel. Web-first; Capacitor native builds come later.

**Production:** https://ilopata1.github.io/cattitude/

Deploys automatically on push to `main` when `mobile/**` changes (see `.github/workflows/sync-mobile-pages-live.yml`).

## Prerequisites

- Node.js 20.19+ (Angular 20 requirement)
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

Production builds use `baseHref: /cattitude/` for GitHub Pages. Output is written to `mobile/www/`.

Production builds include a service worker and web app manifest for offline use and home-screen install. The service worker prefetches the app shell, bootstrap JSON, and images.

To test the PWA locally:

```bash
npx serve www -p 8100
```

`ng serve` does not register the service worker (development mode only).

**Installed PWA vs browser:** The home-screen app uses the service worker cache. After a deploy, the browser tab usually picks up updates on refresh; the installed icon may lag until the new service worker activates (close all app windows and reopen, or wait for the next visit). A user-visible “update available” prompt is deferred until native App Store builds.

## Bootstrap content

Vessel content is edited in **`src/data/bootstrap/cattitude.json`** (systems, checklists, fixes, locations, and the `ui` section for home rules, Do menu, and Know layout).

Validate after edits:

```bash
node ../utilities/validate_bootstrap_content.mjs
```

The `ui` block can also be maintained in `utilities/bootstrap_ui.json` and merged:

```bash
node ../utilities/embed_bootstrap_ui.mjs
```

Images live under `src/assets/images/systems/`. Push `mobile/` changes to trigger a Pages deploy.

### Guide sync (optional)

The backend can serve a published guide from Postgres (`GET /api/v1/vessels/{slug}/guide/*`). To load from the API instead of the bundled JSON, set `guideSyncEnabled: true` in `src/environments/environment.ts`. The app downloads manifest + bundle + assets into IndexedDB and falls back to bundled JSON if sync fails.

Requires a local backend with migrations, seed data, and `python backend/scripts/import_cattitude_guide.py`.

`utilities/extract_bootstrap_content.mjs` is legacy-only (one-time migration from `app/index.html`).

Regenerate PWA install icons from the hero logo:

```bash
python utilities/generate_pwa_icons.py
```

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
