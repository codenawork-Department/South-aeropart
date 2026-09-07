import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns a cached instance of the Stripe client initialized with STRIPE_SECRET_KEY.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in environment variables");
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

  // Convert to smallest currency unit (e.g. 100 THB = 10000 satang)
  const numericVal = typeof amountNumeric === "number" ? amountNumeric : parseFloat(amountNumeric);
  const amountInSmallestUnit = Math.round(numericVal * 100);

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
