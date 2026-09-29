import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";

/** Actual template + DB + Resend SDK, delivered only to the loopback HTTP sink. */
export async function checkShipmentEmailSink(
  runtime: NativeRuntime,
  app: NativeApp,
  storedProductName?: string,
) {
  assert.equal(new URL(runtime.env.RESEND_BASE_URL!).hostname, "127.0.0.1");
  assert.equal(runtime.env.RESEND_API_KEY, "re_local_security_capture");
  const id = randomUUID(),
    productId = randomUUID(),
    userId = `guest_${randomUUID()}`;
  const payload =
    storedProductName ??
    '<script>globalThis.__qaEmailXss=1</script><img src="https://qa-marker.invalid/x" onerror="globalThis.__qaEmailXss=1">';
  const email = `${id}@example.invalid`;
  await runtime.pool.query(
    "insert into users(id,email,full_name) values($1,$2,$3)",
    [userId, email, "Email fixture"],
  );
  await runtime.pool.query(
    "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,$3,'100.00',10,'active')",
    [productId, productId, payload],
  );
  const address = {
    recipientName: payload,
    email,
    phone: "0800000000",
    line1: payload,
    subDistrict: "Fixture",
    district: "Fixture",
    province: "Bangkok",
    postalCode: "10500",
  };
  await runtime.pool.query(
    "insert into orders(id,order_number,user_id,status,payment_method,subtotal,total,shipping_address,tracking_number,shipping_carrier) values($1,$2,$3,'shipped','credit_card','100.00','100.00',$4,'QA-123','Fixture')",
    [id, `QA-${id}`, userId, JSON.stringify(address)],
  );
  await runtime.pool.query(
    "insert into order_items(order_id,product_id,product_name_snapshot,unit_price,quantity,line_total) values($1,$2,$3,'100.00',1,'100.00')",
    [id, productId, payload],
  );
  const emailBefore = runtime.emails.length;
  const wire = await invokeNativeAction(app, "emailProbe", [id]);
  const messages = runtime.emails.slice(emailBefore);
  const body = messages[0]?.body as
    { to?: string[]; html?: string } | undefined;
  assert.equal(wire.wireStatus, 200);
  assert.equal(
    (wire.value as { success: boolean }).success,
    true,
    "Actual SDK must acknowledge sink delivery",
  );
  assert.equal(
    messages.length,
    1,
    "Exactly one HTTP email request must reach the sink",
  );
  assert.deepEqual(body?.to, [email]);
  const html = body?.html;
  assert.equal(typeof html, "string");
  assert(html);
  if (storedProductName === undefined)
    assert(
      html.includes("&lt;script&gt;globalThis.__qaEmailXss=1&lt;/script&gt;"),
      "Stored payload must reach the actual template as escaped text",
    );
  const stored = (
    await runtime.pool.query(
      "select product_name_snapshot from order_items where order_id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(stored.product_name_snapshot, payload);
  const context = await runtime.browser.newContext();
  const page = await context.newPage();
  const beacons: string[] = [];
  try {
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).hostname === "qa-marker.invalid")
        beacons.push("payload beacon");
      await route.abort();
    });
    await page.setContent(html, { waitUntil: "load" });
    assert(
      (await page.locator("body").textContent())?.includes(payload),
      "Stored product text must be visible in the email",
    );
    const observed = await page.evaluate(() => ({
      scriptNodes: document.querySelectorAll("script").length,
      dangerousAttributes: Array.from(document.querySelectorAll("*"))
        .flatMap((node) => Array.from(node.attributes))
        .filter(
          (attr) =>
            /^on/i.test(attr.name) ||
            (/^(href|src|action)$/i.test(attr.name) &&
              /^\s*javascript:/i.test(attr.value)),
        ).length,
      marker:
        (globalThis as { __qaEmailXss?: number; __qaXss?: number })
          .__qaEmailXss ??
        (globalThis as { __qaXss?: number }).__qaXss ??
        null,
    }));
    assert.deepEqual(observed, {
      scriptNodes: 0,
      dangerousAttributes: 0,
      marker: null,
    });
    assert.equal(beacons.length, 0);
    return {
      passed: true,
      actualResendSdk: true,
      sinkMessages: messages.length,
      externalDelivery: false,
      storedPayloadReadback: true,
      renderedHtmlBytes: Buffer.byteLength(html, "utf8"),
      ...observed,
      scope:
        "Shipment helper via test-only copied-app action; email HTML in Chromium, not an email client or corpus-wide PLAIN_TEXT proof",
    };
  } finally {
    await context.close();
  }
}
