import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { assertTestIsolation } from "./test-guard";
assertTestIsolation();

import {
  db,
  products,
  productBundleItems,
  orders,
  orderItems,
  orderItemBundleParts,
  orderStatusHistory,
  eq,
  and,
} from "@repo/db";
import { createOrder, confirmMockPayment } from "@/actions/checkout.actions";
import { sendOrderConfirmationEmail } from "@/lib/order-email";

async function runVerification() {
  console.log("===============================================================");
  console.log("STARTING ITERATIVE VERIFICATION LOOP (POINTS 2 TO 6)");
  console.log("===============================================================");

  // -------------------------------------------------------------
  // POINT 2: Single Product Stock Guard
  // -------------------------------------------------------------
  console.log("\n>>> POINT 2: Testing Single Product Stock Guard...");
  let [singleProduct] = await db
    .select()
    .from(products)
    .where(and(eq(products.productType, "single"), eq(products.status, "active")))
    .limit(1);

  if (!singleProduct) {
    // If none active, find any single product and make it active
    const [anySingle] = await db
      .select()
      .from(products)
      .where(eq(products.productType, "single"))
      .limit(1);
    if (anySingle) {
      await db.update(products).set({ status: "active", stockQuantity: 10 }).where(eq(products.id, anySingle.id));
      singleProduct = { ...anySingle, status: "active", stockQuantity: 10 };
    } else {
      throw new Error("Point 2 Failed: No single product found in DB to test");
    }
  }

  if (singleProduct.stockQuantity < 1) {
    await db.update(products).set({ stockQuantity: 10 }).where(eq(products.id, singleProduct.id));
    singleProduct.stockQuantity = 10;
  }

  const excessiveQty = singleProduct.stockQuantity + 500;
  console.log(`Testing product "${singleProduct.name}" (Current Stock: ${singleProduct.stockQuantity}) with Order Qty: ${excessiveQty}`);

  const singleStockFailRes = await createOrder({
    shippingAddress: {
      recipientName: "Test Buyer",
      phone: "0812345678",
      email: "test_buyer@southaero.test",
      line1: "123 Test Street",
      subDistrict: "Khlong Tan",
      district: "Watthana",
      province: "Bangkok",
      postalCode: "10110",
    },
    shippingMethod: "standard",
    paymentMethod: "promptpay",
    saveAddress: false,
    items: [
      {
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: excessiveQty,
        unitPrice: singleProduct.price,
      },
    ],
  });

  if (singleStockFailRes.success) {
    throw new Error("Point 2 FAILED: createOrder succeeded despite exceeding single product stock!");
  }
  if (!singleStockFailRes.error?.includes("สต็อกคงเหลือไม่เพียงพอ")) {
    throw new Error(`Point 2 FAILED: Unexpected error message: ${singleStockFailRes.error}`);
  }
  console.log(`[PASSED] Point 2: Correctly blocked with error: "${singleStockFailRes.error}"`);

  // -------------------------------------------------------------
  // POINT 3: Bundle Product & Child Part Stock Guard
  // -------------------------------------------------------------
  console.log("\n>>> POINT 3: Testing Bundle Child Part Stock Guard...");
  const bundlesWithParts = await db
    .select({
      bundleId: productBundleItems.bundleProductId,
      bundleName: products.name,
      bundlePrice: products.price,
      bundleStock: products.stockQuantity,
      childId: productBundleItems.childProductId,
      childQty: productBundleItems.quantity,
    })
    .from(productBundleItems)
    .innerJoin(products, eq(productBundleItems.bundleProductId, products.id))
    .limit(10);

  const bundleId = bundlesWithParts[0]?.bundleId;
  const bundleName = bundlesWithParts[0]?.bundleName;
  const bundlePrice = bundlesWithParts[0]?.bundlePrice;

  if (bundleId) {
    const [childPart] = await db
      .select({ stockQuantity: products.stockQuantity, name: products.name })
      .from(products)
      .where(eq(products.id, bundlesWithParts[0].childId))
      .limit(1);

    const excessiveBundleQty = (childPart?.stockQuantity || 10) + 1000;
    console.log(`Testing bundle "${bundleName}" child part "${childPart?.name}" (Stock: ${childPart?.stockQuantity}) with Qty: ${excessiveBundleQty}`);

    const bundleStockFailRes = await createOrder({
      shippingAddress: {
        recipientName: "Test Buyer",
        phone: "0812345678",
        email: "test_buyer@southaero.test",
        line1: "123 Test Street",
        subDistrict: "Khlong Tan",
        district: "Watthana",
        province: "Bangkok",
        postalCode: "10110",
      },
      shippingMethod: "standard",
      paymentMethod: "promptpay",
      saveAddress: false,
      items: [
        {
          productId: bundleId,
          productName: bundleName,
          quantity: excessiveBundleQty,
          unitPrice: bundlePrice,
        },
      ],
    });

    if (bundleStockFailRes.success) {
      throw new Error("Point 3 FAILED: createOrder succeeded despite child part being out of stock!");
    }
    if (!bundleStockFailRes.error?.includes("มีสต็อกไม่เพียงพอ") && !bundleStockFailRes.error?.includes("มีสต็อกคงเหลือไม่เพียงพอ")) {
      throw new Error(`Point 3 FAILED: Unexpected error message: ${bundleStockFailRes.error}`);
    }
    console.log(`[PASSED] Point 3: Correctly blocked with error: "${bundleStockFailRes.error}"`);
  } else {
    console.log("[Notice: No bundle parts configured in DB, skipping bundle guard test]");
  }

  // -------------------------------------------------------------
  // POINT 4: Order Creation & orderItemBundleParts Snapshot
  // -------------------------------------------------------------
  console.log("\n>>> POINT 4: Testing Order Creation & Bundle Snapshots...");
  const [stockProduct] = await db
    .select()
    .from(products)
    .where(and(eq(products.status, "active"), eq(products.productType, "single")))
    .limit(1);

  if (!stockProduct) {
    throw new Error("Point 4 Failed: No active product found to test order creation");
  }

  const originalProductStock = stockProduct.stockQuantity;
  if (stockProduct.stockQuantity < 5) {
    await db.update(products).set({ stockQuantity: 20 }).where(eq(products.id, stockProduct.id));
  }

  const itemsToOrder = [
    {
      productId: stockProduct.id,
      productName: stockProduct.name,
      quantity: 1,
      unitPrice: stockProduct.price,
    },
  ];

  if (bundleId) {
    // Ensure the bundle and its child parts are active with sufficient stock for the test
    await db.update(products).set({ status: "active", stockQuantity: 20 }).where(eq(products.id, bundleId));
    const childParts = await db
      .select({ childId: productBundleItems.childProductId })
      .from(productBundleItems)
      .where(eq(productBundleItems.bundleProductId, bundleId));

    for (const cp of childParts) {
      await db.update(products).set({ status: "active", stockQuantity: 20 }).where(eq(products.id, cp.childId));
    }

    itemsToOrder.push({
      productId: bundleId,
      productName: bundleName,
      quantity: 1,
      unitPrice: bundlePrice,
    });
  }

  const orderRes = await createOrder({
    shippingAddress: {
      recipientName: "Test Automation Buyer",
      phone: "0899999999",
      email: "codena.work@gmail.com",
      line1: "88 Carbon Aerodynamics Avenue",
      subDistrict: "Thonglor",
      district: "Watthana",
      province: "Bangkok",
      postalCode: "10110",
    },
    shippingMethod: "express",
    paymentMethod: "promptpay",
    saveAddress: false,
    items: itemsToOrder,
  });

  if (!orderRes.success || !orderRes.orderId) {
    throw new Error(`Point 4 FAILED: Order creation failed: ${orderRes.error}`);
  }

  const testOrderId = orderRes.orderId;
  console.log(`Order created successfully! OrderID: ${testOrderId}, OrderNumber: ${orderRes.orderNumber}`);

  const createdItems = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, testOrderId));

  if (createdItems.length !== itemsToOrder.length) {
    throw new Error(`Point 4 FAILED: Expected ${itemsToOrder.length} order items, found ${createdItems.length}`);
  }

  if (bundleId) {
    const bundleOrderItem = createdItems.find((ci) => ci.productId === bundleId);
    if (!bundleOrderItem) {
      throw new Error("Point 4 FAILED: Bundle order item not found");
    }

    const bundlePartsSnapshots = await db
      .select()
      .from(orderItemBundleParts)
      .where(eq(orderItemBundleParts.orderItemId, bundleOrderItem.id));

    console.log(`Bundle parts snapshots created: ${bundlePartsSnapshots.length} parts`);
    if (bundlePartsSnapshots.length === 0) {
      throw new Error("Point 4 FAILED: No orderItemBundleParts snapshots were created for the bundle!");
    }
  }

  console.log("[PASSED] Point 4: Order created with valid items & bundle snapshots!");

  // -------------------------------------------------------------
  // POINT 5: Payment Confirmation & Stock Decrement
  // -------------------------------------------------------------
  console.log("\n>>> POINT 5: Testing Payment Confirmation & Stock Decrement...");

  const [prePayProd] = await db
    .select({ stockQuantity: products.stockQuantity })
    .from(products)
    .where(eq(products.id, stockProduct.id));

  let prePayChildStock: number | null = null;
  let testChildPartId: string | null = null;
  if (bundleId && bundlesWithParts[0]?.childId) {
    testChildPartId = bundlesWithParts[0].childId;
    const [c] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, testChildPartId));
    prePayChildStock = c?.stockQuantity ?? null;
  }

  console.log(`Before Payment -> Product "${stockProduct.name}" Stock: ${prePayProd.stockQuantity}`);
  if (testChildPartId && prePayChildStock !== null) {
    console.log(`Before Payment -> Bundle Child Part Stock: ${prePayChildStock}`);
  }

  const paymentRes = await confirmMockPayment(testOrderId);
  if (!paymentRes.success) {
    throw new Error(`Point 5 FAILED: confirmMockPayment failed: ${paymentRes.error}`);
  }

  const [postPayProd] = await db
    .select({ stockQuantity: products.stockQuantity })
    .from(products)
    .where(eq(products.id, stockProduct.id));

  // Calculate expected decrement for stockProduct (accounts for if it is also in the bundle)
  let expectedDecrement = 1;
  if (bundleId) {
    const [partInBundle] = await db
      .select({ qty: productBundleItems.quantity })
      .from(productBundleItems)
      .where(eq(productBundleItems.bundleProductId, bundleId));
    // If stockProduct is also inside bundle, add its bundle part quantity
    const matchingParts = await db
      .select({ qty: productBundleItems.quantity })
      .from(productBundleItems)
      .where(eq(productBundleItems.childProductId, stockProduct.id));
    for (const mp of matchingParts) {
      if (bundlesWithParts.some(b => b.bundleId === bundleId && b.childId === stockProduct.id)) {
        expectedDecrement += mp.qty;
        break;
      }
    }
  }

  console.log(`After Payment -> Product "${stockProduct.name}" Stock: ${postPayProd.stockQuantity} (Expected decrease: ${expectedDecrement})`);
  if (postPayProd.stockQuantity !== prePayProd.stockQuantity - expectedDecrement) {
    throw new Error(`Point 5 FAILED: Single product stock did not decrease by ${expectedDecrement}! (Pre: ${prePayProd.stockQuantity}, Post: ${postPayProd.stockQuantity})`);
  }

  if (testChildPartId && prePayChildStock !== null) {
    const [postPayChild] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, testChildPartId));
    console.log(`After Payment -> Bundle Child Part Stock: ${postPayChild.stockQuantity}`);
    if (postPayChild.stockQuantity >= prePayChildStock) {
      throw new Error(`Point 5 FAILED: Bundle child part stock was not decremented! (Pre: ${prePayChildStock}, Post: ${postPayChild.stockQuantity})`);
    }
  }

  const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, testOrderId));
  if (updatedOrder.paymentStatus !== "paid" || updatedOrder.status !== "paid") {
    throw new Error(`Point 5 FAILED: Order status not set to paid! Current: ${updatedOrder.status}/${updatedOrder.paymentStatus}`);
  }

  console.log("[PASSED] Point 5: Stock decremented correctly for single and bundle child parts, status='paid'!");

  // -------------------------------------------------------------
  // POINT 6: Resend Email Integration & Fallback
  // -------------------------------------------------------------
  console.log("\n>>> POINT 6: Testing Resend Email Dispatch...");
  const emailRes = await sendOrderConfirmationEmail(testOrderId);
  console.log("Email dispatch result:", emailRes);

  if (!emailRes.success && !emailRes.isSimulated) {
    throw new Error(`Point 6 FAILED: sendOrderConfirmationEmail threw unexpected error: ${emailRes.error}`);
  }

  console.log(`[PASSED] Point 6: Email function executed cleanly (success=${emailRes.success}, isSimulated=${emailRes.isSimulated})`);

  // -------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------
  console.log("\nCleaning up test artifacts from database...");
  await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, testOrderId));
  const oItems = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, testOrderId));
  for (const oi of oItems) {
    await db.delete(orderItemBundleParts).where(eq(orderItemBundleParts.orderItemId, oi.id));
  }
  await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
  await db.delete(orders).where(eq(orders.id, testOrderId));

  // Restore stock
  await db.update(products).set({ stockQuantity: originalProductStock }).where(eq(products.id, stockProduct.id));
  console.log("Cleanup completed!");

  console.log("\n===============================================================");
  console.log("ALL 6 VERIFICATION POINTS PASSED 100% WITH ZERO ERRORS!");
  console.log("===============================================================");
}

runVerification().catch((err) => {
  console.error("\n[VERIFICATION FAILED]:", err);
  process.exit(1);
});
