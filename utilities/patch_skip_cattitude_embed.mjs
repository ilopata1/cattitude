import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Patches upstream Skip so it can run cross-origin inside the Cattitude Sail iframe
 * (GitHub Pages host + remote Signal-K URL).
 *
 * Skip's stock design assumes same-origin with Signal-K (session cookies + /admin login).
 * That cannot work when Skip is served from ilopata1.github.io and SK is at e.g.
 * sailsupernova.com — credentials in the host Settings page also cannot fix it, because
 * Skip deliberately never accepts/stores passwords or tokens.
 *
 * This patch:
 *  - Reads ?cattitudeSkUrl= from the iframe URL
 *  - Disables proxy remapping (API/WS stay on the SK host)
 *  - Probes loginStatus on the SK origin (best-effort; usually CORS-blocked)
 *  - On host embed, skips the cookie auth wall and boots anonymous/shipped dashboards
 *  - Makes Sign-in navigate to the absolute SK /admin login (not GitHub Pages)
 */

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipRoot = path.join(repoRoot, 'skip');
function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeText(filePath, contents) {
  fs.writeFileSync(filePath, contents.replace(/\r\n/g, '\n'));
}

const AUTH_PATCH_MARKER = 'cattitudeHostSignalKOrigin';

const hostUtil = `/** Query param Cattitude's Sail tab passes when embedding Skip in an iframe. */
export const CATTITUDE_SK_URL_PARAM = 'cattitudeSkUrl';

/**
 * Signal-K server URL supplied by the Cattitude host app on the iframe URL.
 * Read once at boot — the host rewrites the iframe src when the URL changes.
 */
export function readCattitudeHostSignalKUrl(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get(CATTITUDE_SK_URL_PARAM);
    if (!raw) {
      return null;
    }
    const url = decodeURIComponent(raw).trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

/** True when Cattitude is hosting Skip with an explicit remote Signal-K URL. */
export function isCattitudeHostEmbed(): boolean {
  return readCattitudeHostSignalKUrl() !== null;
}

/** Origin of the host-provided Signal-K URL, or null. */
export function cattitudeHostSignalKOrigin(): string | null {
  const url = readCattitudeHostSignalKUrl();
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

function ensureImport(src, fromPath, symbol) {
  if (src.includes(symbol) && src.includes(fromPath)) {
    return src;
  }
  const importLine = `import { ${symbol} } from '${fromPath}';\n`;
  // Prefer inserting after an existing local-storage / util import block.
  const anchor = "from '../utils/local-storage.util';";
  const idx = src.indexOf(anchor);
  if (idx >= 0) {
    const end = src.indexOf('\n', idx) + 1;
    return src.slice(0, end) + importLine + src.slice(end);
  }
  const firstImport = src.indexOf('import ');
  if (firstImport >= 0) {
    return src.slice(0, firstImport) + importLine + src.slice(firstImport);
  }
  return importLine + src;
}

function patchAppInitNetwork() {
  const filePath = path.join(skipRoot, 'src/app/core/services/app-initNetwork.service.ts');
  let src = readText(filePath);

  if (!src.includes('readCattitudeHostSignalKUrl')) {
    src = src.replace(
      "import { getLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';",
      "import { getLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';\nimport { isCattitudeHostEmbed, readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
    );

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
  } else if (!src.includes('isCattitudeHostEmbed')) {
    src = src.replace(
      "import { readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
      "import { isCattitudeHostEmbed, readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
    );
  }

  // Do not force same-origin proxy when hosted by Cattitude (cross-origin SK URL).
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
        // Cattitude embeds Skip on a different origin (e.g. GitHub Pages) than Signal-K, so
        // proxy remapping would hit the Pages host instead of the boat — connect directly.
        const useProxyForSk = !isCattitudeHostEmbed();
        await this.connection.initializeConnection(
          {url: this.config.signalKUrl, new: false},
          useProxyForSk,
          embedOrEphemeral ? true : (profileDemand ?? true)
        );`,
    );
  }

  // Cross-origin host embed cannot establish a same-origin SK session cookie. Prefer anonymous
  // shipped dashboards over a Sign-in wall that navigates to the wrong origin.
  if (!src.includes('Cattitude host embed:')) {
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
    // Cattitude host embed: Skip is on a different origin than Signal-K, so the SK session
    // cookie cannot authenticate this page. Boot anonymous/shipped dashboards with a direct
    // WebSocket to the host-provided URL instead of a broken same-origin Sign-in redirect.
    if (isCattitudeHostEmbed()) {
      console.log('[AppInit Network Service] Cattitude host embed: using anonymous instrument mode (no same-origin SK session).');
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
  if (src.includes(AUTH_PATCH_MARKER) && src.includes('Prefer the host-provided Signal-K origin')) {
    console.log('authentication.service.ts already patched');
    return;
  }

  src = src.replace(
    `import { distinctUntilChanged, map } from "rxjs/operators";`,
    `import { distinctUntilChanged, map } from "rxjs/operators";\nimport { cattitudeHostSignalKOrigin } from '../utils/cattitude-host.util';`,
  );

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
  if (src.includes('cattitudeHostSignalKOrigin')) {
    console.log('sso-redirect.service.ts already patched');
    return;
  }

  src = src.replace(
    `import { SSO_REDIRECT_BUDGET_KEY } from '../constants/config-storage.const';`,
    `import { SSO_REDIRECT_BUDGET_KEY } from '../constants/config-storage.const';\nimport { cattitudeHostSignalKOrigin } from '../utils/cattitude-host.util';`,
  );

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
    // Relative /admin or OIDC paths resolve against the Pages origin and 404. When Cattitude
    // hosts Skip, prefix with the Signal-K origin so Sign-in opens the boat's admin UI.
    const skOrigin = cattitudeHostSignalKOrigin();
    if (skOrigin && loginUrl.startsWith('/')) {
      return skOrigin + loginUrl;
    }
    return loginUrl;
  }`,
  );

  writeText(filePath, src);
  console.log('Patched sso-redirect.service.ts');
}

writeHostUtil();
patchAppInitNetwork();
patchSettingsService();
patchAuthenticationService();
patchSsoRedirectService();
console.log('Skip Cattitude embed patch complete');
