import React from "react";
import { getSettingsMap } from "@/actions/settings";
import { checkPinStatus } from "@/actions/auth";
import { getCategories } from "@/actions/categories";
import { SettingsView } from "@/components/settings-view";

export default async function SettingsPage() {
  const [settingsMap, pinStatus, categories] = await Promise.all([
    getSettingsMap(),
    checkPinStatus(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Cài đặt tiền tệ, bảo mật mã PIN, quản lý danh mục và sao lưu dữ liệu
        </p>
      </div>

      <SettingsView
        settingsMap={settingsMap}
        isDefaultPin={pinStatus.isDefaultPin}
        categories={categories}
      />
    </div>
  );
}
