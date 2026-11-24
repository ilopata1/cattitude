/**
 * Signal K device access requests. A device asks once, the skipper approves it in the
 * Signal K admin under Security > Access Requests, and the device collects its own token.
 */

export type AccessState = 'idle' | 'pending' | 'approved' | 'denied' | 'error';

export interface AccessOutcome {
  state: AccessState;
  /** Where to poll while pending, relative to the server. */
  href?: string;
  token?: string;
  message?: string;
}

/** Body for POST /signalk/v1/access/requests. */
export function accessRequestBody(clientId: string, description: string): {
  clientId: string;
  description: string;
  permissions: 'readwrite';
} {
  const name = description.trim().slice(0, 80) || 'Clever Sailor app';
  return { clientId, description: name, permissions: 'readwrite' };
}

/**
 * Read a reply from the request POST or from polling its href.
 * Signal K answers PENDING with an href, then COMPLETED with
 * accessRequest.permission APPROVED (and a token) or DENIED.
 */
export function parseAccessReply(raw: unknown): AccessOutcome {
  if (!raw || typeof raw !== 'object') {
    return { state: 'error', message: 'The boat server sent an empty reply.' };
  }
  const body = raw as {
    state?: string;
    href?: string;
    statusCode?: number;
    message?: string;
    accessRequest?: { permission?: string; token?: string };
  };
  const state = String(body.state ?? '').toUpperCase();
  if (state === 'PENDING') {
    return { state: 'pending', href: typeof body.href === 'string' ? body.href : undefined };
  }
  if (state === 'COMPLETED') {
    const permission = String(body.accessRequest?.permission ?? '').toUpperCase();
    const token = body.accessRequest?.token;
    if (permission === 'APPROVED' && typeof token === 'string' && token) {
      return { state: 'approved', token };
    }
    if (permission === 'DENIED') {
      return { state: 'denied', message: 'The request was turned down on the boat.' };
    }
    return { state: 'error', message: body.message || 'The boat server did not issue a token.' };
  }
  return { state: 'error', message: body.message || 'The boat server did not take the request.' };
}

/** A stable random id for this device, so Signal K lists it once. */
export function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/** A name the skipper will recognise in the Signal K admin list. */
export function defaultDeviceName(userAgent: string): string {
  const ua = userAgent || '';
  const kind = /iPad/.test(ua) ? 'iPad'
    : /iPhone/.test(ua) ? 'iPhone'
      : /Android/.test(ua) ? 'Android'
        : /Windows/.test(ua) ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
            : 'device';
  return `Clever Sailor on ${kind}`;
}
