import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
/**
 * Audit #18: Returns a Stripe client, accepting an explicit secret key or using STRIPE_SECRET_KEY.
 */
export function getStripe(apiKey?: string): Stripe {
  const secretKey = apiKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in environment variables");
  }
  if (apiKey) {
    return new Stripe(apiKey, { typescript: true });
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeInstance;
}

export interface CreatePaymentIntentParams {
  orderId: string;
  orderNumber: string;
  amountNumeric: string | number; // e.g. "35000.00"
  currency?: string; // default "THB"
  receiptEmail?: string;
  metadata?: Record<string, string>;
}

/**
 * Audit #17: Accurately converts a monetary amount (e.g. "35000.15" or 35000) to the smallest unit (satang)
 * without floating-point precision loss.
 */
export function toSmallestCurrencyUnit(amount: string | number): number {
  const str = String(amount).trim();
  const [integerPart, decimalPart = ""] = str.split(".");
  const paddedDecimal = (decimalPart + "00").slice(0, 2);
  const isNegative = str.startsWith("-");
  const absInt = integerPart.replace(/^-/, "") || "0";
  const satangStr = `${absInt}${paddedDecimal}`;
  const result = parseInt(satangStr, 10);
  return isNegative ? -result : result;
}

/**
 * Creates a Stripe PaymentIntent with automatic payment methods (Card, PromptPay, Apple Pay, Google Pay).
 * Correctly converts numeric amounts to satang / smallest currency unit.
 */
export async function createPaymentIntent({
  orderId,
  orderNumber,
  amountNumeric,
  currency = "THB",
  receiptEmail,
  metadata = {},
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();

  // Audit #17: Use exact integer conversion instead of parseFloat * 100
  const amountInSmallestUnit = toSmallestCurrencyUnit(amountNumeric);

  const intent = await stripe.paymentIntents.create({
    amount: amountInSmallestUnit,
    currency: currency.toLowerCase(),
    automatic_payment_methods: {
      enabled: true,
    },
    receipt_email: receiptEmail || undefined,
    metadata: {
      orderId,
      orderNumber,
      ...metadata,
    },
  });

  return intent;
}

/**
 * Retrieves an existing PaymentIntent by ID.
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Updates receipt_email on an existing PaymentIntent.
 */
export async function updatePaymentIntentReceiptEmail(
  paymentIntentId: string,
  receiptEmail: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.update(paymentIntentId, {
    receipt_email: receiptEmail,
  });
}

/**
 * Validates webhook payload using genuine Stripe signature and STRIPE_WEBHOOK_SECRET.
 */
export function constructStripeWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret?: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured in environment variables");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export type { Stripe };
