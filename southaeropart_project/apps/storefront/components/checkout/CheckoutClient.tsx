"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";
import { createOrder, getSavedCheckoutAddresses } from "@/actions/checkout.actions";
import {
  ShieldCheck,
  Truck,
  QrCode,
  CreditCard,
  Check,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  MapPin,
  Lock,
  ChevronRight,
} from "lucide-react";
import type { UserAddress } from "@repo/db";

export function CheckoutClient() {
  const router = useRouter();
  const { items, itemCount, subtotal, clearCart, isHydrated } = useCart();

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  // Form Fields
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);

  // Shipping & Payment Method
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "credit_card">("promptpay");

  // State flags
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subtotalNum = parseFloat(subtotal || "0");
  const shippingFeeNum = shippingMethod === "express" ? 450 : subtotalNum >= 15000 ? 0 : 150;
  const totalNum = subtotalNum + shippingFeeNum;

  // Pre-load saved addresses & user details if logged in
  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await getSavedCheckoutAddresses();
        if (res.success && res.addresses && res.addresses.length > 0) {
          setSavedAddresses(res.addresses);
          const defaultAddr = res.addresses.find((a) => a.isDefault) || res.addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            applyAddress(defaultAddr);
          }
        } else if (res.userProfile) {
          setRecipientName(res.userProfile.fullName || "");
          setEmail(res.userProfile.email || "");
          setPhone(res.userProfile.phone || "");
        }
      } catch (err) {
        console.warn("[Checkout] Failed to load saved addresses", err);
      }
    }
    loadUserData();
  }, []);

  function applyAddress(addr: UserAddress) {
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setLine1(addr.line1);
    setLine2(addr.line2 || "");
    setSubDistrict(addr.subDistrict || "");
    setDistrict(addr.district || "");
    setProvince(addr.province || "");
    setPostalCode(addr.postalCode);
  }

  function handleAddressSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelectedAddressId(val);
    if (val === "new") {
      setRecipientName("");
      setPhone("");
      setLine1("");
      setLine2("");
      setSubDistrict("");
      setDistrict("");
      setProvince("");
      setPostalCode("");
    } else {
      const found = savedAddresses.find((a) => a.id === val);
      if (found) applyAddress(found);
    }
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Basic client validation
    if (!recipientName.trim()) {
      setErrorMsg("กรุณาระบุชื่อผู้รับสินค้า");
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMsg("กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 8-10 หลัก)");
      return;
    }
    if (!line1.trim() || !subDistrict.trim() || !district.trim() || !province.trim()) {
      setErrorMsg("กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วน");
      return;
    }
    if (!postalCode.trim() || postalCode.trim().length !== 5) {
      setErrorMsg("กรุณาระบุรหัสไปรษณีย์ 5 หลัก");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("ไม่มีสินค้าในตะกร้า ไม่สามารถสั่งซื้อได้");
      return;
    }

    setLoading(true);

    try {
      const res = await createOrder({
        shippingAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          subDistrict: subDistrict.trim(),
          district: district.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
        },
        shippingMethod,
        paymentMethod,
        saveAddress,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.product.price,
          variant: i.variant,
        })),
      });

      if (res.success && res.orderId) {
        // Clear cart in local storage
        clearCart();
        // Redirect to payment screen
        router.push(`/checkout/payment/${res.orderId}`);
      } else {
        setErrorMsg(res.error || "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
      }
    } catch (err) {
      console.error("[Checkout] Submit error:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่");
      setLoading(false);
    }
  }

  if (!isHydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent-red)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase font-heading tracking-widest text-[var(--text-muted)]">
            PREPARING CHECKOUT...
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-main py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto bg-[#121212] border border-[#222222] rounded-xl p-8 sm:p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] text-[var(--text-muted)] mx-auto flex items-center justify-center mb-4">
            <ShoppingCart size={28} className="text-[var(--accent-red)]" />
          </div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-white">
            ไม่มีสินค้าในตะกร้า
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            กรุณาเลือกชิ้นส่วนแอโรไดนามิกหรือชุดแต่งที่ต้องการสั่งซื้อก่อนดำเนินการ Checkout
          </p>
          <Link href="/products" className="btn-primary mt-6 text-xs inline-flex items-center gap-2">
            BROWSE PRODUCTS <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 md:py-14">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase">
        <Link href="/" className="hover:text-white transition-colors">HOME</Link>
        <span>/</span>
        <Link href="/cart" className="hover:text-white transition-colors">CART</Link>
        <span>/</span>
        <span className="text-[var(--accent-red)]">CHECKOUT</span>
      </nav>

      {/* Header */}
      <div className="pb-6 border-b border-[#222222] mb-8">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-red)] animate-pulse" />
          <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
            SECURE CHECKOUT
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white mt-1">
          DELIVERY &amp; PAYMENT DETAILS
        </h1>
      </div>

      {errorMsg && (
        <div className="mb-8 p-4 bg-red-950/40 border border-red-800 rounded-lg flex items-start gap-3 text-red-200 text-sm">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Form */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Delivery Details & Payment Method */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Customer & Shipping Address */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[var(--accent-red)] text-white font-heading font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                  SHIPPING ADDRESS (ที่อยู่จัดส่ง)
                </h2>
              </div>
              <MapPin size={18} className="text-[var(--text-muted)]" />
            </div>

            {/* Saved Address Selector */}
            {savedAddresses.length > 0 && (
              <div className="mb-5 p-3.5 bg-[#181818] border border-[#2A2A2A] rounded-lg">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-white mb-1.5">
                  USE SAVED ADDRESS (เลือกที่อยู่ที่บันทึกไว้):
                </label>
                <select
                  value={selectedAddressId}
                  onChange={handleAddressSelect}
                  className="w-full bg-[#0E0E0E] border border-[#333333] text-white text-xs rounded px-3 py-2.5 focus:outline-none focus:border-[var(--accent-red)]"
                >
                  {savedAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.recipientName} - {addr.line1}, {addr.subDistrict}, {addr.province} {addr.postalCode}
                    </option>
                  ))}
                  <option value="new">+ กรอกที่อยู่ใหม่ (Enter New Address)</option>
                </select>
              </div>
            )}

            <div className="space-y-4">
              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    RECIPIENT NAME (ชื่อ-นามสกุลผู้รับ) <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="เช่น คุณสมชาย วิริยะ"
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    PHONE NUMBER (เบอร์โทรศัพท์) <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812345678"
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                  EMAIL ADDRESS (อีเมลสำหรับรับใบเสร็จ)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                  ADDRESS (บ้านเลขที่, ถนน, ซอย, หมู่บ้าน/อาคาร) <span className="text-[var(--accent-red)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="123/45 ถนนสุขุมวิท ซอย 55"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                  ADDRESS LINE 2 (ชั้น, ห้อง, จุดสังเกต - ถ้ามี)
                </label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="ชั้น 4 ห้อง 402"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Sub-district & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    SUB-DISTRICT (ตำบล/แขวง) <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subDistrict}
                    onChange={(e) => setSubDistrict(e.target.value)}
                    placeholder="คลองตันเหนือ"
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    DISTRICT (อำเภอ/เขต) <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="วัฒนา"
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Province & Postal Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    PROVINCE (จังหวัด) <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="กรุงเทพมหานคร"
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    POSTAL CODE (รหัสไปรษณีย์) <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="10110"
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="save-address-chk"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="rounded border-[#333333] bg-[#1A1A1A] text-[var(--accent-red)] focus:ring-[var(--accent-red)] w-4 h-4"
                />
                <label htmlFor="save-address-chk" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  บันทึกที่อยู่นี้ไว้ในบัญชีสำหรับการสั่งซื้อครั้งถัดไป
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Method */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#222222] mb-5">
              <div className="w-7 h-7 rounded bg-[var(--accent-red)] text-white font-heading font-bold flex items-center justify-center text-xs">
                2
              </div>
              <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                SHIPPING METHOD (วิธีการจัดส่ง)
              </h2>
            </div>

            <div className="space-y-3">
              {/* Standard */}
              <label
                onClick={() => setShippingMethod("standard")}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                  shippingMethod === "standard"
                    ? "border-[var(--accent-red)] bg-[#1A1112]"
                    : "border-[#222222] bg-[#161616] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      shippingMethod === "standard"
                        ? "border-[var(--accent-red)] bg-[var(--accent-red)]"
                        : "border-[#444444]"
                    }`}
                  >
                    {shippingMethod === "standard" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                      STANDARD LOGISTICS (จัดส่งมาตรฐาน)
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      ระยะเวลา 2-4 วันทำการ • พร้อมประกันความเสียหายพื้นฐาน
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-white">
                    {subtotalNum >= 15000 ? (
                      <span className="text-[var(--success)] uppercase">FREE</span>
                    ) : (
                      "฿150 THB"
                    )}
                  </span>
                </div>
              </label>

              {/* Express */}
              <label
                onClick={() => setShippingMethod("express")}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                  shippingMethod === "express"
                    ? "border-[var(--accent-red)] bg-[#1A1112]"
                    : "border-[#222222] bg-[#161616] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      shippingMethod === "express"
                        ? "border-[var(--accent-red)] bg-[var(--accent-red)]"
                        : "border-[#444444]"
                    }`}
                  >
                    {shippingMethod === "express" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      EXPRESS CRATED FREIGHT (ลังไม้กันกระแทกพิเศษ)
                      <span className="badge-red text-[0.6rem] px-1.5 py-0.5">RECOMMENDED</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      ระยะเวลา 1-2 วันทำการ • ตีโครงไม้ป้องกันชิ้นงานคาร์บอน 100%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-white">
                    ฿450 THB
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#222222] mb-5">
              <div className="w-7 h-7 rounded bg-[var(--accent-red)] text-white font-heading font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                PAYMENT METHOD (ช่องทางการชำระเงิน)
              </h2>
            </div>

            <div className="space-y-3">
              {/* PromptPay QR Code (Primary & Mockup) */}
              <label
                onClick={() => setPaymentMethod("promptpay")}
                className={`flex items-start justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "promptpay"
                    ? "border-[var(--accent-red)] bg-[#1A1112]"
                    : "border-[#222222] bg-[#161616] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-4 h-4 rounded-full border mt-1 flex items-center justify-center ${
                      paymentMethod === "promptpay"
                        ? "border-[var(--accent-red)] bg-[var(--accent-red)]"
                        : "border-[#444444]"
                    }`}
                  >
                    {paymentMethod === "promptpay" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <QrCode size={18} className="text-[var(--accent-red)]" />
                      <p className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                        PROMPTPAY QR CODE (สแกนจ่ายผ่าน QR Code)
                      </p>
                      <span className="badge-red text-[0.6rem] px-1.5 py-0.5">MOCKUP SIMULATOR</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md">
                      รองรับ Mobile Banking ทุกธนาคารในไทย เมื่อกดสั่งซื้อ ระบบจะสร้าง QR Code ให้ผู้ทดสอบสามารถสแกนหรือกดยืนยันการชำระเงินได้ทันที
                    </p>
                  </div>
                </div>
              </label>

              {/* Credit Card Mockup */}
              <label
                onClick={() => setPaymentMethod("credit_card")}
                className={`flex items-start justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "credit_card"
                    ? "border-[var(--accent-red)] bg-[#1A1112]"
                    : "border-[#222222] bg-[#161616] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-4 h-4 rounded-full border mt-1 flex items-center justify-center ${
                      paymentMethod === "credit_card"
                        ? "border-[var(--accent-red)] bg-[var(--accent-red)]"
                        : "border-[#444444]"
                    }`}
                  >
                    {paymentMethod === "credit_card" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-[var(--text-muted)]" />
                      <p className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                        CREDIT / DEBIT CARD (บัตรเครดิต/เดบิต)
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      รองรับ Visa, Mastercard, JCB (ระบบจำลองการตัดบัตร)
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review & Submit CTA */}
        <div className="lg:col-span-5 sticky top-28 space-y-6">
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 shadow-2xl space-y-5">
            <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white pb-3 border-b border-[#222222]">
              ORDER SUMMARY ({itemCount} ITEMS)
            </h2>

            {/* Items List Preview */}
            <div className="max-h-64 overflow-y-auto pr-1 space-y-3 divide-y divide-[#1A1A1A]">
              {items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
                  <div className="w-14 h-14 bg-[#1C1C1C] border border-[#2A2A2A] rounded overflow-hidden relative flex-shrink-0">
                    {item.product.images?.[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[0.6rem] text-[var(--text-muted)] text-center p-1 font-heading">
                        {item.product.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-xs font-bold uppercase text-white truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[0.7rem] text-[var(--text-muted)]">
                      Finish: <span className="text-gray-300">{item.variant || "Gloss Black"}</span>
                    </p>
                    <p className="text-[0.7rem] text-[var(--text-muted)] font-mono">
                      Qty: {item.quantity} × ฿{parseFloat(item.product.price).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right font-heading text-xs font-bold text-white">
                    ฿{(parseFloat(item.product.price) * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-[#222222] space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>SUBTOTAL</span>
                <span className="font-heading font-semibold text-white">
                  ฿{subtotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>SHIPPING FEE</span>
                <span className="font-heading font-semibold text-white">
                  {shippingFeeNum === 0 ? (
                    <span className="text-[var(--success)] uppercase">FREE</span>
                  ) : (
                    `฿${shippingFeeNum.toFixed(2)} THB`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>ESTIMATED VAT (7%)</span>
                <span className="font-heading text-[var(--text-muted)]">INCLUDED IN TOTAL</span>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-[#222222] flex items-baseline justify-between">
              <div>
                <span className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                  GRAND TOTAL
                </span>
                <p className="text-[0.65rem] text-[var(--text-muted)] uppercase">PromptPay / Net</p>
              </div>
              <div className="text-right">
                <span className="font-heading text-2xl font-extrabold text-[var(--accent-red)]">
                  ฿{totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[0.7rem] text-[var(--text-muted)] block font-mono">THB</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              id="place-order-btn"
              className="btn-primary w-full justify-center gap-2 py-4 text-xs tracking-widest font-heading font-bold uppercase shadow-xl shadow-[var(--accent-red)]/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>CREATING ORDER...</span>
                </div>
              ) : (
                <>
                  PLACE ORDER &amp; PAY <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Guarantee */}
            <div className="flex items-center justify-center gap-2 pt-2 text-[0.7rem] text-[var(--text-muted)]">
              <Lock size={12} className="text-[var(--success)]" />
              <span>256-Bit SSL Encrypted &amp; Secure Checkout</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
