# Review notes

**2026-10-02 07:10 -05:00**

Architecture review of the Clever Sailor PWA (`mobile/`, Ionic 8 / Angular 20, Angular service worker, GitHub Pages). Mapped the boot sequence (inline host redirect → `APP_INITIALIZER` guide sync → root Signal K/notification services), the `/v/:slug/tabs/*` routing with legacy redirects, the IndexedDB-backed publication sync, and the CI deploy. Ten findings: one Critical (first render blocks on a network manifest fetch with no timeout, risking a blank screen on flaky marina connections despite a cached guide), two High (hard-coded host/vessel redirects in three layers making Cattitude unreachable on prod; every user auto-connects a WebSocket to one hard-coded boat), four Medium (no SW update handling, CI builds/patches an unused Skip submodule, deep links depend on Pages 404 fallback, duplicated guide-load logic), and three Low (dead scaffold code/deprecated APIs, 3 MB vessel images prefetched by SW, over-broad `navigationUrls`). Recommended priorities: cache-first boot with timeout, centralise tenant/host config, gate live connections behind the vessel guide or user opt-in, add `SwUpdate` handling, and drop the Skip build from CI.

**2026-10-02 08:26 -05:00**

UI/UX review. Clever Sailor's production PWA (`mobile/`) has an attractive brand palette and a well-considered content model, but the experience is fragmented: branded pages and stock-Ionic pages (Polar, Anchorage, Settings, Sail Plan, Instruments) look like different apps, the header and back-navigation patterns differ per section, and the Sail screen has no chrome at all. Accessibility and ergonomics need attention — secondary text and teal headings fail WCAG contrast, body text is 14px with 10–11px labels, many controls are bare emoji/glyph buttons under 44px, pinch-zoom is disabled, and there is no `:focus-visible`, reduced-motion, or dark/night mode. Priority work: a unified design-token layer and shell header, route-based detail navigation in Know, a confirm on destructive resets (checklist, anchorage clear), a map-first Anchorage layout with a bottom sheet, chat auto-scroll and markdown rendering in Ask, removal of developer copy from Settings, and responsive containers for tablet and desktop.

**2026-10-02 09:03 -05:00**

Status of the architecture review (07:10) after commit `6c49526` ("fix(app): partially address the 2026-10-02 architecture review"). Scope of this check: the diff of that commit only, plus a `tsc --noEmit` of `mobile/` (clean). Karma tests were not run. Future architecture reviews can skip the items marked Addressed and focus on items 3, 6 and 8.

Addressed:

- 1 (Critical, blank first paint on a hung manifest fetch). `ContentService.loadBootstrapContent` now paints the IndexedDB guide first and runs `revalidateGuide` in the background; `GuideSyncService.ensureGuide` is wrapped in `timeout(5000)` with an `AbortController` that cancels in-flight `HttpClient` requests; a "Guide updated" toast fires when the hash changes; `TimeoutError` maps to the `offline` failure. With nothing cached the boot still waits on the network, but capped at 5 s.
- 2 (High, tenant/host logic in three layers). Inline `index.html` redirect and the guard's `cattitude→supernova` branch are gone. `environments/host-defaults.ts` (`HOST_DEFAULT_SLUGS`) is the single host→slug map and `VesselResolverService.defaultSlug()` its only reader; `app-routing.module.ts` legacy redirects and `VesselContextService` go through the resolver. `/v/cattitude` is no longer rewritten on `app.sailsupernova.com`.
- 4 (Medium, no SW update strategy). New `AppUpdateService`: `checkForUpdate()` on start, `visibilitychange` and `resume`; `VERSION_READY` → alert → `activateUpdate()` + reload. Registration is `registerImmediately`. `schemaVersion` added to the bundle (`BOOTSTRAP_SCHEMA_VERSION` in `backend/guide_bootstrap.py` and `mobile/.../bootstrap-schema.ts`), checked at publish, surfaced in the manifest, and enforced in the shell with a `schema` failure state on the vessel-error page.
- 5 (Medium, CI builds/patches unused Skip submodule). Skip build/copy steps, `.gitmodules`, the `skip` submodule, `utilities/patch_skip_cattitude_embed.mjs`, `SkipBridgeService` and `environment.skipUrl` are all removed. Leftover: two sentences of Skip copy on the Settings page ("does not require Skip", "no Skip needed") — cosmetic, overlaps the UI/UX item on developer copy.
- 7 (Medium, duplicated guide loading). `appInitializer` is reduced to fire-and-forget `SailPlanService`/`InstrumentMapService.ensureLoaded()`; `vesselGuideGuard` is the single owner of resolve/load/error.
- 9 (Low, 3 MB vessel images prefetched). The 48 images under `mobile/src/assets/images/vessels/` are deleted and the backend reads/writes only `backend/data/guide_assets`; the `content` asset group is `installMode`/`updateMode: lazy`; budgets are 1.5 MB warn / 2.5 MB error. `PreloadAllModules` (cited in the finding, not in the fix) is unchanged.
- 10 (Low, over-broad `navigationUrls`). Narrowed to `/v/**`, `/tabs`, `/tabs/**`, `/`, with `!/@halos-org/**` added.

Partially addressed:

- 3 (High, root-level side effects). Notification half done: permission is now requested only from the Settings "Allow device notifications" button (`NotificationBridgeService.allowFromUserGesture`), a `NotificationPreferenceService` toggle gates delivery, denied/unsupported falls back to an in-app toast, and `CurrentSailService` no longer calls `requestPermission`. Signal K half not done: `SignalKSettingsService.DEFAULT_SIGNALK_URL` is still `https://sailsupernova.com`, `SignalKService` still auto-connects in its constructor with `subscribe=all` and unbounded reconnect regardless of `vesselSlug`, and `AppComponent` still starts the bridge for every user. Remaining: source the URL from the published guide (or leave empty until opted in) and connect only while a live-data page is active or a "Live data" setting is on.
- 8 (Low, dead scaffold and deprecated APIs). `src/app/home/` deleted; `HttpClientModule` replaced with `provideHttpClient(withFetch())`. `main.ts` still bootstraps `AppModule` via `platformBrowserDynamic`; the standalone migration is only noted in a comment.

Not addressed:

- 6 (Medium, deep links via GitHub Pages 404). The workflow still copies `index.html` to `404.html` and the verify step still asserts the deep link returns HTTP 404 with the shell.

UI/UX review (08:26): not targeted by this commit. The only Settings change is the new Notifications section; all UI/UX items remain open.
