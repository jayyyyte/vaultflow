"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {
    currency: "USD",
    currency_symbol: "$",
    app_name: "VaultFlow",
  };
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export async function updateSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .insert(settings)
      .values({ key, value, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: Date.now() },
      });

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update setting" };
  }
}
