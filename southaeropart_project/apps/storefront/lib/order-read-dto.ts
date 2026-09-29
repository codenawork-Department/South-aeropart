import type { Address, Order, OrderStatusHistory } from "@repo/db";

function addressDto(address: Address): Address {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    email: address.email,
    line1: address.line1,
    line2: address.line2,
    subDistrict: address.subDistrict,
    district: address.district,
    province: address.province,
    postalCode: address.postalCode,
  };
}

/** Payment references support the existing receipt/recovery UI. Owner/admin IDs,
 * reservation internals and future DB columns are never serialized by this projection. */
export function orderReadDto(order: Order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    omiseChargeId: order.omiseChargeId,
    stripePaymentIntentId: order.stripePaymentIntentId,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    taxAmount: order.taxAmount,
    total: order.total,
    currency: order.currency,
    trackingNumber: order.trackingNumber,
    shippingCarrier: order.shippingCarrier,
    customerNote: order.customerNote,
    shippingAddress: addressDto(order.shippingAddress),
    billingAddress: order.billingAddress
      ? addressDto(order.billingAddress)
      : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export type OrderReadDto = ReturnType<typeof orderReadDto>;
export type OrderHistoryReadDto = Pick<
  OrderStatusHistory,
  "id" | "orderId" | "status" | "createdAt"
>;
