/**
 * WebAuthn (Face ID / Touch ID / Windows Hello) Client Helpers
 */

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks if the current browser and device support platform biometric authentication
 */
export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }

  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return isAvailable;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Detects device/browser model name for friendlier device naming
 */
export function getFriendlyDeviceName(): string {
  if (typeof navigator === "undefined") return "Thiết bị của tôi";

  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "Apple iPhone (Face ID / Touch ID)";
  if (/iPad/i.test(ua)) return "Apple iPad (Touch ID / Face ID)";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Apple Mac (Touch ID)";
  if (/Android/i.test(ua)) return "Thiết bị Android (Vân tay)";
  if (/Windows/i.test(ua)) return "Máy tính Windows (Windows Hello)";
  if (/Linux/i.test(ua)) return "Linux PC (Security Key)";
  return "Thiết bị cá nhân";
}
