// Trimble Identity PKCE OAuth for SPAs.
// When running inside Connect's iframe the workspace API handles auth;
// this module is only needed for standalone / direct-URL access.

const TID_AUTH_URL = 'https://id.trimble.com/oauth/authorize';
const TID_TOKEN_URL = 'https://id.trimble.com/oauth/token';
const SCOPES = 'openid profile viewer.read viewer.write project.read';
const STORAGE_KEY = 'tc_addin_token';
const VERIFIER_KEY = 'tc_addin_pkce_verifier';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

// ---- PKCE helpers ----------------------------------------------------------

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeVerifier(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(96));
  return base64url(bytes.buffer as ArrayBuffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64url(digest);
}

// ---- Public API ------------------------------------------------------------

export async function initiateAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_TID_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_TID_REDIRECT_URI as string | undefined;
  if (!clientId || !redirectUri) {
    throw new Error('Missing VITE_TID_CLIENT_ID or VITE_TID_REDIRECT_URI in .env');
  }

  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `${TID_AUTH_URL}?${params}`;
}

export async function handleCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const clientId = import.meta.env.VITE_TID_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_TID_REDIRECT_URI as string | undefined;

  if (!code || !verifier || !clientId || !redirectUri) return;

  sessionStorage.removeItem(VERIFIER_KEY);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  });

  const res = await fetch(TID_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);

  const data: TokenResponse = await res.json();
  const stored: StoredToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000, // 1-min buffer
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  // Clean up the URL
  window.history.replaceState({}, '', window.location.pathname);
}

export function getAccessToken(): string | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored: StoredToken = JSON.parse(raw);
    return stored.expiresAt > Date.now() ? stored.accessToken : null;
  } catch {
    return null;
  }
}

export function isCallbackUrl(): boolean {
  return new URLSearchParams(window.location.search).has('code');
}

export function clearAuth(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}
