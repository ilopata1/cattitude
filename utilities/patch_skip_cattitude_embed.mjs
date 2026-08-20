import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipRoot = path.join(repoRoot, 'skip');
const marker = 'readCattitudeHostSignalKUrl';

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
`;

function writeHostUtil() {
  const utilPath = path.join(skipRoot, 'src/app/core/utils/cattitude-host.util.ts');
  fs.mkdirSync(path.dirname(utilPath), { recursive: true });
  fs.writeFileSync(utilPath, hostUtil);
  console.log(`Wrote ${path.relative(repoRoot, utilPath)}`);
}

function patchAppInitNetwork() {
  const filePath = path.join(skipRoot, 'src/app/core/services/app-initNetwork.service.ts');
  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes(marker)) {
    console.log('app-initNetwork.service.ts already patched');
    return;
  }

  src = src.replace(
    "import { getLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';",
    "import { getLocalStorageItem, setLocalStorageItem } from '../utils/local-storage.util';\nimport { readCattitudeHostSignalKUrl } from '../utils/cattitude-host.util';",
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

  fs.writeFileSync(filePath, src);
  console.log('Patched app-initNetwork.service.ts');
}

function patchSettingsService() {
  const filePath = path.join(skipRoot, 'src/app/core/services/settings.service.ts');
  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes(marker)) {
    console.log('settings.service.ts already patched');
    return;
  }

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

  fs.writeFileSync(filePath, src);
  console.log('Patched settings.service.ts');
}

writeHostUtil();
patchAppInitNetwork();
patchSettingsService();
console.log('Skip Cattitude embed patch complete');
