"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth";

export interface BiometricDevice {
  id: string; // Credential ID (base64url)
  deviceName: string;
  createdAt: number;
}

interface StoredBiometricCredential extends BiometricDevice {
  rawId?: string;
  type?: string;
}

const SETTING_KEY_BIOMETRIC_DEVICES = "biometric_credentials";
const SETTING_KEY_BIOMETRIC_CHALLENGE = "biometric_current_challenge";

function generateRandomChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Returns list of registered biometric devices and overall status
 */
export async function getBiometricStatus(): Promise<{
  isEnabled: boolean;
  devices: BiometricDevice[];
}> {
  try {
    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTING_KEY_BIOMETRIC_DEVICES));

    if (!stored || !stored.value) {
      return { isEnabled: false, devices: [] };
    }

    const devices: StoredBiometricCredential[] = JSON.parse(stored.value);
    return {
      isEnabled: devices.length > 0,
      devices: devices.map(({ id, deviceName, createdAt }) => ({
        id,
        deviceName,
        createdAt,
      })),
    };
  } catch {
    return { isEnabled: false, devices: [] };
  }
}

/**
 * Generates registration options for navigator.credentials.create()
 */
export async function generateBiometricRegisterOptions(): Promise<{
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
}> {
  const challenge = generateRandomChallenge();

  // Save active challenge for verification
  await db
    .insert(settings)
    .values({
      key: SETTING_KEY_BIOMETRIC_CHALLENGE,
      value: JSON.stringify({ challenge, timestamp: Date.now() }),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: JSON.stringify({ challenge, timestamp: Date.now() }),
        updatedAt: sql`(strftime('%s', 'now') * 1000)`,
      },
    });

  const headersList = await headers();
  const host = headersList.get("host") || "localhost";
  const hostname = host.split(":")[0];

  return {
    challenge,
    rp: {
      name: "VaultFlow",
      id: hostname === "localhost" ? undefined : hostname,
    },
    user: {
      id: "vaultflow_master_user",
      name: "owner@vaultflow",
      displayName: "VaultFlow Owner",
    },
  };
}

/**
 * Saves a new biometric credential returned by navigator.credentials.create()
 */
export async function saveBiometricCredential(data: {
  credentialId: string;
  rawId?: string;
  deviceName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.credentialId) {
      return { success: false, error: "Dữ liệu xác thực không hợp lệ" };
    }

    // Retrieve existing credentials
    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTING_KEY_BIOMETRIC_DEVICES));

    let devices: StoredBiometricCredential[] = [];
    if (stored?.value) {
      try {
        devices = JSON.parse(stored.value);
      } catch {
        devices = [];
      }
    }

    // Filter out if duplicate ID exists
    devices = devices.filter((d) => d.id !== data.credentialId);

    // Add new credential
    devices.push({
      id: data.credentialId,
      rawId: data.rawId,
      deviceName: data.deviceName?.trim() || "Thiết bị cá nhân",
      createdAt: Date.now(),
    });

    await db
      .insert(settings)
      .values({
        key: SETTING_KEY_BIOMETRIC_DEVICES,
        value: JSON.stringify(devices),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(devices),
          updatedAt: sql`(strftime('%s', 'now') * 1000)`,
        },
      });

    revalidatePath("/settings");
    revalidatePath("/login");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể lưu thông tin sinh trắc học" };
  }
}

/**
 * Generates authentication options for navigator.credentials.get()
 */
export async function generateBiometricAuthOptions(): Promise<{
  success: boolean;
  challenge?: string;
  rpId?: string;
  allowedCredentialIds?: string[];
  error?: string;
}> {
  try {
    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTING_KEY_BIOMETRIC_DEVICES));

    if (!stored || !stored.value) {
      return { success: false, error: "Chưa có thiết bị sinh trắc học nào được đăng ký" };
    }

    const devices: StoredBiometricCredential[] = JSON.parse(stored.value);
    if (devices.length === 0) {
      return { success: false, error: "Chưa có thiết bị sinh trắc học nào được đăng ký" };
    }

    const challenge = generateRandomChallenge();

    await db
      .insert(settings)
      .values({
        key: SETTING_KEY_BIOMETRIC_CHALLENGE,
        value: JSON.stringify({ challenge, timestamp: Date.now() }),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify({ challenge, timestamp: Date.now() }),
          updatedAt: sql`(strftime('%s', 'now') * 1000)`,
        },
      });

    const headersList = await headers();
    const host = headersList.get("host") || "localhost";
    const hostname = host.split(":")[0];

    return {
      success: true,
      challenge,
      rpId: hostname === "localhost" ? undefined : hostname,
      allowedCredentialIds: devices.map((d) => d.id),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể khởi tạo đăng nhập sinh trắc học" };
  }
}

/**
 * Verifies biometric assertion from navigator.credentials.get() and logs the user in
 */
export async function loginWithBiometric(data: {
  credentialId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.credentialId) {
      return { success: false, error: "Dữ liệu xác thực không hợp lệ" };
    }

    // 1. Fetch registered devices
    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTING_KEY_BIOMETRIC_DEVICES));

    if (!stored || !stored.value) {
      return { success: false, error: "Chưa có thiết bị sinh trắc học nào được đăng ký" };
    }

    const devices: StoredBiometricCredential[] = JSON.parse(stored.value);
    const matchedDevice = devices.find((d) => d.id === data.credentialId);

    if (!matchedDevice) {
      return { success: false, error: "Thiết bị sinh trắc học không khớp với kho lưu trữ" };
    }

    // 2. Clear any failed PIN attempt lockouts
    await Promise.all([
      db
        .insert(settings)
        .values({ key: "pin_failed_attempts", value: "0" })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: "0", updatedAt: sql`(strftime('%s', 'now') * 1000)` },
        }),
      db
        .insert(settings)
        .values({ key: "pin_locked_until", value: "0" })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: "0", updatedAt: sql`(strftime('%s', 'now') * 1000)` },
        }),
    ]);

    // 3. Create authenticated session token
    const token = await createSessionToken();
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Đăng nhập sinh trắc học thất bại" };
  }
}

/**
 * Revokes a registered biometric device
 */
export async function removeBiometricDevice(
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [stored] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTING_KEY_BIOMETRIC_DEVICES));

    if (!stored?.value) return { success: true };

    let devices: StoredBiometricCredential[] = JSON.parse(stored.value);
    devices = devices.filter((d) => d.id !== credentialId);

    await db
      .insert(settings)
      .values({
        key: SETTING_KEY_BIOMETRIC_DEVICES,
        value: JSON.stringify(devices),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(devices),
          updatedAt: sql`(strftime('%s', 'now') * 1000)`,
        },
      });

    revalidatePath("/settings");
    revalidatePath("/login");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa thiết bị" };
  }
}
