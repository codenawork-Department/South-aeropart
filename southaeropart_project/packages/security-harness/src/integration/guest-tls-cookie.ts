import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { invokeNativeAction } from "./native-action";
import { createBusinessObserver } from "./db-observer";
import type { NativeRuntime } from "./native-runtime";

/** Actual checkout cookie issuance and cookie-only reads on a production build over loopback TLS. */
export async function checkGuestTlsCookie(runtime: NativeRuntime) {
  console.log("TLS: compiling the isolated production build");
  const app = await runtime.launchApp("storefront", { productionTls: true });
  assert(new URL(app.baseUrl).protocol === "https:");
  console.log("TLS: build and browser ready; creating a real guest order");
  const productId = randomUUID();
  await runtime.pool.query(
    "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,'TLS cookie fixture','100.00',1,'active')",
    [productId, productId],
  );
  const emailBefore = runtime.emails.length;
  const checkout = await invokeNativeAction(
    app,
    "checkout",
    [
      {
        shippingAddress: {
          recipientName: "TLS cookie fixture",
          phone: "0800000000",
          email: "tls-cookie@example.invalid",
          line1: "Fixture",
          subDistrict: "Fixture",
          district: "Fixture",
          province: "Bangkok",
          postalCode: "10110",
        },
        shippingMethod: "standard",
        paymentMethod: "promptpay",
        saveAddress: false,
        items: [
          {
            productId,
            productName: "Untrusted hint",
            unitPrice: "0.01",
            quantity: 1,
          },
        ],
      },
    ],
    { timeoutMs: 60000 },
  );
  const response = checkout.value as {
    success?: boolean;
    orderId?: string;
    guestToken?: string;
  };
  assert.equal(checkout.wireStatus, 200);
  assert.equal(response.success, true, "Real guest checkout must succeed");
  assert.equal(typeof response.orderId, "string");
  const order = (
    await runtime.pool.query(
      "select user_id,total,inventory_state from orders where id=$1",
      [response.orderId],
    )
  ).rows[0];
  assert(order.user_id.startsWith("guest_"));
  assert.equal(order.total, "250.00");
  assert.equal(order.inventory_state, "reserved");
  const cookie = (await app.context.cookies(app.baseUrl)).find(
    (c) => c.name === `guest_order_${response.orderId}`,
  );
  assert(cookie, "Checkout must issue the guest cookie to the browser");
  assert(
    cookie.value === response.guestToken,
    "Issued cookie must match the returned guest credential",
  );
  assert.equal(cookie.secure, true);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "Lax");
  assert.equal(cookie.path, "/");
  const remainingSeconds = cookie.expires - Date.now() / 1000;
  assert(remainingSeconds > 604740 && remainingSeconds <= 604801);
  const readable = await app.page.evaluate(
    (name) =>
      document.cookie
        .split(";")
        .some((value) => value.trim().startsWith(`${name}=`)),
    cookie.name,
  );
  assert.equal(readable, false);
  const snapshot = await createBusinessObserver(runtime),
    before = await snapshot();
  console.log("TLS: cookie attributes verified; reading with cookie alone");
  const requests = [
    {
      binding: "checkout",
      bytes: checkout.requestBytes,
      sha256: checkout.requestSha256,
    },
  ];
  const reads = [];
  for (const binding of ["guestDetails", "guestStatus"]) {
    const wire = await invokeNativeAction(app, binding, [
      { orderId: response.orderId },
    ]);
    const result = wire.value as {
      success?: boolean;
      orderId?: string;
      data?: { order?: { id?: string; total?: string } };
    };
    const accepted =
      wire.wireStatus === 200 &&
      result.success === true &&
      (binding === "guestDetails" ? result.data?.order?.id : result.orderId) ===
        response.orderId;
    assert(accepted, "Cookie alone must authorize the checkout's own order");
    reads.push({
      binding,
      wireStatus: wire.wireStatus,
      accepted,
      tokenArgumentAbsent: true,
    });
    requests.push({
      binding,
      bytes: wire.requestBytes,
      sha256: wire.requestSha256,
    });
  }
  const after = await snapshot();
  assert([...after].every(([table, digest]) => before.get(table) === digest));
  assert.equal(runtime.emails.length, emailBefore);
  return {
    passed: true,
    build: "production",
    environment: "staging with test providers and temporary schema",
    transport: "HTTPS loopback, ephemeral certificate",
    actualCheckout: true,
    mediaProvider:
      "disabled transport; media operations are outside this check",
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    scriptReadable: readable,
    ttlSeconds: Math.round(remainingSeconds),
    reads,
    requests,
    businessRowsChangedByReads: 0,
    emailRequests: 0,
  };
}
