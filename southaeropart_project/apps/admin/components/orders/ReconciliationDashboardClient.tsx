"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Search,
  Lock,
  RefreshCw,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Check,
  Info,
} from "lucide-react";
import {
  type ReconciliationJobItem,
  type ReconciliationStateCounts,
  resolveReconciliationJobAction,
} from "@/actions/reconciliation.actions";

interface ReconciliationDashboardClientProps {
  initialItems: ReconciliationJobItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: ReconciliationStateCounts;
  currentSearch: string;
  currentState: string;
  adminRole: string;
}

const STATE_TABS = [
  { key: "all", label: "ทั้งหมด (All)" },
  { key: "pending_review", label: "รอตรวจสอบ (Pending)" },
  { key: "refunded", label: "คืนเงินแล้ว (Refunded)" },
  { key: "fulfilled_manually", label: "ส่งมอบด้วยตนเอง (Fulfilled)" },
  { key: "dismissed", label: "ยกเลิก/เพิกเฉย (Dismissed)" },
];

export function ReconciliationDashboardClient({
  initialItems,
  pagination,
  counts,
  currentSearch,
  currentState,
  adminRole,
}: ReconciliationDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [selectedJob, setSelectedJob] = useState<ReconciliationJobItem | null>(null);
  const [modalAction, setModalAction] = useState<"refund" | "fulfill_manually" | "dismiss">("refund");
  const [resolutionNote, setResolutionNote] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResolve = adminRole === "admin" || adminRole === "super_admin";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (currentState && currentState !== "all") params.set("state", currentState);
    params.set("page", "1");
    router.push(`/orders/reconciliation?${params.toString()}`);
  };

  const handleStateChange = (stateKey: string) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (stateKey !== "all") params.set("state", stateKey);
    params.set("page", "1");
    router.push(`/orders/reconciliation?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (currentState && currentState !== "all") params.set("state", currentState);
    params.set("page", String(newPage));
    router.push(`/orders/reconciliation?${params.toString()}`);
  };

  const openResolutionModal = (job: ReconciliationJobItem) => {
    setSelectedJob(job);
    setModalAction("refund");
    setResolutionNote("");
    setAdminPassword("");
    setModalError(null);
  };

  const closeResolutionModal = () => {
    if (isSubmitting) return;
    setSelectedJob(null);
    setModalError(null);
  };

  const handleConfirmResolution = async () => {
    if (!selectedJob) return;

    if (!resolutionNote.trim() || resolutionNote.trim().length < 5) {
      setModalError("กรุณาระบุบันทึกเหตุผลอย่างน้อย 5 ตัวอักษร");
      return;
    }

    if (modalAction === "refund" && !adminPassword.trim()) {
      setModalError("กรุณาระบุรหัสผ่านแอดมินเพื่อยืนยันการคืนเงิน");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await resolveReconciliationJobAction({
        paymentIntentId: selectedJob.paymentIntentId,
        action: modalAction,
        resolutionNote: resolutionNote.trim(),
        adminPassword: modalAction === "refund" ? adminPassword : undefined,
      });

      if (!res.success) {
        setModalError(res.error || "เกิดข้อผิดพลาดในการดำเนินการ");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setSelectedJob(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setModalError(err?.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-rose-500 w-6 h-6" />
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Payment Reconciliation Queue
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            คิวงานตรวจสอบกรณีการชำระเงินไม่สมบูรณ์ หรือเงินเข้าหลังเวลาจองสต็อกหมด (Operator Resolution Required)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-850 rounded-lg border border-neutral-700/60 transition-colors"
          >
            ← กลับหน้ารายการสั่งซื้อ
          </Link>
          <button
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-850 rounded-lg border border-neutral-700/60 transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <button
          onClick={() => handleStateChange("all")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentState === "all"
              ? "bg-neutral-850 border-neutral-600 shadow-md"
              : "bg-neutral-900/80 border-neutral-800/80 hover:border-neutral-750"
          }`}
        >
          <div className="text-xs text-neutral-400 font-medium">ทั้งหมด</div>
          <div className="text-xl font-bold text-white mt-1">{counts.all}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">รายการทั้งหมดในระบบ</div>
        </button>

        <button
          onClick={() => handleStateChange("pending_review")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentState === "pending_review"
              ? "bg-rose-950/40 border-rose-600 shadow-md ring-1 ring-rose-500/30"
              : "bg-neutral-900/80 border-neutral-800/80 hover:border-rose-900/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">รอตรวจสอบ</span>
            {counts.pendingReview > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-rose-300 mt-1">{counts.pendingReview}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">ต้องดำเนินการ</div>
        </button>

        <button
          onClick={() => handleStateChange("refunded")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentState === "refunded"
              ? "bg-neutral-850 border-amber-600 shadow-md"
              : "bg-neutral-900/80 border-neutral-800/80 hover:border-neutral-750"
          }`}
        >
          <div className="text-xs text-amber-400 font-medium">คืนเงินแล้ว</div>
          <div className="text-xl font-bold text-amber-300 mt-1">{counts.refunded}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">ผ่าน Stripe API</div>
        </button>

        <button
          onClick={() => handleStateChange("fulfilled_manually")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentState === "fulfilled_manually"
              ? "bg-neutral-850 border-emerald-600 shadow-md"
              : "bg-neutral-900/80 border-neutral-800/80 hover:border-neutral-750"
          }`}
        >
          <div className="text-xs text-emerald-400 font-medium">ส่งมอบด้วยตนเอง</div>
          <div className="text-xl font-bold text-emerald-300 mt-1">{counts.fulfilledManually}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">แอดมินยืนยันสต็อก</div>
        </button>

        <button
          onClick={() => handleStateChange("dismissed")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentState === "dismissed"
              ? "bg-neutral-850 border-neutral-500 shadow-md"
              : "bg-neutral-900/80 border-neutral-800/80 hover:border-neutral-750"
          }`}
        >
          <div className="text-xs text-neutral-400 font-medium">ยกเลิก/เพิกเฉย</div>
          <div className="text-xl font-bold text-neutral-300 mt-1">{counts.dismissed}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">ไม่ต้องดำเนินการ</div>
        </button>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/70 p-3 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStateChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                currentState === tab.key
                  ? "bg-red-950/60 text-red-200 border border-red-700/50 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 text-neutral-500" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา Payment Intent, เลขคำสั่งซื้อ..."
            className="w-full bg-neutral-950/80 border border-neutral-800 focus:border-red-600 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
          />
        </form>
      </div>

      {/* ── Table ── */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 uppercase font-semibold tracking-wider text-[11px]">
                <th className="py-3 px-4">วันที่เกิดเหตุ</th>
                <th className="py-3 px-4">Stripe Payment Intent</th>
                <th className="py-3 px-4">คำสั่งซื้อ (Order)</th>
                <th className="py-3 px-4">สาเหตุความผิดปกติ</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4">ผลการตรวจสอบ</th>
                <th className="py-3 px-4 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
              {initialItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <CheckCircle2 size={32} className="mx-auto text-neutral-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium">ไม่พบรายการ Reconciliation ตามเงื่อนไข</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      ระบบปกติ ไม่พบคำสั่งซื้อที่มีปัญหาการชำระเงินค้างอยู่
                    </p>
                  </td>
                </tr>
              ) : (
                initialItems.map((job) => {
                  const isPendingReview = job.state === "pending_review";
                  return (
                    <tr
                      key={job.paymentIntentId}
                      className="hover:bg-neutral-850/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                          <Clock size={13} className="text-neutral-500" />
                          {new Date(job.createdAt).toLocaleString("th-TH", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </td>

                      {/* Payment Intent ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-neutral-200 text-xs flex items-center gap-1.5">
                          <span>{job.paymentIntentId}</span>
                          <a
                            href={`https://dashboard.stripe.com/test/payments/${job.paymentIntentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-500 hover:text-white transition-colors"
                            title="เปิดดูใน Stripe Dashboard"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>

                      {/* Related Order */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {job.orderNumber ? (
                          <div className="flex flex-col">
                            <Link
                              href={`/orders/${job.orderId}`}
                              className="text-red-400 hover:text-red-300 font-semibold hover:underline inline-flex items-center gap-1"
                            >
                              {job.orderNumber}
                            </Link>
                            <span className="text-neutral-400 text-[11px] mt-0.5">
                              {job.orderTotal ? `฿${parseFloat(job.orderTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })}` : "-"}
                              {" · "}
                              <span className="text-neutral-500">{job.orderStatus}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-xs">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                            {job.reason}
                          </span>
                        </div>
                      </td>

                      {/* State Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {job.state === "pending_review" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/70 text-rose-300 border border-rose-800/60">
                            <AlertTriangle size={11} /> รอตรวจสอบ
                          </span>
                        )}
                        {job.state === "refunded" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/60">
                            <RotateCcw size={11} /> คืนเงินแล้ว
                          </span>
                        )}
                        {job.state === "fulfilled_manually" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                            <PackageCheck size={11} /> ส่งมอบแล้ว
                          </span>
                        )}
                        {job.state === "dismissed" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                            <XCircle size={11} /> ยกเลิก
                          </span>
                        )}
                      </td>

                      {/* Resolution details */}
                      <td className="py-3.5 px-4">
                        {job.resolvedAt ? (
                          <div className="text-[11px] text-neutral-400 space-y-0.5 max-w-sm">
                            <div className="text-neutral-300 font-medium">
                              โดย: {job.resolvedByName || job.resolvedByEmail || "แอดมิน"}
                            </div>
                            {job.stripeRefundId && (
                              <div className="font-mono text-amber-400/90">
                                Refund: {job.stripeRefundId}
                              </div>
                            )}
                            {job.resolutionNote && (
                              <div className="text-neutral-400 italic line-clamp-2">
                                &ldquo;{job.resolutionNote}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPendingReview ? (
                          canResolve ? (
                            <button
                              onClick={() => openResolutionModal(job)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-sm transition-colors"
                            >
                              จัดการรายการ
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-500 italic">
                              ต้องใช้สิทธิ์ Admin
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-500 text-[11px]">จัดการแล้ว</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 text-xs text-neutral-400">
            <div>
              หน้า {pagination.page} จาก {pagination.totalPages} (รวม {pagination.total} รายการ)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Resolution Modal Dialog ── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-left text-neutral-200">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="text-red-500 w-5 h-5" />
                  จัดการรายการ Reconciliation
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  กรุณาตรวจสอบรายละเอียดและเลือกวิธีการดำเนินการแก้ไขปัญหาการชำระเงิน
                </p>
              </div>
              <button
                onClick={closeResolutionModal}
                disabled={isSubmitting}
                className="text-neutral-500 hover:text-white p-1 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Job Summary */}
            <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Payment Intent:</span>
                <span className="font-mono text-neutral-200">{selectedJob.paymentIntentId}</span>
              </div>
              {selectedJob.orderNumber && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">คำสั่งซื้อ:</span>
                  <span className="font-semibold text-red-400">{selectedJob.orderNumber}</span>
                </div>
              )}
              {selectedJob.orderTotal && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">ยอดเงิน:</span>
                  <span className="font-semibold text-white">
                    ฿{parseFloat(selectedJob.orderTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">สาเหตุ:</span>
                <span className="font-mono text-amber-400">{selectedJob.reason}</span>
              </div>
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-300">
                เลือกการดำเนินการ (Resolution Action)
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: Refund */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    modalAction === "refund"
                      ? "bg-rose-950/30 border-rose-600/80 ring-1 ring-rose-500/30 text-white"
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolutionAction"
                    value="refund"
                    checked={modalAction === "refund"}
                    onChange={() => setModalAction("refund")}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="font-semibold text-xs text-rose-300 flex items-center gap-1.5">
                      <RotateCcw size={13} />
                      คืนเงินเต็มจำนวนผ่าน Stripe API (Refund)
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      ยิงคำสั่งคืนเงินไปยัง Stripe โดยตรงด้วย Idempotency Key, ปรับสถานะคำสั่งซื้อเป็น `refunded` และคืนสต็อก
                    </div>
                  </div>
                </label>

                {/* Option 2: Fulfill Manually */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    modalAction === "fulfill_manually"
                      ? "bg-emerald-950/30 border-emerald-600/80 ring-1 ring-emerald-500/30 text-white"
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolutionAction"
                    value="fulfill_manually"
                    checked={modalAction === "fulfill_manually"}
                    onChange={() => setModalAction("fulfill_manually")}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-xs text-emerald-300 flex items-center gap-1.5">
                      <PackageCheck size={13} />
                      อนุมัติจัดส่งด้วยตนเอง (Manual Fulfillment)
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      ยืนยันว่าได้รับเงินแล้วและมีสินค้าเพียงพอ ปรับสถานะคำสั่งซื้อเป็น `processing` (ชำระแล้ว) เพื่อส่งต่อฝ่ายแพ็กของ
                    </div>
                  </div>
                </label>

                {/* Option 3: Dismiss */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    modalAction === "dismiss"
                      ? "bg-neutral-800/60 border-neutral-500 ring-1 ring-neutral-400/30 text-white"
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolutionAction"
                    value="dismiss"
                    checked={modalAction === "dismiss"}
                    onChange={() => setModalAction("dismiss")}
                    className="mt-0.5 text-neutral-400 focus:ring-neutral-400"
                  />
                  <div>
                    <div className="font-semibold text-xs text-neutral-300 flex items-center gap-1.5">
                      <XCircle size={13} />
                      ยกเลิก / เพิกเฉย (Dismiss)
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      เพิกเฉยต่อความผิดปกตินี้ (กรณีเป็นรายการทดสอบ หรือได้รับการแก้ไขจากช่องทางอื่นแล้ว)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Note Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                บันทึกเหตุผลการดำเนินการ (Resolution Note) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="ระบุเหตุผล เช่น ลูกค้าแจ้งโอนสำเร็จแต่เวลาหมด, สต็อกมีพอจึงอนุมัติส่งของ หรือ คืนเงินเนื่องจากของหมด..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-600 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>อย่างน้อย 5 ตัวอักษร</span>
                <span>{resolutionNote.length}/2,000</span>
              </div>
            </div>

            {/* Password Re-auth for Refund */}
            {modalAction === "refund" && (
              <div className="space-y-1.5 p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                  <Lock size={12} />
                  ยืนยันรหัสผ่านแอดมิน (Re-authentication) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="ใส่รหัสผ่านของคุณเพื่อยืนยันการคืนเงิน"
                  className="w-full bg-neutral-950 border border-rose-800/60 focus:border-rose-500 rounded-lg p-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-rose-400/80">
                  ⚠️ การคืนเงินผ่าน Stripe จะตัดยอดบัญชีจริงทันทีและไม่สามารถกู้คืนได้
                </p>
              </div>
            )}

            {/* Error Message */}
            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-red-400" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={closeResolutionModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmResolution}
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                  modalAction === "refund"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : modalAction === "fulfill_manually"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-neutral-700 hover:bg-neutral-600"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    ยืนยันการดำเนินการ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
