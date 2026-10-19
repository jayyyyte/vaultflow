import React from "react";
import { getSettingsMap } from "@/actions/settings";
import { isDefaultPinInUse } from "@/lib/auth";
import { SettingsView } from "@/components/settings-view";


export default async function SettingsPage() {
  const [settingsMap, isDefaultPin] = await Promise.all([
    getSettingsMap(),
    Promise.resolve(isDefaultPinInUse()),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Settings & Backups
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Export database, manage currencies, PIN security, and deployment guides
        </p>
      </div>

      <SettingsView settingsMap={settingsMap} isDefaultPin={isDefaultPin} />
    </div>
  );
}
