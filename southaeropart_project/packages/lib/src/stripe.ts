import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function isExpectedStripeMode(livemode: boolean): boolean {
  return livemode === (process.env.APP_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "staging"));
}

/**
/**
 * Audit #18: Returns a Stripe client, accepting an explicit secret key or using STRIPE_SECRET_KEY.
 */
export function getStripe(apiKey?: string): Stripe {
  const secretKey = apiKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in environment variables");
  }
  if (process.env.NODE_ENV === "production" && !secretKey.startsWith(process.env.APP_ENV === "staging" ? "sk_test_" : "sk_live_")) {
    throw new Error("Stripe configuration does not match deployment mode");
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
  idempotencyKey?: string;
}

export class InvalidMonetaryAmountError extends Error {
  readonly code = "INVALID_INPUT";
  constructor() {
    super("Invalid request");
  }
}

/** Exact conversion for the project's two-decimal currency amounts.
 * Signed values and zero remain valid conversions; charge limits belong to the caller.
 * Never trim, truncate, parse a numeric prefix, or silently round unsafe satang.
 */
export function toSmallestCurrencyUnit(amount: string | number): number {
  if (typeof amount !== "string" && typeof amount !== "number") {
    throw new InvalidMonetaryAmountError();
  }
  const str = String(amount);
  // Bound work before regex/BigInt on untrusted, potentially megabyte-sized input.
  if (str.length > 32 || !/^-?\d+(?:\.\d{1,2})?(?![\s\S])/.test(str)) {
    throw new InvalidMonetaryAmountError();
  }
  const negative = str.startsWith("-");
  const [whole, fraction = ""] = (negative ? str.slice(1) : str).split(".");
  const magnitude = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InvalidMonetaryAmountError();
  }
  return Number(negative ? -magnitude : magnitude);
}

/**
 * Creates a Stripe PaymentIntent with automatic payment methods (Card, PromptPay, Apple Pay, Google Pay).
 * Correctly converts numeric amounts to satang / smallest currency unit.
 * Passes idempotencyKey to prevent duplicate charges upon retries.
 */
export async function createPaymentIntent({
  orderId,
  orderNumber,
  amountNumeric,
  currency = "THB",
  receiptEmail,
  metadata = {},
  idempotencyKey,
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const amountInSmallestUnit = toSmallestCurrencyUnit(amountNumeric);
  const stripe = getStripe();
  const effectiveIdempotencyKey = idempotencyKey || `pi_order_${orderId}`;

  const intent = await stripe.paymentIntents.create(
    {
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
    },
    {
      idempotencyKey: effectiveIdempotencyKey,
    }
  );

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
  webhookSecret?: string,
  receivedAt?: number
): Stripe.Event {
  const stripe = getStripe();
  const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured in environment variables");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret, 300, undefined, receivedAt);
}

export type { Stripe };
