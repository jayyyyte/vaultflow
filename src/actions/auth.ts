"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  COOKIE_NAME,
  createSessionToken,
  verifyPin,
  isDefaultPinInUse,
  hashPin,
  verifyPinHash,
} from "@/lib/auth";

export interface LoginResult {
  success: boolean;
  error?: string;
  isDefaultPin?: boolean;
  lockRemainingSeconds?: number;
  attemptsLeft?: number;
}

export async function loginWithPin(pin: string): Promise<LoginResult> {
  if (!pin || pin.trim().length === 0) {
    return { success: false, error: "Vui lòng nhập mã PIN" };
  }

  const now = Date.now();

  // Fetch lock status, failed attempts, and custom PIN hash from settings
  const authSettings = await db
    .select()
    .from(settings)
    .where(
      sql`${settings.key} IN ('pin_failed_attempts', 'pin_locked_until', 'app_master_pin_hash', 'pin_last_attempt_at')`
    );

  const settingsMap = new Map(authSettings.map((s) => [s.key, s.value]));
  const lockedUntil = parseInt(settingsMap.get("pin_locked_until") || "0", 10);
  const lastAttemptAt = parseInt(settingsMap.get("pin_last_attempt_at") || "0", 10);
  // Auto-reset failed attempts after 15 minutes of inactivity
  const isAttemptsExpired = lastAttemptAt > 0 && now - lastAttemptAt > 15 * 60 * 1000;
  const failedAttempts = isAttemptsExpired ? 0 : parseInt(settingsMap.get("pin_failed_attempts") || "0", 10);
  const storedHash = settingsMap.get("app_master_pin_hash");

  // Check if currently locked
  if (lockedUntil > now) {
    const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
    return {
      success: false,
      error: `Nhập sai mã PIN quá 5 lần. Vui lòng thử lại sau ${remainingSeconds} giây.`,
      lockRemainingSeconds: remainingSeconds,
    };
  }

  // Verify PIN
  let isValid = false;
  if (storedHash) {
    isValid = await verifyPinHash(pin, storedHash);
  } else {
    isValid = verifyPin(pin);
  }

  if (!isValid) {
    const newAttempts = failedAttempts + 1;
    if (newAttempts >= 5) {
      const lockUntil = now + 60 * 1000; // Lock for 60 seconds
      await Promise.all([
        db
          .insert(settings)
          .values({ key: "pin_locked_until", value: String(lockUntil) })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: String(lockUntil), updatedAt: sql`(strftime('%s', 'now') * 1000)` },
          }),
        db
          .insert(settings)
          .values({ key: "pin_failed_attempts", value: "0" })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: "0", updatedAt: sql`(strftime('%s', 'now') * 1000)` },
          }),
        db
          .insert(settings)
          .values({ key: "pin_last_attempt_at", value: String(now) })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: String(now), updatedAt: sql`(strftime('%s', 'now') * 1000)` },
          }),
      ]);
      return {
        success: false,
        error: "Nhập sai mã PIN 5 lần. Hệ thống đã khóa tạm trong 60 giây.",
        lockRemainingSeconds: 60,
      };
    } else {
      await Promise.all([
        db
          .insert(settings)
          .values({ key: "pin_failed_attempts", value: String(newAttempts) })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: String(newAttempts), updatedAt: sql`(strftime('%s', 'now') * 1000)` },
          }),
        db
          .insert(settings)
          .values({ key: "pin_last_attempt_at", value: String(now) })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: String(now), updatedAt: sql`(strftime('%s', 'now') * 1000)` },
          }),
      ]);
      const attemptsLeft = 5 - newAttempts;
      return {
        success: false,
        error: `Mã PIN không đúng. Bạn còn ${attemptsLeft} lần thử trước khi bị khóa tạm.`,
        attemptsLeft,
      };
    }
  }

  // Success: reset attempts and lock if any existed
  if (failedAttempts > 0 || lockedUntil > 0 || lastAttemptAt > 0) {
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
      db
        .insert(settings)
        .values({ key: "pin_last_attempt_at", value: "0" })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: "0", updatedAt: sql`(strftime('%s', 'now') * 1000)` },
        }),
    ]);
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return {
    success: true,
    isDefaultPin: !storedHash && isDefaultPinInUse(),
  };
}

export async function getPinLockStatus(): Promise<{ isLocked: boolean; remainingSeconds: number }> {
  try {
    const [lockedSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "pin_locked_until"));

    const lockedUntil = parseInt(lockedSetting?.value || "0", 10);
    const now = Date.now();
    if (lockedUntil > now) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((lockedUntil - now) / 1000),
      };
    }
  } catch {
    // Database might not be ready yet
  }
  return { isLocked: false, remainingSeconds: 0 };
}

export async function changeMasterPin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentPin) {
      return { success: false, error: "Vui lòng nhập mã PIN hiện tại" };
    }
    if (!newPin || !/^\d{6}$/.test(newPin.trim())) {
      return { success: false, error: "Mã PIN mới phải bao gồm đúng 6 chữ số (chỉ bao gồm số từ 0-9)" };
    }

    const [storedPinSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "app_master_pin_hash"));

    const storedHash = storedPinSetting?.value;
    let isCurrentValid = false;
    if (storedHash) {
      isCurrentValid = await verifyPinHash(currentPin, storedHash);
    } else {
      isCurrentValid = verifyPin(currentPin);
    }

    if (!isCurrentValid) {
      return { success: false, error: "Mã PIN hiện tại không chính xác" };
    }

    const newHash = await hashPin(newPin.trim());
    await db
      .insert(settings)
      .values({ key: "app_master_pin_hash", value: newHash })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: newHash, updatedAt: sql`(strftime('%s', 'now') * 1000)` },
      });

    revalidatePath("/settings");
    revalidatePath("/login");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể đổi mã PIN" };
  }
}

export async function logout(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

export async function checkPinStatus(): Promise<{ isDefaultPin: boolean }> {
  try {
    const [storedPinSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "app_master_pin_hash"));

    if (storedPinSetting?.value) {
      return { isDefaultPin: false };
    }
  } catch {
    // Ignore error
  }
  return { isDefaultPin: isDefaultPinInUse() };
}
