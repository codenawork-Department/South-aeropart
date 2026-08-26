"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef } from "react";
import { loginAction, type AuthActionResult } from "@/actions/auth.actions";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Mail,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
} from "lucide-react";

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="auth-btn auth-btn-primary flex items-center justify-center gap-2 group transition-all duration-200 mt-2"
    >
      {pending ? (
        <>
          <span className="btn-spinner" />
          <span>กำลังตรวจสอบสิทธิ์...</span>
        </>
      ) : (
        <>
          <KeyRound
            size={16}
            className="transition-transform group-hover:scale-110 duration-200"
          />
          <span>เข้าสู่ระบบ Dashboard</span>
        </>
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Handle Caps Lock detection
  const handleKeyModifierCheck = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (typeof e.getModifierState === "function") {
      setIsCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div className="auth-bg px-4 py-8 sm:py-12 safe-top safe-bottom select-none">
      {/* ─── Background Watermark & Atmosphere ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-bold text-[18vw] tracking-[0.25em] text-white/[0.015] uppercase whitespace-nowrap">
          SOUTH AERO
        </span>
      </div>

      {/* ─── Top Ambient Bar ─── */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E51D24] to-transparent z-20" />

      {/* ─── Back to Storefront Link (Top Left) ─── */}
      <header className="fixed top-4 left-4 sm:top-6 sm:left-6 z-20">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414]/80 hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#3A3A3A] text-xs font-medium text-gray-400 hover:text-white backdrop-blur-md transition-all duration-200 shadow-md group"
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-1 duration-200 text-[#E51D24]"
          />
          <span>หน้าร้านค้า Storefront</span>
        </a>
      </header>

      {/* ─── Main Glassmorphic Login Card ─── */}
      <div className="glass-card w-full max-w-[440px] mx-auto p-6 sm:p-8 animate-in relative overflow-hidden">
        {/* Subtle Top Red Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#E51D24] to-transparent" />

        {/* ─── Brand & Header ─── */}
        <div className="text-center mb-6 sm:mb-7">
          {/* SA Monogram Icon */}
          <div className="inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-neutral-900 border border-red-500/30 mb-3.5 shadow-xl shadow-red-950/60 group">
            <span className="text-white font-black text-lg tracking-wider">
              SA
            </span>
          </div>

          <h1 className="brand-title text-2xl sm:text-3xl font-extrabold tracking-[0.18em] text-white flex items-center justify-center gap-1.5">
            SOUTH <span className="text-[#E51D24]">AERO</span>
          </h1>
          <p className="brand-subtitle text-[0.62rem] sm:text-[0.68rem] tracking-[0.35em] text-gray-400 font-semibold mt-1">
            PERFORMANCE ADMIN CONSOLE
          </p>

          {/* Telemetry Security Tag */}
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181818] border border-[#2B2B2B] text-[0.65rem] font-mono text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E51D24] animate-pulse" />
            <span className="tracking-wider">
              RESTRICTED ACCESS &bull; TLS ENCRYPTED
            </span>
          </div>
        </div>

        {/* ─── Error Alert Banner ─── */}
        {state?.error && (
          <div
            className={
              state.lockoutMinutes
                ? "alert-warning mb-5 animate-in"
                : "alert-error mb-5 animate-in"
            }
            role="alert"
          >
            {state.lockoutMinutes ? (
              <AlertTriangle
                size={18}
                className="flex-shrink-0 text-amber-400"
              />
            ) : (
              <ShieldAlert
                size={18}
                className="flex-shrink-0 text-red-400"
              />
            )}
            <div className="text-xs leading-relaxed font-medium">
              <span>{state.error}</span>
            </div>
          </div>
        )}

        {/* ─── Login Form ─── */}
        <form action={formAction} className="space-y-4 sm:space-y-5">
          {/* Email Field */}
          <div>
            <label htmlFor="login-email" className="auth-label">
              อีเมลผู้ดูแลระบบ
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@southaero.com"
                className={`auth-input auth-input-with-icon ${
                  state?.fieldErrors?.email ? "input-error" : ""
                }`}
              />
            </div>
            {state?.fieldErrors?.email && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{state.fieldErrors.email[0]}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="auth-label !mb-0">
                รหัสผ่าน
              </label>
              {isCapsLockOn && (
                <span className="inline-flex items-center gap-1 text-[0.68rem] text-amber-400 font-medium animate-pulse">
                  <AlertTriangle size={11} />
                  <span>Caps Lock เปิดอยู่</span>
                </span>
              )}
            </div>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                ref={passwordInputRef}
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyModifierCheck}
                onKeyUp={handleKeyModifierCheck}
                placeholder="••••••••••••"
                className={`auth-input auth-input-with-both-icons ${
                  state?.fieldErrors?.password ? "input-error" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pwd-toggle text-gray-400 hover:text-white"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state?.fieldErrors?.password && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{state.fieldErrors.password[0]}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <SubmitButton />
          </div>
        </form>

        {/* ─── Footer Telemetry ─── */}
        <div className="mt-6 pt-5 border-t border-[#1F1F1F] flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 font-medium">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>South Aero Performance &bull; Admin Portal</span>
          </div>
          <p className="text-[0.62rem] text-gray-600 font-mono tracking-wider">
            SECURED WITH BCRYPT + JWT SESSIONS &bull; v2.4.0
          </p>
        </div>
      </div>
    </div>
  );
}
