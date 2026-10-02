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

**2026-10-02 14:02 -05:00**

Status of both reviews after commit `084a8c59` ("feat(app): share one shell, tokens, and night theme") and the uncommitted working tree. The 09:03 note reviewed `6c49526` only. This pass read the diff since that commit and did not re-open files the diff does not touch. Notification-bridge and settings unit tests were 8/8. No new `tsc` run for this note.

Architecture review (07:10). Future passes can skip the complete items and stay on 3, 6, and 8.

Complete:

- 1 (Critical, blank first paint). Unchanged. `content.service.ts` only moved the "Guide updated" and schema toasts to `position: 'bottom'` through `liveToast`. The IndexedDB-first paint and the 5 s `timeout` were not in this diff.
- 2 (High, tenant/host map). Unchanged. No diff in `host-defaults.ts` or `VesselResolverService`.
- 4 (Medium, service-worker updates and schema version). Unchanged. `AppUpdateService` was not in this diff.
- 5 (Medium, Skip submodule in CI). Still removed. The leftover Settings sentences ("does not require Skip", "no Skip needed") are gone with the rest of the developer copy. `settings.page.spec.ts` asserts the page text does not contain `Skip`, `generator.js`, `Cloudflare`, or `hoeken`.
- 7 (Medium, duplicated guide loading). Unchanged. The guard is still the only loader.
- 9 (Low, vessel-image prefetch). Unchanged. `PreloadAllModules` is still set in `app-routing.module.ts`; the only routing edit is the legacy `/tabs/sail` redirect, which now lands on `/tabs/sail` instead of `/tabs/more/sail`.
- 10 (Low, `navigationUrls`). Unchanged. `ngsw-config.json` was not in this diff.

Partial:

- 3 (High, root-level side effects). Signal K half is unchanged: `DEFAULT_SIGNALK_URL` is still `https://sailsupernova.com`, `SignalKService` still connects from its constructor to `/signalk/v1/stream?subscribe=all` with unbounded reconnect, and `AppComponent` still starts that connection for every user. Those files were not in this diff. Notification half moved forward: permission is still requested only from Settings, and the in-app fallback is no longer a 6 s toast at `position: 'top'`. `AlarmBannerService` shows a dismiss-only banner (`role="alert"`, `aria-live="assertive"`) with Open Anchorage or Open Polar. A device notification is still scheduled only when permission is already granted. Remaining: source the Signal K URL from the published guide, or leave it empty until the user opts in, and connect only while a live-data screen is open or a Live data setting is on.
- 8 (Low, dead scaffold and deprecated APIs). Unchanged. `main.ts` still bootstraps `AppModule` with `platformBrowserDynamic`. The standalone migration is still only a comment.

Open:

- 6 (Medium, GitHub Pages deep links). Unchanged. The workflow files were not in this diff, so the deploy still copies `index.html` to `404.html` and the verify step still expects HTTP 404 with the shell.

UI/UX review (08:26). Numbered in the order the findings appear in that note. Future passes can skip the complete items.

Complete:

- 1 (Polar, Anchorage, Settings, Sail Plan, and Instruments looked like a different app). `084a8c59` put those pages on `app-header`, the shared type scale, and `app-ui-icon`. The working tree keeps that shell: Settings is grouped `ion-list` rows, Sail Plan is a heat grid, Instruments pick paths in a searchable modal.
- 2 (Header and back differed per section). One `app-header`. The back control is 44px. Know detail is the route `know/:systemId` (`KnowChapterPage`), so hardware back, swipe-back, and refresh keep the chapter. A `?system=` query redirects onto that route. The Sail tab shows the title and hides back; back shows only on `/more/sail`.
- 3 (Sail had no chrome). Sail uses `app-header` plus `ion-content`. The screen requests a screen wake lock while it is visible and lays the instruments in a row from 768px or in landscape.
- 7 (Pinch-zoom blocked). `index.html` viewport is `viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0`. `user-scalable=no` and `maximum-scale=1.0` are gone.
- 8 (`:focus-visible` missing). `global.scss` draws `--cattitude-focus-ring` on `:focus-visible`. The header and the emergency sheet set a white ring on navy.
- 9 (Reduced motion missing). `global.scss` drops the pressable transition under `prefers-reduced-motion: reduce`. Home, Ask, and Anchorage have the same query on their own motion.
- 10 (No dark or night theme). `ThemeService` and the Settings segment offer System, Light, Dark, and Night. Night keeps the app dark and shifts Sail, Polar, and Anchorage toward red.
- 11 (Shared tokens and shell header). `--cattitude-*` tokens live in `theme/variables.scss`, including `--cattitude-touch-min: 44px` and the type scale. `084a8c59` is that layer; the working tree slims the brand toolbar to 52px and ellipsizes the vessel line so it does not wrap on a 375px screen.
- 12 (Know detail was in-page state). Same as item 2: `know/:systemId`.
- 13 (Destructive resets had no confirm). Checklist and learn-lesson reset go through `confirmChecklistReset` (alert, then a 6 s undo toast). Anchorage "Clear all vessels" is in the overflow menu and confirms before `clearAll()`.
- 14 (Anchorage was a short map under toolbars). The map fills the stage. Controls and the vessel list sit in a draggable bottom sheet. The record button reads "Start anchor watch" / "Stop anchor watch". Icon buttons use `aria-label`.
- 15 (Ask did not scroll or render markdown). New messages call `scrollToBottom`. Assistant text goes through `chatMarkdownHtml` (escaped, then a small markdown subset) before `bypassSecurityTrustHtml`. Enter sends on a desktop keyboard; Shift+Enter inserts a newline; a touch keyboard does not send on Enter. Clear asks, then calls `clearHistory()`.
- 16 (Settings showed developer, tunnel, and simulator copy). Removed, including the Skip sentences from architecture item 5. Empty or invalid Signal K URLs show inline text, and section titles use `--cattitude-text-dark`.
- 17 (No tablet or desktop container). Reading pages use `ion-content.page-content`, which centers a `--cattitude-content-max: 960px` column from 768px. From 1024px the tab bar becomes a 220px rail. Polar, Instruments, Sail, and Anchorage stay full-bleed. Sail is side-by-side from 768px; Fix It chips wrap from 600px.

Partial:

- 4 (Secondary text and teal headings failed contrast). The cited light-theme colors are retokened. `--cattitude-text-light` is `#556875` (~5.1:1 on sand, ~5.8:1 on white). `--cattitude-text-accent` is `#006c78` (~6.2:1 on white). Brand teal `#00b4c8` is documented as fill-only (~2.5:1 on white) and is ~6.5:1 on the navy header. Settings and Polar section titles use `--cattitude-text-dark`. Remaining: the More live badge `.more-live.live` uses `--cattitude-green` (`#1da462`, ~3.2:1 on white).
- 5 (Body was 14px and labels were 10–11px). Body is `--cattitude-text-body` (15–16px). Captions are 12–13px. Tab labels are 12px (`0.75rem`). Fix It category pills are 12px. Remaining: `.more-live` is `0.6875rem` (11px).
- 6 (Emoji and glyph controls under 44px). Chrome controls on the changed pages use Ionicons. `resolveUiIcon` maps known guide emoji to Ionicons. The shell back, emergency Call buttons, and Home edit remove badges are 44px. Remaining: a guide emoji with no mapping still renders as the raw emoji inside `app-ui-icon`.

Open:

- None. Every 08:26 finding is complete or partial above.
