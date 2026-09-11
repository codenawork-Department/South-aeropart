"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Globe,
  Truck,
  CreditCard,
  QrCode as QrIcon,
  ExternalLink,
} from "lucide-react";
import type { Order, OrderItem, Address } from "@repo/db";
import type { OrderItemBundlePartDetail } from "@/actions/checkout.actions";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedOrderItemName } from "@/lib/i18n-helpers";
import { thaiBahtText } from "@/lib/thai-baht-text";
import { Currency, SUPPORTED_CURRENCIES, formatPrice as formatPriceWithCurrency } from "@/lib/currency";

interface InvoiceClientProps {
  order: Order;
  items: (OrderItem & {
    productName?: string | null;
    productNameEn?: string | null;
    bundleParts?: OrderItemBundlePartDetail[];
  })[];
  guestToken?: string;
}

export function InvoiceClient({ order, items, guestToken }: InvoiceClientProps) {
  const { lang, t } = useLanguage();
  const { currency: contextCurrency, rates } = useCurrency();
  const [activeCurrency, setActiveCurrency] = useState<Currency>(() => {
    // Default to order currency or active context currency
    if (order.currency && SUPPORTED_CURRENCIES.includes(order.currency as Currency)) {
      return order.currency as Currency;
    }
    return contextCurrency;
  });

  const formatActivePrice = (
    amount: number | string,
    options?: { showCode?: boolean }
  ) => {
    return formatPriceWithCurrency(amount, activeCurrency, rates, options);
  };

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const isPaid = order.paymentStatus === "paid" || order.status === "paid";
  const isThaiMode = activeCurrency === "THB";

  // Generate cryptographic verification QR Code
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const verificationUrl = `${origin}/orders/${order.id}${guestToken ? `?token=${guestToken}` : ""}`;

    QRCode.toDataURL(verificationUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#111111",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [order.id, guestToken]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Convert numbers based on activeCurrency
  const orderSubtotalNum = parseFloat(order.subtotal);
  const orderTaxNum = parseFloat(order.taxAmount);
  const orderShippingNum = parseFloat(order.shippingFee);
  const orderTotalNum = parseFloat(order.total);

  // For Thai THB tax invoice: calculate pre-tax subtotal if VAT is included in total
  const preTaxSubtotalTHB = Math.max(0, orderTotalNum - orderTaxNum - orderShippingNum);

  // Formatted amounts in activeCurrency
  const displaySubtotal = isThaiMode
    ? `฿${preTaxSubtotalTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : formatActivePrice(order.subtotal);

  const displayVat = isThaiMode
    ? `฿${orderTaxNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "0.00 (0% VAT Export)";

  const displayShipping = orderShippingNum === 0
    ? t.invoice.freeShipping
    : isThaiMode
      ? `฿${orderShippingNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : formatActivePrice(order.shippingFee);

  const displayGrandTotal = isThaiMode
    ? `฿${orderTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`
    : formatActivePrice(order.total, { showCode: true });

  const amountInWords = isThaiMode ? thaiBahtText(orderTotalNum) : "";

  const shippingAddr = (order.shippingAddress || {}) as Address;
  const billingAddr = (order.billingAddress || order.shippingAddress || {}) as Address;
  const hasDistinctBilling = Boolean(
    order.billingAddress &&
    (order.billingAddress.line1 !== order.shippingAddress.line1 ||
     order.billingAddress.recipientName !== order.shippingAddress.recipientName)
  );

  const formattedIssueDate = new Date(order.createdAt).toLocaleDateString(
    lang === "th" ? "th-TH" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-200 py-6 sm:py-10 print:p-0 print:bg-white print:text-black">
      {/* ------------------------------------------------------------- */}
      {/* Top Action Bar (Hidden in Print)                              */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6 print:hidden">
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/orders/${order.id}${guestToken ? `?token=${guestToken}` : ""}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1F1F1F] hover:bg-[#2A2A2A] text-xs font-heading font-semibold uppercase tracking-wider text-white border border-white/10 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>{t.invoice.backToOrder}</span>
            </Link>
            <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
              #{order.orderNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Currency switcher for invoice preview */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <Globe size={13} className="text-red-500" />
              <span className="text-[0.68rem] font-mono text-neutral-400 uppercase hidden sm:inline">
                {t.invoice.switchCurrency}
              </span>
              <div className="flex items-center gap-1">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCurrency(c)}
                    className={`px-2 py-0.5 rounded text-[0.7rem] font-mono transition-colors ${
                      activeCurrency === c
                        ? "bg-red-600 text-white font-bold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs py-2.5 px-5 gap-2 font-heading uppercase bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-950/50 cursor-pointer"
            >
              <Printer size={15} />
              <span>{t.invoice.printButton}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Official A4 Document Card (Screen & Print Render)             */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-4xl mx-auto bg-white text-[#111111] p-6 sm:p-12 sm:rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:p-0 print:max-w-full font-sans text-xs leading-relaxed border border-neutral-200 print:border-0 relative overflow-hidden">
        
        {/* Document Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-[#111111]">
          {/* Company Identity */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 bg-red-600 inline-block" />
              <h1 className="font-heading text-xl sm:text-2xl font-black tracking-wider uppercase text-black">
                SOUTH AERO
              </h1>
            </div>
            <p className="font-heading text-[0.68rem] tracking-widest font-bold uppercase text-neutral-500">
              HIGH-PERFORMANCE AERODYNAMICS & CARBON COMPOSITES
            </p>

            <div className="pt-2 text-[0.72rem] text-neutral-700 space-y-0.5 font-sans">
              <p className="font-bold text-black">{t.invoice.companyName}</p>
              <p>{isThaiMode ? t.invoice.companyAddress : t.invoice.companyAddress}</p>
              <p>
                <strong className="text-black">{t.invoice.taxId}</strong>{" "}
                <span className="font-mono font-bold tracking-wider">{t.invoice.companyTaxId}</span>{" "}
                ({t.invoice.headOffice})
              </p>
              <p>
                <span>{t.invoice.phone} {t.invoice.companyPhone}</span> •{" "}
                <span>{t.invoice.email} {t.invoice.companyEmail}</span>
              </p>
            </div>
          </div>

          {/* Document Title & Reference Box */}
          <div className="text-left sm:text-right space-y-1 sm:min-w-[260px]">
            <div className="inline-block px-3 py-1 bg-[#111111] text-white rounded text-[0.7rem] font-heading font-black tracking-wider uppercase mb-1">
              {isPaid
                ? isThaiMode
                  ? t.invoice.officialTaxInvoice
                  : t.invoice.commercialInvoice
                : t.invoice.proformaInvoice}
            </div>
            <p className="text-[0.65rem] font-bold text-neutral-500 tracking-wider">
              {t.invoice.original}
            </p>

            <div className="pt-2 text-[0.72rem] text-neutral-700 space-y-1 font-mono">
              <p>
                <span className="text-neutral-500">{t.invoice.invoiceNo}</span>{" "}
                <strong className="text-black font-bold tracking-wider">
                  INV-{order.orderNumber}
                </strong>
              </p>
              <p>
                <span className="text-neutral-500">{t.invoice.orderRef}</span>{" "}
                <span className="text-black font-bold">#{order.orderNumber}</span>
              </p>
              <p>
                <span className="text-neutral-500">{t.invoice.issueDate}</span>{" "}
                <span className="text-black">{formattedIssueDate}</span>
              </p>
              <p className="pt-1 flex items-center sm:justify-end gap-1.5">
                <span className="text-neutral-500">{t.invoice.paymentStatus}</span>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    <CheckCircle2 size={11} /> {t.invoice.paidStatus}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    <Clock size={11} /> {t.invoice.unpaidStatus}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Destination Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-neutral-200 text-[0.72rem]">
          {/* Buyer / Billing Info */}
          <div className="space-y-1">
            <span className="font-heading font-bold uppercase tracking-wider text-black block pb-1 border-b border-neutral-200 text-[0.7rem]">
              {t.invoice.buyer}
            </span>
            <p className="font-bold text-black text-sm pt-1">
              {billingAddr.recipientName || shippingAddr.recipientName}
            </p>
            <p className="text-neutral-700 leading-relaxed">
              {billingAddr.line1}
              {billingAddr.line2 ? ` ${billingAddr.line2}` : ""},{" "}
              {billingAddr.subDistrict}, {billingAddr.district},{" "}
              {billingAddr.province} {billingAddr.postalCode}
            </p>
            <p className="text-neutral-600 font-mono">
              Tel: {billingAddr.phone || shippingAddr.phone}
              {(billingAddr.email || shippingAddr.email) && (
                <span> • Email: {billingAddr.email || shippingAddr.email}</span>
              )}
            </p>
          </div>

          {/* Shipping / Consignee Info */}
          <div className="space-y-1">
            <span className="font-heading font-bold uppercase tracking-wider text-black block pb-1 border-b border-neutral-200 text-[0.7rem]">
              {t.invoice.shippingAddress}
            </span>
            <p className="font-bold text-black text-sm pt-1">
              {shippingAddr.recipientName}
            </p>
            <p className="text-neutral-700 leading-relaxed">
              {shippingAddr.line1}
              {shippingAddr.line2 ? ` ${shippingAddr.line2}` : ""},{" "}
              {shippingAddr.subDistrict}, {shippingAddr.district},{" "}
              {shippingAddr.province} {shippingAddr.postalCode}
            </p>
            <div className="pt-1 font-mono text-[0.7rem] text-neutral-600 space-y-0.5">
              <p>
                <strong>Carrier:</strong> {order.shippingCarrier || "South Aero Standard Logistics"}
              </p>
              {order.trackingNumber && (
                <p>
                  <strong>Tracking #:</strong> {order.trackingNumber}
                </p>
              )}
              {!isThaiMode && (
                <p className="text-neutral-500">
                  <strong>Terms of Delivery:</strong> DAP (Delivered at Place) / Express Courier
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#111111] text-[0.68rem] font-heading font-black uppercase tracking-wider text-black">
                <th className="py-2.5 w-10 text-center">{t.invoice.itemNo}</th>
                <th className="py-2.5 pl-2">{t.invoice.itemDescription}</th>
                <th className="py-2.5 w-24 text-center font-mono">{t.invoice.hsCode}</th>
                <th className="py-2.5 w-16 text-center">{t.invoice.quantity}</th>
                <th className="py-2.5 w-28 text-right font-mono">{t.invoice.unitPrice}</th>
                <th className="py-2.5 w-32 text-right font-mono">{t.invoice.lineTotal}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-[0.72rem]">
              {items.map((it, idx) => {
                const localizedTitle = getLocalizedOrderItemName(
                  it.productNameSnapshot,
                  it.productNameEn,
                  lang
                );

                const itemUnitPriceFormatted = isThaiMode
                  ? `฿${parseFloat(it.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : formatActivePrice(it.unitPrice);

                const itemLineTotalFormatted = isThaiMode
                  ? `฿${parseFloat(it.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : formatActivePrice(it.lineTotal);

                return (
                  <tr key={it.id} className="align-top">
                    <td className="py-3 text-center font-mono text-neutral-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 pl-2 pr-4">
                      <p className="font-bold text-black text-[0.78rem] leading-snug">
                        {localizedTitle}
                      </p>
                      {/* Bundle Parts list if Kit */}
                      {it.bundleParts && it.bundleParts.length > 0 && (
                        <div className="mt-1 pl-2 border-l-2 border-red-500 space-y-0.5 text-[0.68rem] text-neutral-600">
                          <p className="font-bold text-neutral-700">INCLUDED KIT PARTS:</p>
                          {it.bundleParts.map((bp) => {
                            const partTitle = getLocalizedOrderItemName(
                              bp.childProductNameSnapshot,
                              bp.childProductNameEn,
                              lang
                            );
                            return (
                              <p key={bp.id}>
                                • {partTitle} × {bp.quantity}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center font-mono text-neutral-600 text-[0.68rem]">
                      8708.29.90
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-black">
                      {it.quantity}
                    </td>
                    <td className="py-3 text-right font-mono text-neutral-700">
                      {itemUnitPriceFormatted}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-black">
                      {itemLineTotalFormatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals & Legal Declarations */}
        <div className="pt-4 border-t-2 border-[#111111] grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Legal Notes & QR Digital Stamp */}
          <div className="md:col-span-7 space-y-3 text-[0.68rem] text-neutral-600 leading-relaxed">
            {/* Amount in Words for Thai Law */}
            {isThaiMode && amountInWords && (
              <div className="p-2.5 bg-neutral-100 rounded border border-neutral-200">
                <span className="font-bold text-black">{t.invoice.totalInWords}</span>{" "}
                <span className="font-bold text-red-700 underline underline-offset-2">
                  ({amountInWords})
                </span>
              </div>
            )}

            {/* International Export Zero-Rate Note */}
            {!isThaiMode && (
              <div className="p-2.5 bg-neutral-100 rounded border border-neutral-200 space-y-1">
                <p className="font-bold text-black flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>EXPORT CUSTOMS & TAX COMPLIANCE NOTICE</span>
                </p>
                <p>{t.invoice.exportZeroRateNotice}</p>
                <p className="font-mono text-[0.65rem] text-neutral-500">
                  {t.invoice.statutoryNotice}:{" "}
                  <strong className="text-black">
                    ฿{orderTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </strong>
                </p>
              </div>
            )}

            {/* Verification QR & Payment Details */}
            <div className="flex items-center gap-4 pt-1">
              {qrCodeUrl && (
                <div className="border border-neutral-300 rounded p-1 bg-white flex-shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt="Digital Order Verification QR"
                    width={80}
                    height={80}
                    className="block"
                  />
                </div>
              )}
              <div className="space-y-0.5 text-[0.65rem]">
                <p className="font-bold text-black uppercase tracking-wider">
                  {t.invoice.verifiedQrNotice}
                </p>
                <p className="font-mono text-neutral-500">
                  REF: {order.stripePaymentIntentId || order.id}
                </p>
                <p className="text-neutral-500 font-mono">
                  METHOD: {order.stripePaymentIntentId ? "Stripe Payment Gateway" : order.paymentMethod.toUpperCase()}
                </p>
                <p className="text-neutral-400 text-[0.6rem] pt-1">
                  {t.invoice.computerGeneratedNotice}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Breakdown */}
          <div className="md:col-span-5 bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-neutral-600">
              <span>{t.invoice.subtotalExclTax}</span>
              <span className="font-bold text-black">{displaySubtotal}</span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>{t.invoice.vatRate}</span>
              <span className="font-bold text-black">{displayVat}</span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>{t.invoice.shippingFee}</span>
              <span className="font-bold text-black">{displayShipping}</span>
            </div>

            <div className="pt-2.5 mt-1 border-t-2 border-[#111111] flex justify-between items-baseline">
              <span className="font-heading font-black text-sm text-black uppercase">
                {t.invoice.grandTotal}
              </span>
              <span className="font-heading font-black text-base text-red-700">
                {displayGrandTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Official Authorized Stamp Signature Block */}
        <div className="pt-8 mt-6 border-t border-neutral-200 grid grid-cols-2 gap-8 text-[0.7rem] text-center">
          <div>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className="font-heading font-bold text-neutral-400 tracking-wider">
                SOUTH AERO DIGITAL SYSTEM
              </span>
            </div>
            <div className="border-t border-neutral-300 pt-1">
              <p className="font-bold text-black">ผู้มีอำนาจลงนาม / Authorized Signature</p>
              <p className="text-neutral-500 text-[0.62rem]">บริษัท เซาท์ แอโรพาร์ท จำกัด</p>
            </div>
          </div>

          <div>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className="font-mono text-neutral-600">
                {billingAddr.recipientName || shippingAddr.recipientName}
              </span>
            </div>
            <div className="border-t border-neutral-300 pt-1">
              <p className="font-bold text-black">ผู้รับสินค้าหรือบริการ / Received By</p>
              <p className="text-neutral-500 text-[0.62rem]">วันที่ / Date: ____/____/________</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
