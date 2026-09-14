import { describe, it, expect, beforeEach } from "vitest";
import { getResendClient, sendEmail } from "./resend";

describe("Resend Email Client & Dispatch", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns null client when RESEND_API_KEY is not configured", () => {
    const client = getResendClient();
    expect(client).toBeNull();
  });

  it("returns Resend instance when API key is provided explicitly", () => {
    const client = getResendClient("re_test_explicit_key_123");
    expect(client).not.toBeNull();
  });

  it("returns simulated result gracefully when sending email without API key", async () => {
    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Your Order Confirmation",
      html: "<p>Thank you for your order!</p>",
    });

    expect(result.success).toBe(false);
    expect(result.isSimulated).toBe(true);
    expect(result.error).toContain("RESEND_API_KEY");
  });
});
