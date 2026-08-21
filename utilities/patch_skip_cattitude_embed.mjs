import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Patches upstream Skip so it can run cross-origin inside the Cattitude Sail iframe
 * (GitHub Pages host + remote Signal-K URL).
 *
 * Skip's stock design assumes same-origin with Signal-K (session cookies + /admin login).
 * That cannot work when Skip is served from ilopata1.github.io and SK is at e.g.
 * sailsupernova.com.
 *
 * Critical failure mode we fix here: when Skip thinks it is same-origin, Sign-in does
 * window.top.location.replace('/admin/#/login'), which navigates the whole Cattitude app
 * to https://ilopata1.github.io/admin (404 / ERR_CACHE_MISS) and leaves Sail stuck loading.
 */

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipRoot = path.join(repoRoot, 'skip');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeText(filePath, contents) {
  fs.writeFileSync(filePath, contents.replace(/\r\n/g, '\n'));
}

const hostUtil = `/** Query param Cattitude's Sail tab passes when embedding Skip in an iframe. */
export const CATTITUDE_SK_URL_PARAM = 'cattitudeSkUrl';
const CONNECTION_CONFIG_KEY = 'skip.connectionConfig';

/**
 * Signal-K URL from the iframe query string (preferred) or Skip's localStorage config
 * (same-origin as the Cattitude host, written by SkipBridgeService before the iframe loads).
 */
export function resolveConfiguredSignalKUrl(): string | null {
  const fromQuery = readCattitudeHostSignalKUrl();
  if (fromQuery) {
    return fromQuery;
  }
  try {
    const raw = localStorage.getItem(CONNECTION_CONFIG_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { signalKUrl?: unknown };
    const url = typeof parsed?.signalKUrl === 'string' ? parsed.signalKUrl.trim() : '';
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

/**
 * Signal-K server URL supplied by the Cattitude host app on the iframe URL.
 */
export function readCattitudeHostSignalKUrl(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get(CATTITUDE_SK_URL_PARAM);
    if (!raw) {
      return null;
    }
    // URLSearchParams already decodes; avoid double-decode throwing on stray '%'.
    const url = raw.trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

/**
 * True when the configured Signal-K server is on a different origin than this Skip page
 * (e.g. Skip on GitHub Pages, SK on sailsupernova.com). Session cookies and relative
 * /admin login cannot work in that topology.
 */
export function isCrossOriginSignalK(): boolean {
  const url = resolveConfiguredSignalKUrl();
  if (!url) {
    return false;
  }
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** @deprecated Use isCrossOriginSignalK — kept as an alias for older patch call sites. */
export function isCattitudeHostEmbed(): boolean {
  return isCrossOriginSignalK();
}

/** Origin of the configured Signal-K URL, or null. */
export function cattitudeHostSignalKOrigin(): string | null {
  const url = resolveConfiguredSignalKUrl();
  if (!url) {
    return null;
  }
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
`;

function writeHostUtil() {
  const utilPath = path.join(skipRoot, 'src/app/core/utils/cattitude-host.util.ts');
  fs.mkdirSync(path.dirname(utilPath), { recursive: true });
  writeText(utilPath, hostUtil);
  console.log(`Wrote ${path.relative(repoRoot, utilPath)}`);
}

function patchAppInitNetwork() {
  const filePath = path.join(skipRoot, 'src/app/core/services/app-initNetwork.service.ts');
  let src = readText(filePath);

  if (!src.includes('isCrossOriginSignalK')) {
    if (src.includes("from '../utils/cattitude-host.util'")) {
      src = src.replace(
        /import \{[^}]+\} from '\.\.\/utils\/cattitude-host\.util';/,
        "import { isCrossOriginSignalK, readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
      );
    } else {
      src = src.replace(
        "import { getLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';",
        "import { getLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';\nimport { isCrossOriginSignalK, readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
      );
    }
  }

  if (!src.includes('hostSkUrl ?? window.location.origin')) {
    src = src.replace(
      `  private loadLocalStorageConfig(): void {
    const stored = getLocalStorageItem(CONNECTION_CONFIG_KEY);
    const parsedConfig: IConnectionConfig | null = stored ? JSON.parse(stored) : null;

    if (!parsedConfig) {
      this.config = cloneDeep(DefaultConnectionConfig);
      this.config.signalKUrl = window.location.origin;
      console.log(\`[AppInit Network Service] Connection Configuration not found. Creating configuration using Auto-Discovery URL: \${this.config.signalKUrl}\`);
      this.setLocalStorageConfig();
    } else {
      this.config = parsedConfig;
      if (!this.config.signalKUrl) {
        this.config.signalKUrl = window.location.origin;
        this.setLocalStorageConfig();
        console.log(\`[AppInit Network Service] Config found with no server URL. Setting Auto-Discovery URL: \${this.config.signalKUrl}\`);
      }
    }`,
      `  private loadLocalStorageConfig(): void {
    const hostSkUrl = readCattitudeHostSignalKUrl();
    const stored = getLocalStorageItem(CONNECTION_CONFIG_KEY);
    const parsedConfig: IConnectionConfig | null = stored ? JSON.parse(stored) : null;

    if (!parsedConfig) {
      this.config = cloneDeep(DefaultConnectionConfig);
      this.config.signalKUrl = hostSkUrl ?? window.location.origin;
      console.log(\`[AppInit Network Service] Connection Configuration not found. Creating configuration using \${hostSkUrl ? 'host-provided' : 'Auto-Discovery'} URL: \${this.config.signalKUrl}\`);
      this.setLocalStorageConfig();
    } else {
      this.config = parsedConfig;
      if (hostSkUrl) {
        this.config.signalKUrl = hostSkUrl;
        this.setLocalStorageConfig();
        console.log(\`[AppInit Network Service] Using host-provided Signal-K URL: \${hostSkUrl}\`);
      } else if (!this.config.signalKUrl) {
        this.config.signalKUrl = window.location.origin;
        this.setLocalStorageConfig();
        console.log(\`[AppInit Network Service] Config found with no server URL. Setting Auto-Discovery URL: \${this.config.signalKUrl}\`);
      }
    }`,
    );
  }

  if (!src.includes('useProxyForSk')) {
    src = src.replace(
      `        const embedOrEphemeral = this.embedMode.embed() || this.embedMode.profile() !== null;
        const profileDemand = this.config.remoteContextDemand?.[this.config.sharedConfigName];
        await this.connection.initializeConnection(
          {url: this.config.signalKUrl, new: false},
          true,
          embedOrEphemeral ? true : (profileDemand ?? true)
        );`,
      `        const embedOrEphemeral = this.embedMode.embed() || this.embedMode.profile() !== null;
        const profileDemand = this.config.remoteContextDemand?.[this.config.sharedConfigName];
        // Stock Skip forces proxy=true so APIs stay on window.location.origin for cookies.
        // Cross-origin Cattitude embeds must talk to the boat host directly.
        const useProxyForSk = !isCrossOriginSignalK();
        await this.connection.initializeConnection(
          {url: this.config.signalKUrl, new: false},
          useProxyForSk,
          embedOrEphemeral ? true : (profileDemand ?? true)
        );`,
    );
  }

  if (!src.includes('cross-origin Signal-K')) {
    src = src.replace(
      `  private handleCookieAuth(status: ILoginStatus | null): TCookieAuthOutcome {
    if (status?.status === 'loggedIn') {
      // The budget reset is deferred to a genuinely completed bootstrap (see initNetworkServices'
      // finally), so a loggedIn -> applicationData-401 -> reauth path cannot reset-then-loop.
      return 'proceed';
    }
    if (!status) {
      // loginStatus unreachable/unparseable: fail closed — do not assume anonymous-open access.
      this._bootstrapIssue$.next({ reason: 'auth-blocked', cause: 'sign-in-required' });
      return 'auth-blocked';
    }`,
      `  private handleCookieAuth(status: ILoginStatus | null): TCookieAuthOutcome {
    if (status?.status === 'loggedIn') {
      // The budget reset is deferred to a genuinely completed bootstrap (see initNetworkServices'
      // finally), so a loggedIn -> applicationData-401 -> reauth path cannot reset-then-loop.
      return 'proceed';
    }
    // Cross-origin Signal-K (Cattitude on GitHub Pages): session cookies cannot authenticate this
    // page. Boot anonymous/shipped dashboards — never the Sign-in wall that replaces window.top
    // with /admin on the Pages origin (404 / ERR_CACHE_MISS).
    if (isCrossOriginSignalK()) {
      console.log('[AppInit Network Service] Cross-origin Signal-K: anonymous instrument mode.');
      this._bootstrapIssue$.next({ reason: 'none' });
      return 'anonymous';
    }
    if (!status) {
      // loginStatus unreachable/unparseable: fail closed — do not assume anonymous-open access.
      this._bootstrapIssue$.next({ reason: 'auth-blocked', cause: 'sign-in-required' });
      return 'auth-blocked';
    }`,
    );
  }

  writeText(filePath, src);
  console.log('Patched app-initNetwork.service.ts');
}

function patchSettingsService() {
  const filePath = path.join(skipRoot, 'src/app/core/services/settings.service.ts');
  let src = readText(filePath);

  if (!src.includes('readCattitudeHostSignalKUrl')) {
    src = src.replace(
      "import { getLocalStorageItem, isLocalStorageAvailable, removeLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';",
      "import { getLocalStorageItem, isLocalStorageAvailable, removeLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';\nimport { readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
    );

    src = src.replace(
      `    this.signalkUrl = {url: config.signalKUrl ?? '', new: false};
    this.proxyEnabled = config.proxyEnabled;`,
      `    this.signalkUrl = {url: config.signalKUrl ?? '', new: false};
    const hostSkUrl = readCattitudeHostSignalKUrl();
    if (hostSkUrl) {
      this.signalkUrl = { url: hostSkUrl, new: false };
      config.signalKUrl = hostSkUrl;
      setLocalStorageItem(LOCAL_CONFIG_KEYS.connectionConfig, JSON.stringify(config));
    }
    this.proxyEnabled = config.proxyEnabled;`,
    );

    src = src.replace(
      `    config.signalKUrl = window.location.origin;
    setLocalStorageItem(LOCAL_CONFIG_KEYS.connectionConfig, JSON.stringify(config));
    return config;
  }

  private getDefaultDashboardsConfig`,
      `    const hostSkUrl = readCattitudeHostSignalKUrl();
    config.signalKUrl = hostSkUrl ?? window.location.origin;
    setLocalStorageItem(LOCAL_CONFIG_KEYS.connectionConfig, JSON.stringify(config));
    return config;
  }

  private getDefaultDashboardsConfig`,
    );
  }

  writeText(filePath, src);
  console.log('Patched settings.service.ts');
}

function patchAuthenticationService() {
  const filePath = path.join(skipRoot, 'src/app/core/services/authentication.service.ts');
  let src = readText(filePath);
  if (src.includes('Prefer the host-provided Signal-K origin')) {
    console.log('authentication.service.ts already patched');
    return;
  }

  if (!src.includes('cattitudeHostSignalKOrigin')) {
    src = src.replace(
      `import { distinctUntilChanged, map } from "rxjs/operators";`,
      `import { distinctUntilChanged, map } from "rxjs/operators";\nimport { cattitudeHostSignalKOrigin } from '../utils/cattitude-host.util';`,
    );
  }

  src = src.replace(
    `  public async refreshLoginStatus(): Promise<ILoginStatus | null> {
    const url = window.location.origin + loginStatusPath;
    try {
      const raw = await lastValueFrom(this.http.get<ILoginStatus>(url, { withCredentials: true }).pipe(timeout(loginStatusTimeoutMs)));
      return this.applyLoginStatus(raw);`,
    `  public async refreshLoginStatus(): Promise<ILoginStatus | null> {
    // Prefer the host-provided Signal-K origin when Cattitude embeds Skip cross-origin.
    // Same-origin session cookies still will not apply; this only corrects the probe target.
    const skOrigin = cattitudeHostSignalKOrigin() ?? window.location.origin;
    const url = skOrigin + loginStatusPath;
    try {
      const raw = await lastValueFrom(this.http.get<ILoginStatus>(url, { withCredentials: true }).pipe(timeout(loginStatusTimeoutMs)));
      return this.applyLoginStatus(raw);`,
  );

  writeText(filePath, src);
  console.log('Patched authentication.service.ts');
}

function patchSsoRedirectService() {
  const filePath = path.join(skipRoot, 'src/app/core/services/sso-redirect.service.ts');
  let src = readText(filePath);

  if (!src.includes('cattitudeHostSignalKOrigin')) {
    src = src.replace(
      `import { SSO_REDIRECT_BUDGET_KEY } from '../constants/config-storage.const';`,
      `import { SSO_REDIRECT_BUDGET_KEY } from '../constants/config-storage.const';\nimport { cattitudeHostSignalKOrigin, isCrossOriginSignalK } from '../utils/cattitude-host.util';`,
    );
  } else if (!src.includes('isCrossOriginSignalK')) {
    src = src.replace(
      /import \{[^}]+\} from '\.\.\/utils\/cattitude-host\.util';/,
      "import { cattitudeHostSignalKOrigin, isCrossOriginSignalK } from '../utils/cattitude-host.util';",
    );
  }

  if (!src.includes('prefix with the Signal-K origin')) {
    src = src.replace(
      `  private resolveLoginUrl(status: ILoginStatus | null): string {
    if (status?.oidcEnabled && status.oidcLoginUrl) {
      return status.oidcLoginUrl;
    }
    return ADMIN_LOGIN_URL;
  }`,
      `  private resolveLoginUrl(status: ILoginStatus | null): string {
    let loginUrl = ADMIN_LOGIN_URL;
    if (status?.oidcEnabled && status.oidcLoginUrl) {
      loginUrl = status.oidcLoginUrl;
    }
    // Relative /admin resolves against the Pages origin and 404s. Prefix with the SK origin.
    const skOrigin = cattitudeHostSignalKOrigin();
    if (skOrigin && loginUrl.startsWith('/')) {
      return skOrigin + loginUrl;
    }
    return loginUrl;
  }`,
    );
  }

  // Hard stop: never replace window.top with a relative /admin URL when SK is cross-origin.
  if (!src.includes('Refusing cross-origin Sign-in navigation')) {
    src = src.replace(
      `  public attemptAutoRedirect(status: ILoginStatus | null): TAutoRedirectOutcome {
    // A framed SSO redirect is blocked by the login endpoint's frame-ancestors 'none' and would just
    // render broken. Do not auto-redirect (and do not spend budget) when embedded; the caller then
    // surfaces the auth-blocked recovery, whose explicit Sign in breaks out to the top window.
    if (this.isFramed()) {
      return 'framed';
    }`,
      `  public attemptAutoRedirect(status: ILoginStatus | null): TAutoRedirectOutcome {
    // Cross-origin Cattitude embed: never bounce the shell to /admin on the Pages host.
    if (isCrossOriginSignalK()) {
      console.warn('[SsoRedirect] Refusing cross-origin Sign-in navigation (auto).');
      return 'framed';
    }
    // A framed SSO redirect is blocked by the login endpoint's frame-ancestors 'none' and would just
    // render broken. Do not auto-redirect (and do not spend budget) when embedded; the caller then
    // surfaces the auth-blocked recovery, whose explicit Sign in breaks out to the top window.
    if (this.isFramed()) {
      return 'framed';
    }`,
    );

    src = src.replace(
      `  public manualSignIn(): void {
    this.resetBudget();
    this.navigate(buildLoginRedirectUrl({
      loginUrl: this.resolveLoginUrl(this.auth.loginStatusValue),
      returnTo: this.currentReturnTo(),
      noAutoLogin: true
    }));
  }`,
      `  public manualSignIn(): void {
    this.resetBudget();
    // Cross-origin: open the boat admin UI in a new tab. Never replace window.top with
    // https://<pages-host>/admin (that unloads Cattitude and yields ERR_CACHE_MISS).
    if (isCrossOriginSignalK()) {
      const loginUrl = this.resolveLoginUrl(this.auth.loginStatusValue);
      console.warn('[SsoRedirect] Refusing cross-origin Sign-in navigation (manual); opening SK admin separately.');
      try {
        window.open(loginUrl, '_blank', 'noopener,noreferrer');
      } catch {
        /* ignore */
      }
      return;
    }
    this.navigate(buildLoginRedirectUrl({
      loginUrl: this.resolveLoginUrl(this.auth.loginStatusValue),
      returnTo: this.currentReturnTo(),
      noAutoLogin: true
    }));
  }`,
    );
  }

  writeText(filePath, src);
  console.log('Patched sso-redirect.service.ts');
}

function patchAppComponent() {
  const filePath = path.join(skipRoot, 'src/app/app.component.ts');
  let src = readText(filePath);
  if (src.includes('isCrossOriginSignalK')) {
    console.log('app.component.ts already patched');
    return;
  }

  src = src.replace(
    `import { HOTKEY_KEYS, isInteractiveKeyTarget, isBlockingOverlayOpen } from './core/utils/hotkey-target.util';`,
    `import { HOTKEY_KEYS, isInteractiveKeyTarget, isBlockingOverlayOpen } from './core/utils/hotkey-target.util';\nimport { isCrossOriginSignalK } from './core/utils/cattitude-host.util';`,
  );

  src = src.replace(
    `    effect(() => {
      const issue = this.bootstrapIssue();
      if (issue.reason !== 'auth-blocked' || this.authBlockedPromptShown) {
        return;
      }
      this.authBlockedPromptShown = true;`,
    `    effect(() => {
      const issue = this.bootstrapIssue();
      // Cross-origin Cattitude embed cannot establish an SK session cookie on this origin.
      if (issue.reason !== 'auth-blocked' || this.authBlockedPromptShown || isCrossOriginSignalK()) {
        return;
      }
      this.authBlockedPromptShown = true;`,
  );

  writeText(filePath, src);
  console.log('Patched app.component.ts');
}

writeHostUtil();
patchAppInitNetwork();
patchSettingsService();
patchAuthenticationService();
patchSsoRedirectService();
patchAppComponent();
console.log('Skip Cattitude embed patch complete');
