import type { TargetName, TestCase } from "../types";
import type { TargetAdapter } from "./base.adapter";
import { CartAddAdapter } from "./cart.adapter";
import { CheckoutCreateAdapter } from "./checkout.adapter";
import { GuestTrackAdapter } from "./guest.adapter";
import { AdminProductAdapter } from "./admin-product.adapter";
import { StripeWebhookAdapter } from "./stripe-webhook.adapter";
import { MoneyConvertAdapter } from "./money-convert.adapter";
import { InventoryDeltaAdapter } from "./inventory-delta.adapter";
import {
  AmountValidateAdapter,
  ApiJsonAdapter,
  NoteContractAdapter,
} from "./unbound-contracts.adapter";

export {
  TargetAdapter,
  CartAddAdapter,
  CheckoutCreateAdapter,
  GuestTrackAdapter,
  AdminProductAdapter,
  StripeWebhookAdapter,
  MoneyConvertAdapter,
  InventoryDeltaAdapter,
  AmountValidateAdapter,
  ApiJsonAdapter,
  NoteContractAdapter,
};

export function getAdapterForTarget(
  target: TargetName,
  testCase?: TestCase,
): TargetAdapter {
  if (
    testCase?.input.mode === "recipe" &&
    testCase.input.name === "noteContract"
  ) {
    return new NoteContractAdapter();
  }

  switch (target) {
    case "cart.add":
      return new CartAddAdapter();
    case "checkout.create":
      return new CheckoutCreateAdapter();
    case "guest.track":
      return new GuestTrackAdapter();
    case "admin.product":
      return new AdminProductAdapter();
    case "stripe.webhook":
      return new StripeWebhookAdapter();
    case "money.convert":
      return new MoneyConvertAdapter();
    case "inventory.delta":
      return new InventoryDeltaAdapter();
    case "amount.validate":
      return new AmountValidateAdapter();
    case "api.json":
      return new ApiJsonAdapter();
    default:
      throw new Error(`No adapter implemented for target: ${target}`);
  }
}
