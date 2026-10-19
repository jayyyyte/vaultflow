"use server";

import { cookies } from "next/headers";
import { COOKIE_NAME, createSessionToken, verifyPin, isDefaultPinInUse } from "@/lib/auth";

export interface LoginResult {
  success: boolean;
  error?: string;
  isDefaultPin?: boolean;
}

export async function loginWithPin(pin: string): Promise<LoginResult> {
  if (!pin || pin.trim().length === 0) {
    return { success: false, error: "PIN is required" };
  }

  const isValid = verifyPin(pin);
  if (!isValid) {
    return { success: false, error: "Incorrect PIN code. Please try again." };
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
    isDefaultPin: isDefaultPinInUse(),
  };
}

export async function logout(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

export async function checkPinStatus(): Promise<{ isDefaultPin: boolean }> {
  return { isDefaultPin: isDefaultPinInUse() };
}
