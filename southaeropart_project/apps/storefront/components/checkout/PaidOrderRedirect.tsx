"use client";

import { useEffect } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";

/** Called only after the server verifies ownership and confirmed payment. */
export function PaidOrderRedirect({
  orderId,
  guestToken,
}: {
  orderId: string;
  guestToken?: string;
}) {
  const { lang } = useLanguage();
  const query = new URLSearchParams({ paid: "true" });
  if (guestToken) query.set("token", guestToken);
  const href = `/orders/${encodeURIComponent(orderId)}?${query}`;

  useEffect(() => {
    // A document navigation avoids Next 15's streamed redirect/Router hook race.
    window.location.replace(href);
  }, [href]);

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p role="status">
        {lang === "th"
          ? "กำลังไปยังรายละเอียดคำสั่งซื้อ…"
          : "Opening your order…"}
      </p>
      <a href={href} className="mt-4 inline-block underline">
        {lang === "th" ? "ดูรายละเอียดคำสั่งซื้อ" : "View order details"}
      </a>
    </div>
  );
}
