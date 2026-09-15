"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initiateMfaSetupAction, confirmMfaSetupAction, type MfaSetupData } from "@/actions/auth.actions";

export function EnrollmentForm() {
  const [setup, setSetup] = useState<MfaSetupData | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <div className="space-y-6">
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {!setup?.success ? <form className="space-y-4" onSubmit={event => {
      event.preventDefault();
      const password = new FormData(event.currentTarget).get("password")?.toString() || "";
      startTransition(async () => {
        try { const result = await initiateMfaSetupAction(password); setSetup(result); setError(result.error || ""); }
        catch { setError("ไม่สามารถเริ่มตั้งค่าได้ กรุณาลองใหม่"); }
      });
    }}>
      <label className="block">ยืนยันรหัสผ่าน<input name="password" type="password" autoComplete="current-password" required className="auth-input mt-2" /></label>
      <button disabled={pending} className="auth-btn w-full">{pending ? "กำลังดำเนินการ…" : "เริ่มตั้งค่า MFA"}</button>
    </form> : <form className="space-y-4" onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(async () => {
        try {
          const result = await confirmMfaSetupAction(null, data);
          if (result.success) { router.replace("/"); router.refresh(); }
          else setError(result.error || "ยืนยันไม่สำเร็จ");
        } catch { setError("ไม่สามารถยืนยันได้ กรุณาลองใหม่"); }
      });
    }}>
      <p>เพิ่มบัญชีในแอป Authenticator ด้วยคีย์นี้ แล้วกรอกรหัส 6 หลัก</p>
      <code className="block break-all select-all p-3 bg-white/10">{setup.secret}</code>
      <p>บันทึก Recovery Codes ไว้ในที่ปลอดภัย แต่ละรหัสใช้ได้ครั้งเดียว</p>
      <ul className="grid grid-cols-2 gap-2 font-mono">{setup.rawRecoveryCodes?.map(code => <li key={code}>{code}</li>)}</ul>
      <label className="block">รหัส OTP<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="auth-input mt-2" /></label>
      <button disabled={pending} className="auth-btn w-full">{pending ? "กำลังยืนยัน…" : "ยืนยันและเปิด MFA"}</button>
    </form>}
  </div>;
}
