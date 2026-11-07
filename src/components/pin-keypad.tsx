"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithPin, getPinLockStatus } from "@/actions/auth";
import {
  getBiometricStatus,
  generateBiometricAuthOptions,
  loginWithBiometric,
} from "@/actions/biometric";
import {
  isPlatformBiometricAvailable,
  base64UrlToBuffer,
} from "@/lib/webauthn";
import {
  ShieldCheck,
  Delete,
  ArrowRight,
  Lock,
  KeyRound,
  AlertCircle,
  Clock,
  Fingerprint,
  Loader2,
} from "lucide-react";

export function PinKeypad({ isDefaultPin }: { isDefaultPin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("from") || "/";

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState<number>(0);

  // Biometric state
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState(false);

  // Check initial lock status and biometric readiness on mount
  useEffect(() => {
    let isMounted = true;
    getPinLockStatus().then((res) => {
      if (isMounted && res.isLocked && res.remainingSeconds > 0) {
        setLockedSeconds(res.remainingSeconds);
        setError(`Hệ thống đang khóa tạm do nhập sai PIN quá 5 lần. Vui lòng đợi ${res.remainingSeconds}s.`);
      }
    });

    // Check biometric availability
    Promise.all([isPlatformBiometricAvailable(), getBiometricStatus()]).then(
      ([hasPlatform, status]) => {
        if (isMounted && hasPlatform && status.isEnabled) {
          setCanUseBiometric(true);
          const autoPrompt = localStorage.getItem("vf_biometric_auto");
          if (autoPrompt === "true") {
            // Auto prompt biometric on initial load
            setTimeout(() => {
              triggerBiometricLogin();
            }, 300);
          }
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const triggerBiometricLogin = async () => {
    if (isSubmitting || lockedSeconds > 0 || isBiometricPrompting) return;
    setIsBiometricPrompting(true);
    setError(null);

    try {
      const authOptions = await generateBiometricAuthOptions();
      if (!authOptions.success || !authOptions.challenge) {
        setError(authOptions.error || "Không thể khởi tạo sinh trắc học");
        setIsBiometricPrompting(false);
        return;
      }

      const allowCredentials: PublicKeyCredentialDescriptor[] = (
        authOptions.allowedCredentialIds || []
      ).map((id) => ({
        id: base64UrlToBuffer(id),
        type: "public-key",
      }));

      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: base64UrlToBuffer(authOptions.challenge),
          rpId: authOptions.rpId,
          allowCredentials,
          userVerification: "required",
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        setError("Đã hủy thao tác sinh trắc học");
        setIsBiometricPrompting(false);
        return;
      }

      setIsSubmitting(true);
      const res = await loginWithBiometric({
        credentialId: credential.id,
      });

      if (res.success) {
        router.push(redirectPath);
        router.refresh();
      } else {
        setError(res.error || "Xác thực sinh trắc học thất bại");
      }
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError(err.message || "Lỗi xác thực sinh trắc học");
      }
    } finally {
      setIsBiometricPrompting(false);
      setIsSubmitting(false);
    }
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockedSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockedSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        const next = prev - 1;
        setError(`Hệ thống đang khóa tạm do nhập sai PIN quá 5 lần. Vui lòng đợi ${next}s.`);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedSeconds]);

  const isLocked = lockedSeconds > 0;

  const handleKeyPress = (num: string) => {
    if (isSubmitting || isLocked) return;
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 6) {
        submitPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (isSubmitting || isLocked) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (isSubmitting || isLocked) return;
    setPin("");
    setError(null);
  };

  const submitPin = async (codeToSubmit: string) => {
    if (codeToSubmit.length === 0 || isLocked) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await loginWithPin(codeToSubmit);
      if (res.success) {
        router.push(redirectPath);
        router.refresh();
      } else {
        if (res.lockRemainingSeconds && res.lockRemainingSeconds > 0) {
          setLockedSeconds(res.lockRemainingSeconds);
        }
        setError(res.error || "Mã PIN không chính xác");
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 500);
      }
    } catch {
      setError("Đã xảy ra lỗi không mong muốn");
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin("");
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard event listener for physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting || isLocked) return;
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter" && pin.length > 0) {
        submitPin(pin);
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, isSubmitting, isLocked]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto px-4">
      {/* Brand & Security Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600/30 via-emerald-500/20 to-zinc-900 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center text-xs font-bold shadow">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">VaultFlow</h1>
        <p className="text-sm text-zinc-400 mt-1">Single-User Personal Finance</p>
      </div>

      {/* PIN Dots Display */}
      <div className={`mb-8 flex flex-col items-center ${isShaking ? "animate-shake" : ""}`}>
        <div className="flex items-center gap-3 py-3">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                  error
                    ? "bg-rose-500 border-rose-400 shadow-sm shadow-rose-950"
                    : isFilled
                    ? "bg-emerald-400 border-emerald-300 scale-110 shadow-sm shadow-emerald-900"
                    : "bg-zinc-900 border-zinc-700"
                }`}
              />
            );
          })}
        </div>

        {error ? (
          <p className="text-xs text-rose-400 font-medium mt-2 flex items-center gap-1.5 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        ) : (
          <p className="text-xs text-zinc-500 mt-2 font-mono">
            {isSubmitting ? "Decrypting session..." : "Enter 6-digit Master PIN"}
          </p>
        )}
      </div>

      {/* Biometric Quick Unlock Button */}
      {canUseBiometric && (
        <button
          type="button"
          disabled={isSubmitting || isLocked || isBiometricPrompting}
          onClick={triggerBiometricLogin}
          className="w-full mb-6 min-h-[46px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 hover:from-emerald-500/25 hover:to-emerald-600/20 active:scale-[0.98] border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-950/40 select-none touch-manipulation disabled:opacity-40"
        >
          {isBiometricPrompting ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Fingerprint className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isBiometricPrompting ? "Đang xác thực vân tay / Face ID..." : "Mở khóa bằng Face ID / Vân tay"}</span>
        </button>
      )}

      {/* Number Pad for Mobile and Desktop Touch */}
      <div className="grid grid-cols-3 gap-3 w-full mb-6">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isSubmitting || isLocked}
            onClick={() => handleKeyPress(num)}
            className="h-16 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 border border-zinc-800/80 text-xl font-semibold text-zinc-100 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500/40 select-none touch-manipulation shadow-sm disabled:opacity-40"
          >
            {num}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          disabled={isSubmitting || isLocked || pin.length === 0}
          onClick={handleClear}
          className="h-16 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 active:bg-zinc-800 active:scale-95 border border-zinc-800/40 text-xs font-medium text-zinc-400 transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none select-none touch-manipulation"
        >
          CLEAR
        </button>

        {/* Zero */}
        <button
          type="button"
          disabled={isSubmitting || isLocked}
          onClick={() => handleKeyPress("0")}
          className="h-16 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 border border-zinc-800/80 text-xl font-semibold text-zinc-100 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500/40 select-none touch-manipulation shadow-sm disabled:opacity-40"
        >
          0
        </button>

        {/* Backspace or Submit */}
        {pin.length === 6 ? (
          <button
            type="button"
            disabled={isSubmitting || isLocked}
            onClick={() => submitPin(pin)}
            className="h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-95 border border-emerald-500/60 text-zinc-950 font-bold transition-all flex items-center justify-center select-none touch-manipulation shadow-lg shadow-emerald-950 disabled:opacity-40"
          >
            <ArrowRight className="w-6 h-6 text-zinc-950" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || isLocked || pin.length === 0}
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 active:bg-zinc-800 active:scale-95 border border-zinc-800/40 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none select-none touch-manipulation"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dev helper note */}
      {isDefaultPin && (
        <div className="w-full bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
            <KeyRound className="w-3.5 h-3.5" />
            Default PIN: <span className="font-mono font-bold tracking-widest bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-200">123456</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Đổi mã PIN riêng tư ngay tại trang <strong className="text-zinc-200">Cài đặt (Settings)</strong> hoặc cấu hình <code className="text-zinc-300 font-mono">VERCEL_APP_PIN</code>.
          </p>
        </div>
      )}
    </div>
  );
}
