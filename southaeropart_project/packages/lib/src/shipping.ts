import { z } from "zod";
import { formatSatang, MAX_PAYABLE_SATANG } from "./money-arithmetic";
export class ShippingConflict extends Error {}

const text = (max: number) => z.string().trim().max(max).regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ud800-\udfff]*$/u, "Invalid text");
export const shippingMoney = z.string().max(12).regex(/^\d{1,7}(\.\d{1,2})?$/).refine(v => /^\d{1,7}(\.\d{1,2})?$/.test(v) && moneySatang(v) <= MAX_PAYABLE_SATANG, "Amount too large");
export function moneySatang(value: string): bigint {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw new Error("Invalid shipping amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

// Explicit allowlist: unsupported destinations are never assigned a domestic rate.
export const SHIPPING_COUNTRIES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
export const countrySchema = z.string().refine(v => SHIPPING_COUNTRIES.includes(v), "Invalid country");
export const shippingAddressSchema = z.object({
  recipientName: text(200).min(1), phone: text(40).min(8),
  email: z.string().trim().max(254).email().optional().or(z.literal("")),
  country: countrySchema.default("TH"), line1: text(300).min(1), line2: text(300).optional(),
  subDistrict: text(100).default(""), district: text(100).default(""), province: text(100).default(""),
  postalCode: text(20).default(""),
}).strict().superRefine((v, ctx) => {
  if (v.country === "TH" && (!v.subDistrict || !v.district || !v.province || !/^\d{5}$/.test(v.postalCode)))
    ctx.addIssue({ code: "custom", message: "กรุณากรอกที่อยู่ไทยและรหัสไปรษณีย์ 5 หลักให้ครบถ้วน", path: ["postalCode"] });
  if (v.country !== "TH" && !v.district)
    ctx.addIssue({ code: "custom", message: "City is required", path: ["district"] });
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export const shippingItemsSchema = z.array(z.object({
  productId: z.string().uuid(), quantity: z.number().int().min(1).max(100), variant: text(200).optional(),
}).strict()).min(1).max(100).superRefine((items, ctx) => {
  const totals = new Map<string, number>();
  for (const i of items) totals.set(i.productId, (totals.get(i.productId) || 0) + i.quantity);
  if ([...totals.values()].some(q => q > 100)) ctx.addIssue({ code: "custom", message: "Quantity limit exceeded" });
});
export type ShippingItem = z.infer<typeof shippingItemsSchema>[number];
export const shippingPolicySchema = z.object({
  productId: z.string().uuid(), mode: z.enum(["standard", "fixed", "free", "quote"]),
  firstItem: shippingMoney, additionalItem: shippingMoney, freeShippingEligible: z.boolean(),
}).strict();
export const shippingSettingsSchema = z.object({
  standardFee: shippingMoney, expressFee: shippingMoney, freeThreshold: shippingMoney.nullable(),
}).strict();
export const DEFAULT_SHIPPING_SETTINGS = { standardFee: "150.00", expressFee: "450.00", freeThreshold: "15000.00" };
export const parcelSchema = z.object({
  contents: text(1000).min(1), lengthCm: z.number().positive().max(1000), widthCm: z.number().positive().max(1000),
  heightCm: z.number().positive().max(1000), weightKg: z.number().positive().max(2000),
}).strict();
export type ShippingParcel = z.infer<typeof parcelSchema>;
export const shippingOfferSchema = z.object({
  quoteId: z.string().uuid(), version: z.number().int().nonnegative(), fee: shippingMoney,
  carrier: text(120).min(1), deliveryEstimate: text(200).min(1),
  terms: text(2000).min(1), validDays: z.number().int().min(1).max(14),
  parcels: z.array(parcelSchema).min(1).max(30),
}).strict();
export type ShippingBasketLine = ShippingItem & { name: string; unitPrice: string; productType: "single" | "bundle" };
export type ShippingPolicy = z.infer<typeof shippingPolicySchema>;

export function calculateShipping(
  lines: ShippingBasketLine[], policies: ShippingPolicy[], country: string,
  settings: z.infer<typeof shippingSettingsSchema>,
): { requiresQuote: boolean; standard: string | null; express: string | null } {
  countrySchema.parse(country);
  const byId = new Map(policies.map(p => [p.productId, p]));
  if (country !== "TH" || lines.some(i => byId.get(i.productId)?.mode === "quote"))
    return { requiresQuote: true, standard: null, express: null };
  const eligibleSubtotal = lines.reduce((sum, i) => sum + (byId.get(i.productId)?.freeShippingEligible !== false ? moneySatang(i.unitPrice) * BigInt(i.quantity) : 0n), 0n);
  const promo = settings.freeThreshold !== null && eligibleSubtotal >= moneySatang(settings.freeThreshold);
  let fee = 0n;
  let standardNeeded = false;
  let fixedPresent = false;
  const quantities = new Map<string, number>();
  for (const i of lines) quantities.set(i.productId, (quantities.get(i.productId) || 0) + i.quantity);
  for (const [id, qty] of quantities) {
    const p = byId.get(id);
    if (p?.mode === "fixed") fixedPresent = true;
    if (p?.mode === "free" || (promo && p?.freeShippingEligible !== false)) continue;
    if (p?.mode === "fixed") fee += moneySatang(p.firstItem) + moneySatang(p.additionalItem) * BigInt(qty - 1);
    else standardNeeded = true;
  }
  if (standardNeeded) fee += moneySatang(settings.standardFee);
  // Express is only offered for the standard tariff; special parcels need their own quotation.
  return { requiresQuote: false, standard: formatSatang(fee), express: fixedPresent ? null : settings.expressFee };
}
