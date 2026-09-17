const TABLE_GUEST_SECRET = 'smart-restaurant-guest-v1';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function fallbackSignPayload(payload: string): string {
  let hash = 2166136261;
  const mixed = `${payload}.${TABLE_GUEST_SECRET}`;

  for (let i = 0; i < mixed.length; i += 1) {
    hash ^= mixed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

async function signPayload(payload: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    return fallbackSignPayload(payload);
  }

  try {
    const cryptoKey = await subtle.importKey(
      'raw',
      textEncoder.encode(TABLE_GUEST_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await subtle.sign('HMAC', cryptoKey, textEncoder.encode(payload));
    return toBase64Url(new Uint8Array(signature));
  } catch {
    return fallbackSignPayload(payload);
  }
}

export async function createTableGuestToken(tableId: string, tableNumber: string): Promise<string> {
  const payload = JSON.stringify({
    tableId,
    tableNumber,
    scope: 'guest-table-access',
    issuedAt: Date.now(),
  });

  const encodedPayload = toBase64Url(textEncoder.encode(payload));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyTableGuestToken(token: string, tableId: string): Promise<boolean> {
  if (!token || !tableId) return false;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;

  try {
    const payloadBytes = fromBase64Url(encodedPayload);
    const payload = JSON.parse(textDecoder.decode(payloadBytes)) as {
      tableId?: string;
      tableNumber?: string;
      scope?: string;
      issuedAt?: number;
    };

    if (payload.tableId !== tableId) return false;
    if (payload.scope !== 'guest-table-access') return false;
    if (!payload.issuedAt || Number.isNaN(payload.issuedAt)) return false;

    const expectedSignature = await signPayload(encodedPayload);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

export function isLocalDevGuestAccessAllowed(hostname?: string): boolean {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '') ?? '').toLowerCase();

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host === ''
  );
}

export async function createGuestTableUrl(baseUrl: string, tableId: string, tableNumber: string): Promise<string> {
  const token = await createTableGuestToken(tableId, tableNumber);
  return `${baseUrl}/table/${tableNumber}?t=${encodeURIComponent(token)}`;
}
