"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import {
  setupSuperAdminAction,
  type AuthActionResult,
} from "@/actions/auth.actions";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  User,
  Mail,
  Lock,
  KeyRound,
  AlertTriangle,
} from "lucide-react";

// ─── Password Strength Calculator ───

type StrengthLevel = "none" | "weak" | "fair" | "good" | "strong";

function calcStrength(pw: string): {
  level: StrengthLevel;
  score: number;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
} {
  const checks = {
    minLength: pw.length >= 12,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const level: StrengthLevel =
    score <= 1 ? "weak" : score === 2 ? "fair" : score <= 4 ? "good" : "strong";
  return { level: pw.length === 0 ? "none" : level, score, checks };
}

const strengthLabel: Record<StrengthLevel, string> = {
  none: "",
  weak: "อ่อนมาก",
  fair: "พอใช้",
  good: "ดี",
  strong: "แข็งแรงมาก",
};

const strengthColor: Record<StrengthLevel, string> = {
  none: "",
  weak: "text-red-400",
  fair: "text-yellow-400",
  good: "text-lime-400",
  strong: "text-green-400",
};

export function SetupForm() {
  const router = useRouter();
  const [state, formAction] = useFormState<
    AuthActionResult | null,
    FormData
  >(setupSuperAdminAction, null);
  const [isPending, startTransition] = useTransition();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const strength = calcStrength(password);

  // Handle successful setup
  useEffect(() => {
    if (state?.success) {
      setShowModal(false);
      setShowSuccess(true);
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  const handleSubmitClick = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormRef(e.currentTarget);
      setShowModal(true);
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (formRef) {
      const fd = new FormData(formRef);
      startTransition(() => {
        formAction(fd);
      });
    }
  }, [formRef, formAction, startTransition]);

  // ─── Success Screen ───
  if (showSuccess) {
    return (
      <div className="auth-bg px-4 py-8 sm:py-12 safe-top safe-bottom">
        <div className="glass-card w-full max-w-[420px] mx-auto p-6 sm:p-8 animate-in text-center">
          <div className="flex justify-center mb-5">
            <div className="success-ring">
              <Check size={28} className="text-green-400" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-2">สร้าง Super Admin สำเร็จ!</h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-4">
            บัญชี Super Admin ถูกสร้างเรียบร้อยแล้ว
            <br />
            กำลังนำคุณไปหน้าเข้าสู่ระบบ...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="btn-spinner !w-3 !h-3 !border-gray-500 !border-t-gray-300" />
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg px-4 py-8 sm:py-12 safe-top safe-bottom">
      <div className="glass-card w-full max-w-[480px] mx-auto p-6 sm:p-8 animate-in">
        {/* ─── Branding ─── */}
        <div className="text-center mb-6 sm:mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] mb-3 sm:mb-4">
            <KeyRound size={26} className="text-blue-500 sm:w-7 sm:h-7" />
          </div>
          <h1 className="brand-title brand-glow">SOUTH</h1>
          <p className="brand-subtitle">A E R O&ensp;P E R F O R M A N C E</p>
          <p className="text-xs text-gray-500 mt-2 sm:mt-3 tracking-wide">
            Initial Setup — สร้าง Super Admin คนแรก
          </p>
        </div>

        {/* ─── Info Banner ─── */}
        <div className="alert-warning mb-5 sm:mb-6">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="text-xs sm:text-sm">
            หน้านี้ใช้ได้เพียงครั้งเดียว หลังจากสร้าง Super Admin แล้วจะไม่สามารถเข้าถึงได้อีก
          </span>
        </div>


        {/* ─── Server Error ─── */}
        {state?.error && (
          <div className="alert-error mb-5">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* ─── Setup Form ─── */}
        <form onSubmit={handleSubmitClick} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="setup-fullname" className="auth-label">
              ชื่อ-นามสกุล
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="setup-fullname"
                name="fullName"
                type="text"
                required
                placeholder="สมชาย ใจดี"
                className={`auth-input pl-10 ${
                  state?.fieldErrors?.fullName ? "input-error" : ""
                }`}
              />
            </div>
            {state?.fieldErrors?.fullName && (
              <p className="text-red-400 text-xs mt-1.5">
                {state.fieldErrors.fullName[0]}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="setup-email" className="auth-label">
              อีเมล
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="setup-email"
                name="email"
                type="email"
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
            <label htmlFor="setup-password" className="auth-label">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="setup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="รหัสผ่านอย่างน้อย 12 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Strength Meter */}
            {password.length > 0 && (
              <>
                <div className="strength-meter">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`strength-bar ${
                        i <= strength.score ? `active ${strength.level}` : ""
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs mt-1.5 ${strengthColor[strength.level]}`}
                >
                  ความแข็งแรง: {strengthLabel[strength.level]}
                </p>

                {/* Requirements Checklist */}
                <ul className="req-list">
                  {[
                    { met: strength.checks.minLength, label: "12+ ตัวอักษร" },
                    { met: strength.checks.hasUpper, label: "ตัวพิมพ์ใหญ่ (A-Z)" },
                    { met: strength.checks.hasLower, label: "ตัวพิมพ์เล็ก (a-z)" },
                    { met: strength.checks.hasNumber, label: "ตัวเลข (0-9)" },
                    { met: strength.checks.hasSpecial, label: "อักขระพิเศษ (!@#...)" },
                  ].map(({ met, label }) => (
                    <li
                      key={label}
                      className={`req-item ${met ? "met" : ""}`}
                    >
                      {met ? (
                        <Check size={12} />
                      ) : (
                        <span className="req-dot" />
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {state?.fieldErrors?.password && (
              <p className="text-red-400 text-xs mt-1.5">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="setup-confirm" className="auth-label">
              ยืนยันรหัสผ่าน
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="setup-confirm"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                className={`auth-input pl-10 pr-10 ${
                  state?.fieldErrors?.confirmPassword ? "input-error" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="pwd-toggle"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state?.fieldErrors?.confirmPassword && (
              <p className="text-red-400 text-xs mt-1.5">
                {state.fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || strength.score < 5}
            className="auth-btn auth-btn-primary flex items-center justify-center gap-2 mt-2"
          >
            {isPending ? (
              <>
                <span className="btn-spinner" />
                <span>กำลังสร้าง...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>สร้าง Super Admin</span>
              </>
            )}
          </button>
        </form>

        {/* ─── Footer ─── */}
        <div className="mt-6 pt-5 border-t border-[#2A2A2A]">
          <p className="text-center text-xs text-gray-600">
            ข้อมูลจะถูกเข้ารหัสด้วย bcrypt (12 rounds) ก่อนบันทึก
          </p>
        </div>
      </div>

      {/* ─── Confirmation Modal ─── */}
      {showModal && (
        <div className="modal-overlay p-4" onClick={() => setShowModal(false)}>
          <div
            className="modal-content w-full max-w-[420px] p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">ยืนยันการสร้าง Super Admin</h3>
                <p className="text-[0.7rem] sm:text-xs text-gray-500">กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</p>
              </div>
            </div>

            <div className="bg-[#0A0A0A] rounded-lg p-3.5 sm:p-4 mb-5 border border-[#2A2A2A]">
              <p className="text-xs text-gray-400 mb-3">
                คุณกำลังจะสร้างบัญชี Super Admin ซึ่งมีสิทธิ์สูงสุดในระบบ:
              </p>
              <ul className="text-xs text-gray-300 space-y-1.5">
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-blue-400 shrink-0" />
                  <span>จัดการสินค้า, คำสั่งซื้อ, รีวิว</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-blue-400 shrink-0" />
                  <span>สร้าง/ลบ Admin และ Staff</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-blue-400 shrink-0" />
                  <span>เข้าถึง Audit Logs ทั้งหมด</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 sm:justify-end">
              <button
                type="button"
                className="modal-btn modal-btn-cancel w-full sm:w-auto text-center"
                onClick={() => setShowModal(false)}
                disabled={isPending}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-confirm flex items-center justify-center gap-2 w-full sm:w-auto"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="btn-spinner !w-3.5 !h-3.5" />
                    <span>กำลังสร้าง...</span>
                  </>
                ) : (
                  "ยืนยัน สร้าง Super Admin"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
