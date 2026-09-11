"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
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
import { CheckoutPageSkeleton } from "@/components/ui/skeleton";

export function CheckoutClient() {
  const router = useRouter();
  const { items, itemCount, subtotal, clearCart, isHydrated } = useCart();
  const { formatPrice, currency } = useCurrency();
  const { lang, t } = useLanguage();

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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subtotalNum = parseFloat(subtotal || "0");
  const shippingFeeNum = shippingMethod === "express" ? 450 : subtotalNum >= 15000 ? 0 : 150;
  const totalNum = subtotalNum + shippingFeeNum;

  // Pre-load saved addresses & user details if logged in
  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await getSavedCheckoutAddresses();
        // Always pre-fill email with signed-in account email if available
        if (res.userProfile?.email) {
          setEmail((prev) => prev || res.userProfile!.email);
        }
        if (res.success && res.addresses && res.addresses.length > 0) {
          setSavedAddresses(res.addresses);
          const defaultAddr = res.addresses.find((a) => a.isDefault) || res.addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            applyAddress(defaultAddr);
          }
        } else if (res.userProfile) {
          setRecipientName((prev) => prev || res.userProfile!.fullName || "");
          setPhone((prev) => prev || res.userProfile!.phone || "");
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
        setIsRedirecting(true);
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("southaero_clear_cart", "1");
          }
        } catch {
          // ignore sessionStorage error
        }
        // Redirect directly to payment screen without flashing empty cart
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
    return <CheckoutPageSkeleton />;
  }

  if (items.length === 0 && !isRedirecting) {
    return (
      <div className="container-main py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto bg-[#121212] border border-[#222222] rounded-xl p-8 sm:p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] text-[var(--text-muted)] mx-auto flex items-center justify-center mb-4">
            <ShoppingCart size={28} className="text-[var(--accent-red)]" />
          </div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-white">
            {lang === "th" ? "ไม่มีสินค้าในตะกร้า" : "YOUR CART IS EMPTY"}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {t.checkout.emptyCartNotice}
          </p>
          <Link href="/products" className="btn-primary mt-6 text-xs inline-flex items-center gap-2">
            {t.cartPage.browseParts} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 md:py-14">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase">
        <Link href="/" className="hover:text-white transition-colors">{t.nav.home}</Link>
        <span>/</span>
        <Link href="/cart" className="hover:text-white transition-colors">{t.cartPage.cartTitle}</Link>
        <span>/</span>
        <span className="text-[var(--accent-red)]">{t.checkout.title}</span>
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
          {t.checkout.title}
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {t.checkout.subtitle}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-8 p-4 bg-red-950/50 border border-red-800 rounded-xl flex items-start gap-3.5 text-red-200 text-sm shadow-xl">
          <AlertCircle size={20} className="text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-heading font-bold text-white text-xs uppercase tracking-wider block mb-1">
              {lang === "th" ? "ไม่สามารถดำเนินการสั่งซื้อได้ (INSUFFICIENT STOCK / ORDER BLOCKED)" : "ORDER CANNOT PROCEED (INSUFFICIENT STOCK)"}
            </span>
            <span className="leading-relaxed text-xs sm:text-sm text-gray-200">{errorMsg}</span>
            <div className="mt-3">
              <Link
                href="/cart"
                className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[var(--accent-red)] hover:text-red-400 uppercase tracking-wider underline transition-colors"
              >
                <ShoppingCart size={13} /> {lang === "th" ? "กลับไปแก้ไขจำนวนสินค้าในตะกร้า (RETURN TO CART) →" : "Return to cart to adjust items →"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Form */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-start">
        {/* Left Column: Delivery Details & Payment Method */}
        <div className="md:col-span-7 lg:col-span-7 space-y-6 sm:space-y-8">
          {/* Section 1: Customer & Shipping Address */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-6 md:p-7 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[var(--accent-red)] text-white font-heading font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                  {t.checkout.shippingInfo}
                </h2>
              </div>
              <MapPin size={18} className="text-[var(--text-muted)]" />
            </div>

            {/* Saved Address Selector */}
            {savedAddresses.length > 0 && (
              <div className="mb-5 p-3.5 bg-[#181818] border border-[#2A2A2A] rounded-lg">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-white mb-1.5">
                  {t.checkout.savedAddresses}:
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
                  <option value="new">{t.checkout.newAddress}</option>
                </select>
              </div>
            )}

            <div className="space-y-4">
              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    {t.checkout.recipientName} <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={lang === "th" ? "เช่น คุณสมชาย วิริยะ" : "e.g. John Doe"}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    {t.checkout.phone} <span className="text-[var(--accent-red)]">*</span>
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
                  {t.checkout.email}
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
                  {t.checkout.addressLine1} <span className="text-[var(--accent-red)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder={lang === "th" ? "123/45 ถนนสุขุมวิท ซอย 55" : "123 Sukhumvit Road"}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                  {t.checkout.addressLine2}
                </label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder={lang === "th" ? "ชั้น 4 ห้อง 402 (ถ้ามี)" : "Apt / Suite / Unit (Optional)"}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Sub-district & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    {t.checkout.subDistrict} <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subDistrict}
                    onChange={(e) => setSubDistrict(e.target.value)}
                    placeholder={lang === "th" ? "คลองตันเหนือ" : "Sub-district"}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    {t.checkout.district} <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={lang === "th" ? "วัฒนา" : "District"}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Province & Postal Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    {t.checkout.province} <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder={lang === "th" ? "กรุงเทพมหานคร" : "Bangkok"}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-1.5">
                    {t.checkout.postalCode} <span className="text-[var(--accent-red)]">*</span>
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
                  {t.checkout.saveToProfile}
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
                {t.checkout.shippingMethod}
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
                      {t.checkout.standardShipping}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {t.checkout.standardShippingDesc}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-white">
                    {subtotalNum >= 15000 ? (
                      <span className="text-[var(--success)] uppercase">{t.checkout.free}</span>
                    ) : (
                      formatPrice(150, { showCode: true })
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
                      {t.checkout.expressShipping}
                      <span className="badge-red text-[0.6rem] px-1.5 py-0.5">{t.checkout.recommended}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {t.checkout.expressShippingDesc}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-white">
                    {formatPrice(450, { showCode: true })}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-6 md:p-7 shadow-xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#222222] mb-5">
              <div className="w-7 h-7 rounded bg-[var(--accent-red)] text-white font-heading font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                {t.checkout.paymentMethod}
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
                        {t.checkout.promptpayTitle}
                      </p>
                      <span className="badge-red text-[0.6rem] px-1.5 py-0.5">{t.checkout.mockupSimulator}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md">
                      {t.checkout.promptpayDesc}
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
                        {t.checkout.cardTitle}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {t.checkout.cardMockupDesc}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review & Submit CTA */}
        <div className="md:col-span-5 lg:col-span-5 sticky top-24 md:top-28 space-y-6">
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-6 shadow-2xl space-y-5">
            <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white pb-3 border-b border-[#222222]">
              {t.checkout.orderSummary} {t.checkout.itemsCount.replace("{count}", String(itemCount))}
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
                      {t.checkout.finish} <span className="text-gray-300">{item.variant || "Gloss Black"}</span>
                    </p>
                    <p className="text-[0.7rem] text-[var(--text-muted)] font-mono">
                      {t.checkout.qty} {item.quantity} × {formatPrice(item.product.price)}
                    </p>
                  </div>
                  <div className="text-right font-heading text-xs font-bold text-white">
                    {formatPrice(parseFloat(item.product.price) * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-[#222222] space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>{t.checkout.subtotal}</span>
                <span className="font-heading font-semibold text-white">
                  {formatPrice(subtotalNum, { showCode: true })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>{t.checkout.shippingFee}</span>
                <span className="font-heading font-semibold text-white">
                  {shippingFeeNum === 0 ? (
                    <span className="text-[var(--success)] uppercase">{t.checkout.free}</span>
                  ) : (
                    formatPrice(shippingFeeNum, { showCode: true })
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>{t.checkout.estimatedVat}</span>
                <span className="font-heading text-[var(--text-muted)]">{t.checkout.includedInTotal}</span>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-[#222222] flex flex-col space-y-1">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                    {t.checkout.grandTotal}
                  </span>
                  <p className="text-[0.65rem] text-[var(--text-muted)] uppercase">PromptPay / Net</p>
                </div>
                <div className="text-right">
                  <span className="font-heading text-2xl font-extrabold text-[var(--accent-red)]">
                    {formatPrice(totalNum)}
                  </span>
                  <span className="text-[0.7rem] text-[var(--text-muted)] block font-mono">{currency}</span>
                </div>
              </div>

              {currency !== "THB" && (
                <p className="text-[0.65rem] text-[var(--text-muted)] text-right pt-1 font-sans">
                  {t.checkout.actualChargeNotice.replace("{amount}", totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 }))}
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-300 flex items-start gap-2">
                <AlertCircle size={15} className="text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading || isRedirecting}
              id="place-order-btn"
              className="btn-primary w-full justify-center gap-2 py-4 text-xs tracking-widest font-heading font-bold uppercase shadow-xl shadow-[var(--accent-red)]/20 disabled:opacity-50"
            >
              {isRedirecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.checkout.redirecting}</span>
                </div>
              ) : loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.checkout.creatingOrder}</span>
                </div>
              ) : (
                <>
                  {t.checkout.placeOrder} <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Guarantee */}
            <div className="flex items-center justify-center gap-2 pt-2 text-[0.7rem] text-[var(--text-muted)]">
              <Lock size={12} className="text-[var(--success)]" />
              <span>{t.checkout.secureNotice}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
