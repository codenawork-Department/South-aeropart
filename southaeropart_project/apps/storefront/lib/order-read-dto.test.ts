import { describe, expect, it } from "vitest";
import { orderReadDto } from "./order-read-dto";
import type { Order } from "@repo/db";

describe("Order read privacy", () => {
  it("preserves receipt data while excluding internal identity, reservation and future fields", () => {
    const address = {
      recipientName: "Customer",
      phone: "0800000000",
      email: "customer@example.invalid",
      line1: "Fixture",
      subDistrict: "Fixture",
      district: "Fixture",
      province: "Bangkok",
      postalCode: "10500",
      privateToken: "PRIVATE_ADDRESS_TOKEN",
    };
    const row = {
      id: "order-id",
      orderNumber: "QA-123",
      userId: "PRIVATE_OWNER",
      status: "pending",
      paymentMethod: "credit_card",
      paymentStatus: "pending",
      omiseChargeId: null,
      stripePaymentIntentId: "pi_owned_receipt",
      inventoryState: "reserved",
      reservationExpiresAt: new Date(),
      assignedAdminId: "PRIVATE_ADMIN",
      subtotal: "100.00",
      shippingFee: "10.00",
      taxAmount: "7.00",
      total: "117.00",
      currency: "THB",
      trackingNumber: null,
      shippingCarrier: null,
      customerNote: "Please call before delivery",
      shippingAddress: address,
      billingAddress: address,
      createdAt: new Date(),
      updatedAt: new Date(),
      futureSecretColumn: "PRIVATE_FUTURE",
    } satisfies Order & { futureSecretColumn: string };
    const dto = orderReadDto(row);
    expect(dto.total).toBe("117.00");
    expect(dto.customerNote).toBe(row.customerNote);
    expect(dto.shippingAddress.email).toBe(address.email);
    expect(dto.stripePaymentIntentId).toBe("pi_owned_receipt");
    expect(JSON.stringify(dto)).not.toContain("PRIVATE_");
    for (const key of [
      "userId",
      "assignedAdminId",
      "inventoryState",
      "reservationExpiresAt",
      "futureSecretColumn",
    ])
      expect(dto).not.toHaveProperty(key);
  });
});
