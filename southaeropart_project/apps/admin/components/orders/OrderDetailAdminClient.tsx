"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  updateOrderStatusAction,
  updateOrderFulfillmentAction,
  assignAdminToOrderAction,
} from "@/actions/order.actions";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  QrCode,
  CreditCard,
  User,
  ShieldCheck,
  Calendar,
  Send,
  AlertTriangle,
  History,
  Check,
  Copy,
} from "lucide-react";

const CARRIERS = [
  "Kerry Express",
  "Flash Express",
  "DHL eCommerce",
  "SCG Express",
  "J&T Express",
  "South Aero Express Crated Logistics",
  "South Aero Private Fleet Delivery",
  "ไปรษณีย์ไทย (EMS)",
];

interface OrderDetailAdminClientProps {
  order: any;
  customer: any;
  items: any[];
  history: any[];
  staffList: any[];
}

export function OrderDetailAdminClient({
  order,
  customer,
  items,
  history,
  staffList,
}: OrderDetailAdminClientProps) {
  const router = useRouter();

  // Status Updater State
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status);
  const [statusNote, setStatusNote] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // Fulfillment State
  const [trackingNumber, setTrackingNumber] = useState<string>(order.trackingNumber || "");
  const [shippingCarrier, setShippingCarrier] = useState<string>(order.shippingCarrier || CARRIERS[0]);
  const [markAsShipped, setMarkAsShipped] = useState<boolean>(true);
  const [fulfillmentNote, setFulfillmentNote] = useState<string>("");
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState<boolean>(false);
  const [fulfillmentSuccess, setFulfillmentSuccess] = useState<string | null>(null);

  // Assign Admin State
  const [assignedAdminId, setAssignedAdminId] = useState<string>(order.assignedAdminId || "");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);

  function copyOrderNumber() {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setStatusSuccess(null);

    const res = await updateOrderStatusAction({
      orderId: order.id,
      status: selectedStatus as any,
      note: statusNote.trim(),
    });

    if (res.success) {
      setStatusSuccess(res.message || "อัปเดตสถานะสำเร็จ");
      setStatusNote("");
      router.refresh();
      setTimeout(() => setStatusSuccess(null), 3000);
    }
    setIsUpdatingStatus(false);
  }

  async function handleUpdateFulfillment(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsUpdatingFulfillment(true);
    setFulfillmentSuccess(null);

    const res = await updateOrderFulfillmentAction({
      orderId: order.id,
      trackingNumber: trackingNumber.trim(),
      shippingCarrier: shippingCarrier.trim(),
      markAsShipped,
      note: fulfillmentNote.trim(),
    });

    if (res.success) {
      setFulfillmentSuccess("บันทึกข้อมูลการจัดส่งสำเร็จ");
      setFulfillmentNote("");
      router.refresh();
      setTimeout(() => setFulfillmentSuccess(null), 3000);
    }
    setIsUpdatingFulfillment(false);
  }

  async function handleAssignAdmin(e: React.ChangeEvent<HTMLSelectElement>) {
    const adminId = e.target.value || null;
    setAssignedAdminId(adminId || "");
    setIsAssigning(true);

    await assignAdminToOrderAction({
      orderId: order.id,
      adminId,
    });

    router.refresh();
    setIsAssigning(false);
  }

  const isPaid = order.paymentStatus === "paid" || order.status === "paid";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/orders" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft size={13} /> รายการคำสั่งซื้อ
        </Link>
        <span>/</span>
        <span className="text-white font-mono font-bold">{order.orderNumber}</span>
      </div>

      {/* Header Bar */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-mono">
              {order.orderNumber}
            </h1>
            <button
              onClick={copyOrderNumber}
              className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="คัดลอกหมายเลขคำสั่งซื้อ"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            {/* Status Badge */}
            {order.status === "delivered" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400 uppercase">
                <CheckCircle2 size={12} /> Delivered
              </span>
            ) : order.status === "shipped" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/60 border border-blue-800 text-blue-400 uppercase">
                <Truck size={12} /> Shipped
              </span>
            ) : order.status === "processing" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/60 border border-indigo-800 text-indigo-400 uppercase">
                <Package size={12} /> Processing
              </span>
            ) : order.status === "paid" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400 uppercase">
                <CheckCircle2 size={12} /> Paid
              </span>
            ) : order.status === "cancelled" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-950/60 border border-red-800 text-red-400 uppercase">
                <XCircle size={12} /> Cancelled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-800 text-amber-400 uppercase">
                <Clock size={12} /> Pending
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-2">
            <Calendar size={13} />
            <span>
              สั่งซื้อเมื่อ {new Date(order.createdAt).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        </div>

        {/* Assigned Admin Selector */}
        <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-2 text-xs">
          <User size={15} className="text-gray-400" />
          <span className="text-gray-400 whitespace-nowrap">ผู้ดูแลออเดอร์:</span>
          <select
            value={assignedAdminId}
            onChange={handleAssignAdmin}
            disabled={isAssigning}
            className="bg-[#121212] border border-[#333333] text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:border-red-500"
          >
            <option value="">- ยังไม่ระบุแอดมิน -</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Items & History) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Items Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-[#222222] flex items-center justify-between">
              <span>รายการสินค้า ({items.length} รายการ)</span>
              <Package size={16} className="text-gray-400" />
            </h2>

            <div className="divide-y divide-[#1C1C1C]">
              {items.map((it) => (
                <div key={it.id} className="py-4 first:pt-0 flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg overflow-hidden relative flex-shrink-0">
                    {it.imageUrl ? (
                      <Image
                        src={it.imageUrl}
                        alt={it.productNameSnapshot}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[0.6rem] text-gray-500 font-mono">
                        AERO
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {it.productNameSnapshot}
                    </h3>
                    {it.sku && (
                      <p className="text-[0.7rem] text-gray-400 font-mono">
                        SKU: <span className="text-gray-300">{it.sku}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      จำนวน: {it.quantity} × ฿{parseFloat(it.unitPrice).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-white">
                      ฿{parseFloat(it.lineTotal).toLocaleString()}
                    </span>
                    <span className="text-[0.65rem] text-gray-500 block font-mono">THB</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-[#222222] space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>ยอดรวมสินค้า (Subtotal)</span>
                <span className="font-mono font-semibold text-white">
                  ฿{parseFloat(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>ค่าจัดส่ง (Shipping Fee)</span>
                <span className="font-mono font-semibold text-white">
                  {parseFloat(order.shippingFee) === 0 ? (
                    <span className="text-emerald-400 uppercase">FREE</span>
                  ) : (
                    `฿${parseFloat(order.shippingFee).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                <span className="text-gray-500">รวมในยอดสุทธิแล้ว</span>
              </div>
              <div className="pt-3 border-t border-[#222222] flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">ยอดชำระสุทธิ (Grand Total)</span>
                <span className="text-xl font-extrabold text-red-500 font-mono">
                  ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail & Status History Timeline */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-[#222222] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History size={16} className="text-red-500" />
                ประวัติการเปลี่ยนสถานะ (Status Audit Trail)
              </span>
              <span className="text-xs text-gray-500 font-mono">{history.length} รายการ</span>
            </h2>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#222222]">
              {history.map((hist, idx) => (
                <div key={hist.id || idx} className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-[#1C1C1C] border border-[#333333] text-gray-300 flex items-center justify-center flex-shrink-0 z-10 text-[0.7rem] font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 bg-[#161616] border border-[#262626] rounded-lg p-3.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold uppercase tracking-wider text-white">
                        สถานะ: <span className="text-red-400">{hist.status}</span>
                      </span>
                      <span className="text-[0.7rem] text-gray-500 font-mono">
                        {new Date(hist.createdAt).toLocaleString("th-TH")}
                      </span>
                    </div>
                    {hist.note && <p className="text-gray-300 mt-1 leading-relaxed">{hist.note}</p>}
                    <p className="text-[0.65rem] text-gray-500 mt-1.5 font-mono">
                      ดำเนินการโดย: <span className="text-gray-400">{hist.adminName || "ระบบ / Storefront"}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Actions & Info) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Status Updater Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#222222] flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-red-500" />
              เปลี่ยนสถานะคำสั่งซื้อ (Update Status)
            </h3>

            {statusSuccess && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-300 text-xs">
                {statusSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-[0.7rem] text-gray-400 uppercase mb-1">
                  เลือกสถานะใหม่:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500"
                >
                  <option value="pending">pending (รอชำระเงิน)</option>
                  <option value="paid">paid (ชำระเงินแล้ว)</option>
                  <option value="processing">processing (กำลังจัดเตรียมสินค้า)</option>
                  <option value="shipped">shipped (จัดส่งสินค้าแล้ว)</option>
                  <option value="delivered">delivered (จัดส่งสำเร็จ)</option>
                  <option value="cancelled">cancelled (ยกเลิกคำสั่งซื้อ)</option>
                  <option value="refunded">refunded (คืนเงินเรียบร้อย)</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.7rem] text-gray-400 uppercase mb-1">
                  หมายเหตุ / บันทึก (Audit Note):
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="ระบุเหตุผลหรือบันทึกภายในสำหรับการเปลี่ยนสถานะ..."
                  rows={2}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 placeholder:text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Send size={13} />
                {isUpdatingStatus ? "กำลังบันทึก..." : "บันทึกสถานะใหม่"}
              </button>
            </form>
          </div>

          {/* Fulfillment & Tracking Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#222222] flex items-center gap-1.5">
              <Truck size={14} className="text-blue-400" />
              การจัดส่งและเลขพัสดุ (Fulfillment)
            </h3>

            {fulfillmentSuccess && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-300 text-xs">
                {fulfillmentSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateFulfillment} className="space-y-3">
              <div>
                <label className="block text-[0.7rem] text-gray-400 uppercase mb-1">
                  บริษัทขนส่ง:
                </label>
                <input
                  type="text"
                  list="carriers-list"
                  value={shippingCarrier}
                  onChange={(e) => setShippingCarrier(e.target.value)}
                  placeholder="เช่น Kerry Express, Flash"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                />
                <datalist id="carriers-list">
                  {CARRIERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[0.7rem] text-gray-400 uppercase mb-1">
                  หมายเลขพัสดุ (Tracking Number):
                </label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="เช่น TH1234567890K"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mark-shipped-chk"
                  checked={markAsShipped}
                  onChange={(e) => setMarkAsShipped(e.target.checked)}
                  className="rounded border-[#333333] bg-[#1A1A1A] text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                />
                <label htmlFor="mark-shipped-chk" className="text-xs text-gray-300 cursor-pointer">
                  เปลี่ยนสถานะเป็น &quot;จัดส่งแล้ว (Shipped)&quot; ทันที
                </label>
              </div>

              <button
                type="submit"
                disabled={isUpdatingFulfillment}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Truck size={13} />
                {isUpdatingFulfillment ? "กำลังบันทึก..." : "บันทึกเลขพัสดุ"}
              </button>
            </form>
          </div>

          {/* Customer Details Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 shadow-xl space-y-3 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider pb-2 border-b border-[#222222] flex items-center gap-1.5">
              <MapPin size={14} className="text-red-500" />
              ข้อมูลลูกค้าและที่อยู่จัดส่ง
            </h3>

            <div className="space-y-1.5">
              <p className="font-bold text-white text-sm">{order.shippingAddress.recipientName}</p>
              <p className="text-gray-400 font-mono">{order.shippingAddress.phone}</p>
              {customer?.email && (
                <p className="text-gray-400 font-mono text-[0.7rem]">{customer.email}</p>
              )}
            </div>

            <div className="pt-2 border-t border-[#1C1C1C] text-gray-300 leading-relaxed">
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.subDistrict}, {order.shippingAddress.district},{" "}
                {order.shippingAddress.province} {order.shippingAddress.postalCode}
              </p>
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 shadow-xl space-y-3 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider pb-2 border-b border-[#222222] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              การชำระเงิน (Payment Info)
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">ช่องทาง:</span>
                <span className="text-white font-medium flex items-center gap-1">
                  {order.paymentMethod === "promptpay" ? (
                    <QrCode size={13} className="text-red-500" />
                  ) : (
                    <CreditCard size={13} className="text-blue-400" />
                  )}
                  {order.paymentMethod === "promptpay" ? "PromptPay QR" : "Credit Card"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">สถานะชำระ:</span>
                <span className={`font-bold uppercase ${isPaid ? "text-emerald-400" : isCancelled ? "text-red-400" : "text-amber-400"}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.omiseChargeId && (
                <div className="pt-2 border-t border-[#1C1C1C]">
                  <span className="text-gray-500 block text-[0.65rem] uppercase font-mono">
                    TRANSACTION CHARGE ID:
                  </span>
                  <span className="text-gray-300 font-mono text-[0.7rem] break-all">
                    {order.omiseChargeId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
