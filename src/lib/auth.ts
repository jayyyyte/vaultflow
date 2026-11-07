const DEFAULT_PIN = "123456";
export const COOKIE_NAME = "pfm_session";

export function getExpectedPin(): string {
  return process.env.VERCEL_APP_PIN || process.env.APP_PIN || DEFAULT_PIN;
}

export function isDefaultPinInUse(): boolean {
  return !process.env.VERCEL_APP_PIN && !process.env.APP_PIN;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "vaultflow-super-secret-key-change-in-prod-2026";
}

// Convert string to Uint8Array BufferSource
function strToBuf(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

// Base64URL encode/decode helpers
function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): BufferSource {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes as unknown as BufferSource;
}

function decodeBase64UrlToStr(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

// Sign payload with HMAC-SHA256 using Web Crypto API
async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    strToBuf(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, strToBuf(payload));
  return toBase64Url(signature as ArrayBuffer);
}

// Verify signature
async function verifySignature(payload: string, signatureUrl: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      strToBuf(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureBytes = fromBase64Url(signatureUrl);
    return await crypto.subtle.verify("HMAC", key, signatureBytes, strToBuf(payload));
  } catch {
    return false;
  }
}

export interface SessionData {
  auth: boolean;
  iat: number;
  exp: number;
}

/**
 * Creates a signed JWT-like session token: base64(payload).signature
 */
export async function createSessionToken(): Promise<string> {
  const secret = getAuthSecret();
  const payload: SessionData = {
    auth: true,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  const payloadStr = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(payloadStr);
  const payloadBase64 = toBase64Url(encoded.buffer as ArrayBuffer);
  const signature = await signPayload(payloadBase64, secret);

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies the session token
 */
export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadBase64, signature] = parts;
  const secret = getAuthSecret();

  const isValid = await verifySignature(payloadBase64, signature, secret);
  if (!isValid) return false;

  try {
    const payloadStr = decodeBase64UrlToStr(payloadBase64);
    const data = JSON.parse(payloadStr) as SessionData;

    if (!data.auth || data.exp < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates the user submitted PIN against the configured app PIN
 */
export function verifyPin(enteredPin: string): boolean {
  const expectedPin = getExpectedPin();
  return enteredPin.trim() === expectedPin.trim();
}

/**
 * Creates an HMAC-SHA256 hash of a PIN using the auth secret
 */
export async function hashPin(pin: string): Promise<string> {
  const secret = getAuthSecret();
  return await signPayload(`vaultflow-pin:${pin.trim()}`, secret);
}

/**
 * Verifies a PIN against a previously generated HMAC-SHA256 hash
 */
export async function verifyPinHash(pin: string, expectedHash: string): Promise<boolean> {
  const secret = getAuthSecret();
  return await verifySignature(`vaultflow-pin:${pin.trim()}`, expectedHash, secret);
}
