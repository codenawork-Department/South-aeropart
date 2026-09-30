"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  Send,
  Ban,
  ArrowLeft,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { saveProductShipping, saveShippingSettings, offerShippingQuote, declineShippingQuote } from "@/actions/shipping.actions";
import type { getAdminShippingQuote } from "@/actions/shipping.actions";
import { moneySatang, type ShippingPolicy, type ShippingParcel } from "@repo/lib/shipping";
import { formatSatang } from "@repo/lib/money-arithmetic";

const CARRIER_PRESETS = [
  "Flash Express (พัสดุด่วน)",
  "Kerry Express (KEX)",
  "EMS ไปรษณีย์ไทย",
  "SCG Express (พัสดุใหญ่/ควบคุมคุณภาพ)",
  "Lalamove (ส่งด่วนภายในวัน)",
  "DHL Express Thailand",
  "รถกระบะเหมาคอก/ตู้ทึบ (ชิ้นส่วนขนาดใหญ่พิเศษ)",
];

const ESTIMATE_PRESETS = [
  "1 - 2 วันทำการ",
  "2 - 3 วันทำการ",
  "3 - 5 วันทำการ",
  "5 - 7 วันทำการ",
];

const TERMS_PRESETS = [
  "ราคารวมค่าจัดส่งแบบมีประกันพัสดุและวัสดุกันกระแทกเสริมพิเศษ จัดส่งตรงถึงที่อยู่ปลายทาง",
  "ชิ้นส่วนแอร์โรพาร์ทบรรจุกล่องตีโครงไม้กันกระแทก ขนส่งด้วยบริการพิเศษระวังแตก",
  "ราคารวมค่าแพ็กเกจจิ้งและค่าบริการขนส่งแบบด่วน พร้อมแจ้งเลขติดตามพัสดุ (Tracking) ทันทีที่จัดส่ง",
];

const VALID_DAYS_PRESETS = [3, 5, 7, 14];

export function ProductShippingForm({ initial }: { initial: ShippingPolicy }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const r = await saveProductShipping(v);
      if (r.success) {
        setMessage({ text: "บันทึกนโยบายค่าจัดส่งสินค้าเรียบร้อยแล้ว", type: "success" });
      } else {
        setMessage({ text: r.error || "บันทึกไม่สำเร็จ", type: "error" });
      }
    } catch {
      setMessage({ text: "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-white shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">นโยบายค่าจัดส่งของสินค้านี้</h2>
          <p className="text-xs text-neutral-400">
            กำหนดวิธีคิดค่าจัดส่งเฉพาะสำหรับสินค้านี้ (ชุดเซ็ตคิดเป็น 1 รายการ ไม่บวกค่าส่งชิ้นส่วนซ้ำ)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
            วิธีคิดค่าจัดส่ง
          </label>
          <select
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            value={v.mode}
            onChange={(e) => setV({ ...v, mode: e.target.value as ShippingPolicy["mode"] })}
          >
            <option value="standard">ใช้ค่าจัดส่งมาตรฐานของร้านค้า (Standard Store Rate)</option>
            <option value="fixed">กำหนดราคาเฉพาะสินค้านี้ (Fixed Per-Product Rate)</option>
            <option value="free">ส่งฟรี (Free Shipping Always)</option>
            <option value="quote">ต้องให้แอดมินประเมินค่าจัดส่งก่อน (Require Shipping Quotation)</option>
          </select>
        </div>

        {v.mode === "fixed" && (
          <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                ค่าส่งชิ้นแรก (บาท) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">฿</span>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  value={v.firstItem}
                  onChange={(e) => setV({ ...v, firstItem: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                ค่าส่งชิ้นถัดไป (บาท/ชิ้น) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">฿</span>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  value={v.additionalItem}
                  onChange={(e) => setV({ ...v, additionalItem: e.target.value })}
                />
              </div>
            </div>
            <p className="sm:col-span-2 text-xs text-neutral-400">
              กรณีสั่งซื้อหลายชิ้น ระบบจะรวมค่าส่งชิ้นแรก + (ชิ้นถัดไป × จำนวนที่เหลือ)
            </p>
          </div>
        )}

        {v.mode === "quote" && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">โหมดประเมินราคา (Quotation Required):</span>{" "}
              เมื่อลูกค้ามีสินค้านี้ในตะกร้า ระบบจะให้ลูกค้าส่งคำขอราคาจัดส่ง แอดมินต้องเข้ามาเสนอราคาในหน้านี้ก่อนลูกค้าจะชำระเงินได้
            </div>
          </div>
        )}

        {["standard", "fixed"].includes(v.mode) && (
          <label className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/60 cursor-pointer hover:bg-neutral-950/70 transition-colors">
            <input
              type="checkbox"
              checked={v.freeShippingEligible}
              onChange={(e) => setV({ ...v, freeShippingEligible: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-500/20 bg-neutral-900"
            />
            <span className="text-sm text-neutral-200">
              เข้าร่วมโปรโมชันส่งฟรีเมื่อซื้อสินค้าครบยอดขั้นต่ำ
            </span>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-500/20"
        >
          {busy ? "กำลังบันทึก..." : "บันทึกค่าจัดส่งสินค้า"}
        </button>

        {message && (
          <span
            className={`text-xs font-medium px-3 py-1 rounded-lg ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

export function ShippingSettingsForm({
  initial,
}: {
  initial: { standardFee: string; expressFee: string; freeThreshold: string | null };
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const r = await saveShippingSettings(v);
      if (r.success) {
        setMessage({ text: "บันทึกค่าจัดส่งมาตรฐานเรียบร้อยแล้ว", type: "success" });
      } else {
        setMessage({ text: r.error || "บันทึกไม่สำเร็จ", type: "error" });
      }
    } catch {
      setMessage({ text: "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-white shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">กำหนดค่าจัดส่งมาตรฐานในประเทศไทย</h2>
          <p className="text-xs text-neutral-400">
            ค่าจัดส่งเริ่มต้นสำหรับสินค้าทั่วไปที่ใช้โหมด Standard Shipping
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
            ส่งปกติ (บาท/ออเดอร์) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">฿</span>
            <input
              type="text"
              required
              inputMode="decimal"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              value={v.standardFee}
              onChange={(e) => setV({ ...v, standardFee: e.target.value })}
            />
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">ระยะเวลาประมาณ 2-3 วันทำการ</span>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
            ส่งด่วน (บาท/ออเดอร์) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">฿</span>
            <input
              type="text"
              required
              inputMode="decimal"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              value={v.expressFee}
              onChange={(e) => setV({ ...v, expressFee: e.target.value })}
            />
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">ระยะเวลาประมาณ 1-2 วันทำการ</span>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
            ยอดขั้นต่ำสำหรับส่งฟรี
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">฿</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="เว้นว่างหากไม่มีโปรส่งฟรี"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-neutral-600"
              value={v.freeThreshold ?? ""}
              onChange={(e) => setV({ ...v, freeThreshold: e.target.value ? e.target.value : null })}
            />
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">เมื่อยอดสินค้าที่ร่วมรายการถึงจำนวนนี้</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-400 space-y-1.5">
        <p className="font-semibold text-neutral-300">หมายเหตุการคำนวณ:</p>
        <p>• โปรโมชันส่งฟรีจะใช้กับการจัดส่งแบบปกติ (Standard) เท่านั้น</p>
        <p>• สินค้าที่ตั้งค่าเรตเฉพาะสินค้า (Fixed) หรือต้องประเมินราคา (Quote) จะไม่ถูกแทนที่ด้วยเรตมาตรฐานนี้</p>
        <p>• การเปลี่ยนแปลงเรตจะไม่มีผลย้อนหลังกับออเดอร์หรือคำขอราคาที่ออกไปแล้ว</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-500/20"
        >
          {busy ? "กำลังบันทึก..." : "บันทึกการตั้งค่าจัดส่ง"}
        </button>

        {message && (
          <span
            className={`text-xs font-medium px-3 py-1 rounded-lg ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

type Detail = Extract<Awaited<ReturnType<typeof getAdminShippingQuote>>, { success: true }>;

export function ShippingOfferForm({ data }: { data: Detail }) {
  const q = data.quote;
  const router = useRouter();

  const [fee, setFee] = useState(q.fee || "");
  const [carrier, setCarrier] = useState(q.carrier || "");
  const [estimate, setEstimate] = useState(q.deliveryEstimate || "");
  const [terms, setTerms] = useState(q.terms || TERMS_PRESETS[0]);
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState("");
  const [showDeclineBox, setShowDeclineBox] = useState(false);

  const [parcels, setParcels] = useState<ShippingParcel[]>(
    q.parcels.length
      ? q.parcels
      : [{ contents: q.items.map((i) => `${i.name} × ${i.quantity}`).join(", "), lengthCm: 60, widthCm: 40, heightCm: 30, weightKg: 5 }]
  );

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isEditable = ["requested", "offered"].includes(q.status) && new Date(q.accessExpiresAt).getTime() > Date.now();

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee || Number(fee) < 0) {
      setMessage({ text: "กรุณาระบุค่าจัดส่งที่ถูกต้อง", type: "error" });
      return;
    }
    if (!carrier.trim()) {
      setMessage({ text: "กรุณาระบุบริษัทขนส่งหรือรูปแบบการจัดส่ง", type: "error" });
      return;
    }
    if (!estimate.trim()) {
      setMessage({ text: "กรุณาระบุระยะเวลาจัดส่งโดยประมาณ", type: "error" });
      return;
    }
    if (!terms.trim()) {
      setMessage({ text: "กรุณาระบุเงื่อนไขการจัดส่งให้ครบถ้วน", type: "error" });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const r = await offerShippingQuote({
        quoteId: q.id,
        version: q.version,
        fee,
        carrier,
        deliveryEstimate: estimate,
        terms,
        validDays: days,
        parcels,
      });

      if (r.success) {
        setMessage({ text: "ส่งข้อเสนอราคาจัดส่งให้ลูกค้าเรียบร้อยแล้ว!", type: "success" });
        router.refresh();
      } else {
        setMessage({ text: r.error || "เสนอราคาไม่สำเร็จ", type: "error" });
      }
    } catch {
      setMessage({ text: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!reason.trim()) {
      setMessage({ text: "กรุณาระบุเหตุผลที่ไม่สามารถจัดส่งได้", type: "error" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const r = await declineShippingQuote({
        id: q.id,
        version: q.version,
        reason: reason.trim(),
      });
      if (r.success) {
        setMessage({ text: "ปฏิเสธคำขอราคาจัดส่งเรียบร้อยแล้ว", type: "success" });
        router.refresh();
      } else {
        setMessage({ text: r.error || "ปฏิเสธไม่สำเร็จ", type: "error" });
      }
    } catch {
      setMessage({ text: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Helper metrics
  const totalActualWeight = parcels.reduce((sum, p) => sum + (Number(p.weightKg) || 0), 0);
  const totalVolumetricWeight = parcels.reduce((sum, p) => {
    const vol = ((Number(p.lengthCm) || 0) * (Number(p.widthCm) || 0) * (Number(p.heightCm) || 0)) / 5000;
    return sum + vol;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/shipping"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้ารายการค่าจัดส่ง
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 font-mono">
            รุ่นข้อมูล: v{q.version}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              q.status === "requested"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : q.status === "offered"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : q.status === "converted"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}
          >
            {q.status === "requested" && <Clock className="w-3.5 h-3.5" />}
            {q.status === "offered" && <Truck className="w-3.5 h-3.5" />}
            {q.status === "converted" && <CheckCircle2 className="w-3.5 h-3.5" />}
            {q.status === "declined" && <XCircle className="w-3.5 h-3.5" />}
            สถานะ: {q.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Status Notice Banner */}
      {q.status === "requested" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-amber-300">คำขอนี้รอการประเมินราคาจากแอดมิน</h3>
            <p className="text-xs text-amber-200/80">
              ลูกค้าได้บันทึกรายการสินค้าและที่อยู่จัดส่งแล้ว กรุณาคำนวณขนาดพัสดุและเสนอราคาค่าจัดส่งเพื่อให้ลูกค้ายืนยันและชำระเงิน
            </p>
          </div>
        </div>
      )}

      {q.status === "offered" && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sky-200 flex items-start gap-3">
          <Truck className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-sky-300">
              เสนอราคาแล้ว: ฿{q.fee} ({q.carrier})
            </h3>
            <p className="text-xs text-sky-200/80">
              {q.offerExpiresAt && (
                <>ข้อเสนอมีผลถึง: {new Date(q.offerExpiresAt).toLocaleString("th-TH")} • </>
              )}
              ลูกค้าสามารถเข้ามาตรวจสอบและกดยืนยันสั่งซื้อได้จากหน้า คำขอราคาค่าจัดส่ง ของตนเอง
            </p>
          </div>
        </div>
      )}

      {q.status === "converted" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-emerald-300">ลูกค้ายืนยันและสั่งซื้อเรียบร้อยแล้ว</h3>
              <p className="text-xs text-emerald-200/80">
                คำขอนี้ถูกแปลงเป็นคำสั่งซื้อแล้ว ค่าจัดส่งที่เรียกเก็บคือ ฿{q.fee}
              </p>
            </div>
          </div>
          {q.orderId && (
            <Link
              href={`/orders/${q.orderId}`}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex-shrink-0"
            >
              ดูคำสั่งซื้อ
            </Link>
          )}
        </div>
      )}

      {q.status === "declined" && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-rose-300">คำขอนี้ถูกปฏิเสธ</h3>
            <p className="text-xs text-rose-200/80">เหตุผล: {q.terms || "ไม่สามารถจัดส่งไปยังปลายทางนี้ได้"}</p>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer & Basket Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer & Destination Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
              <User className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">ข้อมูลผู้รับและที่อยู่จัดส่ง</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-white font-medium">
                <span>{q.address.recipientName}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300 text-xs">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                <span>{q.address.phone}</span>
              </div>
              {q.address.email && (
                <div className="flex items-center gap-2 text-neutral-300 text-xs">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{q.address.email}</span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-800/80">
                <div className="flex items-start gap-2 text-neutral-300 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {[
                      q.address.line1,
                      q.address.line2,
                      q.address.subDistrict,
                      q.address.district,
                      q.address.province,
                      q.address.postalCode,
                      q.address.country || "Thailand",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              </div>

              {q.customerNote && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mt-2">
                  <span className="font-semibold block mb-0.5">หมายเหตุจากลูกค้า:</span>
                  <p className="whitespace-pre-wrap">{q.customerNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Requested Items Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">รายการสินค้าในคำขอ</h2>
              </div>
              <span className="text-xs text-neutral-400">{q.items.length} รายการ</span>
            </div>

            <div className="divide-y divide-neutral-800/60">
              {q.items.map((item, index) => {
                const bundleParts = data.parts.filter((p) => p.bundleId === item.productId);

                return (
                  <div key={index} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-medium text-sm text-white">{item.name}</div>
                        {item.variant && (
                          <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {item.variant}
                          </span>
                        )}
                        <div className="text-xs text-neutral-400 mt-1">
                          ฿{item.unitPrice} × {item.quantity} ชิ้น
                        </div>
                      </div>
                      <div className="font-semibold text-sm text-white">
                        ฿{formatSatang(moneySatang(item.unitPrice) * BigInt(item.quantity))}
                      </div>
                    </div>

                    {/* Bundle Breakdown if bundle */}
                    {bundleParts.length > 0 && (
                      <div className="ml-3 pl-3 border-l-2 border-neutral-800 space-y-1 bg-neutral-950/40 p-2.5 rounded-r-xl">
                        <span className="text-[11px] font-medium text-amber-400/90 block">
                          ชิ้นส่วนภายในชุดเซ็ต ({bundleParts.length} รายการ):
                        </span>
                        {bundleParts.map((part, pIdx) => (
                          <div key={pIdx} className="text-xs text-neutral-400 flex items-center justify-between">
                            <span>↳ {part.name}</span>
                            <span className="text-neutral-500">× {part.quantity * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-between items-baseline">
              <span className="text-sm font-medium text-neutral-400">ยอดรวมค่าสินค้า</span>
              <span className="text-xl font-bold text-white">฿{q.subtotal}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Packing Plan & Proposal Workbench (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleOfferSubmit} className="space-y-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">แผนการแพ็กเกจจิ้งและเสนอราคา</h2>
                    <p className="text-xs text-neutral-400">
                      ระบุขนาดกล่องพัสดุและค่าจัดส่งที่คำนวณแล้วสำหรับลูกค้า
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">น้ำหนักจริงรวม / ปริมาตร</span>
                  <span className="text-xs font-mono font-semibold text-amber-400">
                    {totalActualWeight.toFixed(2)} กก. / {totalVolumetricWeight.toFixed(2)} Vol-Kg
                  </span>
                </div>
              </div>

              <fieldset disabled={busy || !isEditable} className="space-y-6 disabled:opacity-60">
                {/* Parcel Crating Boxes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      กล่องพัสดุที่ใช้บรรจุ ({parcels.length} กล่อง)
                    </label>
                    {isEditable && parcels.length < 20 && (
                      <button
                        type="button"
                        onClick={() =>
                          setParcels([
                            ...parcels,
                            { contents: "", lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 2 },
                          ])
                        }
                        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มกล่อง
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {parcels.map((parcel, idx) => {
                      const boxVol = ((parcel.lengthCm || 0) * (parcel.widthCm || 0) * (parcel.heightCm || 0)) / 5000;

                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" />
                              กล่อง #{idx + 1}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-neutral-500 font-mono">
                                ปริมาตร: {boxVol.toFixed(2)} Vol-Kg
                              </span>
                              {parcels.length > 1 && isEditable && (
                                <button
                                  type="button"
                                  onClick={() => setParcels(parcels.filter((_, n) => n !== idx))}
                                  className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">
                              รายการสิ่งของที่บรรจุในกล่องนี้ *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="เช่น กันชนหน้า + ลิ้นเสริม พร้อมโฟมกันกระแทก"
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                              value={parcel.contents}
                              onChange={(e) =>
                                setParcels(
                                  parcels.map((p, n) => (n === idx ? { ...p, contents: e.target.value } : p))
                                )
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">ยาว (ซม.)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="1000"
                                required
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                value={parcel.lengthCm || ""}
                                onChange={(e) =>
                                  setParcels(
                                    parcels.map((p, n) =>
                                      n === idx ? { ...p, lengthCm: Number(e.target.value) } : p
                                    )
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">กว้าง (ซม.)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="1000"
                                required
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                value={parcel.widthCm || ""}
                                onChange={(e) =>
                                  setParcels(
                                    parcels.map((p, n) =>
                                      n === idx ? { ...p, widthCm: Number(e.target.value) } : p
                                    )
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">สูง (ซม.)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="1000"
                                required
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                value={parcel.heightCm || ""}
                                onChange={(e) =>
                                  setParcels(
                                    parcels.map((p, n) =>
                                      n === idx ? { ...p, heightCm: Number(e.target.value) } : p
                                    )
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">น้ำหนัก (กก.)</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0.05"
                                max="2000"
                                required
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                value={parcel.weightKg || ""}
                                onChange={(e) =>
                                  setParcels(
                                    parcels.map((p, n) =>
                                      n === idx ? { ...p, weightKg: Number(e.target.value) } : p
                                    )
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Carrier & Estimate */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                      บริษัทขนส่ง / บริการ *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น Flash Express, Kerry, รถเหมาตู้ทึบ..."
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                    />
                    {/* Carrier Presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {CARRIER_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCarrier(preset)}
                          className="px-2.5 py-1 rounded-lg text-[11px] bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        ระยะเวลาจัดส่งโดยประมาณ *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น 2 - 3 วันทำการ"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                        value={estimate}
                        onChange={(e) => setEstimate(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ESTIMATE_PRESETS.map((est) => (
                          <button
                            key={est}
                            type="button"
                            onClick={() => setEstimate(est)}
                            className="px-2.5 py-0.5 rounded-lg text-[11px] bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors"
                          >
                            {est}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        ข้อเสนอมีผล (วัน) *
                      </label>
                      <div className="flex items-center gap-2">
                        {VALID_DAYS_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDays(d)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                              days === d
                                ? "bg-amber-500 text-neutral-950 border-amber-500"
                                : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                            }`}
                          >
                            {d} วัน
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-500 mt-1 block">
                        เมื่อหมดอายุ ลูกค้าจะไม่สามารถชำระเงินตามราคานี้ได้
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Shipping Fee */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                    ค่าจัดส่งสุทธิที่เสนอให้ลูกค้า (บาท) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-base">฿</span>
                    <input
                      type="text"
                      required
                      inputMode="decimal"
                      placeholder="0.00"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-10 pr-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-amber-500"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1.5 block">
                    ยอดรวมที่จะเรียกเก็บจากลูกค้าจริง = ยอดสินค้า (฿{q.subtotal}) + ค่าจัดส่งนี้
                  </span>
                </div>

                {/* Terms and Conditions */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                    เงื่อนไขและข้อตกลงการจัดส่ง *
                  </label>
                  <textarea
                    required
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                  <div className="space-y-1 mt-2">
                    <span className="text-[11px] text-neutral-500 block">ข้อความสำเร็จรูป:</span>
                    {TERMS_PRESETS.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTerms(p)}
                        className="block w-full text-left text-[11px] text-neutral-400 hover:text-amber-400 truncate py-0.5"
                      >
                        • {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                {isEditable && (
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-3.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {busy ? "กำลังส่งข้อเสนอ..." : "ส่งข้อเสนอราคาจัดส่งให้ลูกค้า"}
                    </button>
                  </div>
                )}
              </fieldset>

              {message && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium ${
                    message.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          </form>

          {/* Decline Option */}
          {isEditable && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <button
                type="button"
                onClick={() => setShowDeclineBox(!showDeclineBox)}
                className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-rose-400 transition-colors font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5" />
                  กรณีไม่สามารถจัดส่งไปยังที่อยู่นี้ได้ (ปฏิเสธคำขอ)
                </span>
                <span>{showDeclineBox ? "▲ ซ่อน" : "▼ แสดง"}</span>
              </button>

              {showDeclineBox && (
                <div className="mt-3 pt-3 border-t border-neutral-800 space-y-3">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      เหตุผลที่แสดงให้ลูกค้าทราบ *
                    </label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="เช่น ขนส่งไม่รองรับการส่งชิ้นส่วนขนาดยาวเกิน 2.5 เมตรไปยังพื้นที่เกาะ"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={busy || !reason.trim()}
                    onClick={handleDeclineSubmit}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white font-medium text-xs hover:bg-rose-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ยืนยันการปฏิเสธคำขอจัดส่ง
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
