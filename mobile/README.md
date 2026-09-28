# Cattitude — Ionic Angular Client

Clever Sailor consumer app for the Cattitude charter vessel. Web-first; Capacitor native builds come later.

**Production:** https://app.sailsupernova.com

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

Production builds use `baseHref: /`. Output is written to `mobile/www/`.

Production builds include a service worker and web app manifest for offline use and home-screen install. The service worker prefetches the app shell and images.

To test the PWA locally:

```bash
npx serve www -p 8100
```

`ng serve` does not register the service worker (development mode only).

**Installed PWA vs browser:** The home-screen app uses the service worker cache. After a deploy, the browser tab usually picks up updates on refresh; the installed icon may lag until the new service worker activates (close all app windows and reopen, or wait for the next visit). A user-visible “update available” prompt is deferred until native App Store builds.

## Vessel guide content

**Source of truth:** Postgres via the admin portal — generate, review, approve, and publish at http://localhost:8000/admin/ (see [`backend/README.md`](../backend/README.md)). Curated standard content lives in [`backend/content/`](../backend/content/README.md).

Every vessel, including Cattitude, loads its guide from `GET /api/v1/vessels/{slug}/guide/*` into IndexedDB, and uses that cache if a later refresh fails. Publish from admin. There is no bundled guide JSON.

The `ui` block can also be maintained in `utilities/bootstrap_ui.json` and merged:

```bash
node ../utilities/embed_bootstrap_ui.mjs
```

Images live under `src/assets/images/vessels/{slug}/systems/` (e.g. `vessels/cattitude/systems/`). Push `mobile/` changes to trigger a Pages deploy.

### Multi-vessel routes

The app shell is vessel-agnostic. Open a guide at:

- `http://localhost:8100/v/cattitude/tabs/home` (dev)
- `https://app.sailsupernova.com/v/cattitude/tabs/home` (production)

`/tabs/…` URLs redirect to `/v/cattitude/tabs/…` for backward compatibility. The site root redirects to the default vessel (`cattitude`). Add/switch-vessel UI is not built yet.

**Planned:** per-user guide overlays (personal notes and step edits) apply on top of the downloaded publication — see [`cursor-build-user-overlays.md`](../cursor-build-user-overlays.md). Do not mutate the cached publication JSON; preserve stable `key` fields on fix cards when extending the bootstrap contract.

`utilities/extract_bootstrap_content.mjs` is legacy-only (one-time migration from `app/index.html`).

Regenerate PWA install icons from the hero logo (from repo root or `mobile/`):

```bash
python ../utilities/generate_pwa_icons.py
```

## Environment

| File | Purpose |
|------|---------|
| `src/environments/environment.ts` | Local API URL |
| `src/environments/environment.prod.ts` | Railway production API |

## Project layout

```
src/app/
  core/
    models/       # BootstrapContent, Postgres enum mirrors
    services/     # ContentService, GuideSyncService, GuideStoreService,
                  # GuideLoadService, ChatService, ProgressService,
                  # VesselContextService, VesselResolverService, EmergencyService
    initializers/ # App bootstrap (loads guide at startup)
  pages/          # Home, Do, Know, Fix, Ask, vessel-error
  shared/         # Header, emergency modal, photo lightbox, rich HTML
  tabs/           # Tab shell + routing
src/environments/     # apiUrl, defaultVesselSlug, skipUrl
```
