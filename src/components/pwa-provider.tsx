"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

interface PWAContextType {
  isOffline: boolean;
  canInstall: boolean;
  installApp: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  isOffline: false,
  canInstall: false,
  installApp: async () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check initial network status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Register Service Worker in production or supporting browsers
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Check for service worker updates periodically
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New update available
                  console.log("[SW] New version available.");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[SW] Registration error:", err);
        });
    }

    // 3. Listen for PWA beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isOffline,
        canInstall: !!deferredPrompt,
        installApp,
      }}
    >
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 shadow-lg animate-fadeIn select-none">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Bạn đang ngoại tuyến • Đang xem dữ liệu lưu trong bộ nhớ máy</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-2 px-2 py-0.5 rounded bg-black/20 hover:bg-black/30 active:scale-95 text-[11px] font-bold flex items-center gap-1 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Tải lại
          </button>
        </div>
      )}

      {/* Online Restored Toast */}
      {showRestored && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-zinc-950 text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 shadow-lg animate-fadeIn select-none">
          <Wifi className="w-3.5 h-3.5" />
          <span>Đã khôi phục kết nối Internet! Dữ liệu đã sẵn sàng đồng bộ.</span>
        </div>
      )}

      {children}
    </PWAContext.Provider>
  );
}
