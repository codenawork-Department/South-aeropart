"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { loginAction, type AuthActionResult } from "@/actions/auth.actions";
import { ShieldCheck, Eye, EyeOff, AlertTriangle, Lock, Mail } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="auth-btn auth-btn-primary flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <span className="btn-spinner" />
          <span>กำลังเข้าสู่ระบบ...</span>
        </>
      ) : (
        <span>เข้าสู่ระบบ</span>
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-bg px-4 py-8 sm:py-12 safe-top safe-bottom">
      <div className="glass-card w-full max-w-[420px] mx-auto p-6 sm:p-8 animate-in">
        {/* ─── Branding ─── */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] mb-3 sm:mb-4">
            <ShieldCheck size={26} className="text-blue-500 sm:w-7 sm:h-7" />
          </div>
          <h1 className="brand-title brand-glow">SOUTH</h1>
          <p className="brand-subtitle">A E R O&ensp;P E R F O R M A N C E</p>
          <p className="text-xs text-gray-500 mt-2 sm:mt-3 tracking-wide">
            Admin Dashboard — เข้าสู่ระบบ
          </p>
        </div>


        {/* ─── Error Alert ─── */}
        {state?.error && (
          <div className={state.lockoutMinutes ? "alert-warning mb-5" : "alert-error mb-5"}>
            {state.lockoutMinutes ? (
              <AlertTriangle size={16} className="flex-shrink-0" />
            ) : (
              <Lock size={16} className="flex-shrink-0" />
            )}
            <span>{state.error}</span>
          </div>
        )}

        {/* ─── Login Form ─── */}
        <form action={formAction} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="auth-label">
              อีเมล
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@southaero.com"
                className={`auth-input pl-10 ${
                  state?.fieldErrors?.email ? "input-error" : ""
                }`}
              />
            </div>
            {state?.fieldErrors?.email && (
              <p className="text-red-400 text-xs mt-1.5">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="auth-label">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                className={`auth-input pl-10 pr-10 ${
                  state?.fieldErrors?.password ? "input-error" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pwd-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state?.fieldErrors?.password && (
              <p className="text-red-400 text-xs mt-1.5">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <SubmitButton />
        </form>

        {/* ─── Footer ─── */}
        <div className="mt-6 pt-5 border-t border-[#2A2A2A]">
          <p className="text-center text-xs text-gray-600">
            South Aero Performance — Admin Panel
          </p>
          <p className="text-center text-[10px] text-gray-700 mt-1">
            Secured with bcrypt + JWT sessions
          </p>
        </div>
      </div>
    </div>
  );
}
