"use client";

import { useEffect, useState } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [lang, setLang] = useState<"th" | "en">("th");

  useEffect(() => {
    console.error("[Storefront Global Fatal Error]:", error);
    try {
      const match = document.cookie.match(/(?:^|;\s*)south_aero_lang=([^;]+)/);
      if (match && match[1] === "en") {
        setLang("en");
      }
    } catch {
      // fallback to th
    }
  }, [error]);

  const isEn = lang === "en";

  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0A0A0A",
          color: "#FFFFFF",
          fontFamily:
            '\'Josefin Sans\', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            width: "90%",
            backgroundColor: "#121212",
            border: "1px solid #222222",
            borderRadius: "12px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#1A1A1A",
              border: "1px solid #333333",
              margin: "0 auto 16px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#E51D24",
            }}
          >
            !
          </div>

          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              color: "#E51D24",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            SOUTH AERO PERFORMANCE
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "1px",
              margin: "0 0 12px 0",
              textTransform: "uppercase",
            }}
          >
            {isEn ? "CRITICAL SYSTEM ERROR" : "เกิดข้อผิดพลาดร้ายแรงในระบบ"}
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#9CA3AF",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            {isEn
              ? "A critical application error occurred. Please try again or return to the homepage."
              : "เกิดข้อผิดพลาดรุนแรงระดับโครงสร้างระบบ กรุณากดลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก"}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                backgroundColor: "#E51D24",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "4px",
                padding: "12px 24px",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "1px",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {isEn ? "Try Again" : "ลองใหม่อีกครั้ง"}
            </button>
            {/* A full document navigation resets the failed root layout. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                backgroundColor: "#1A1A1A",
                color: "#FFFFFF",
                border: "1px solid #333333",
                borderRadius: "4px",
                padding: "12px 24px",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "1px",
                textDecoration: "none",
                display: "inline-block",
                textTransform: "uppercase",
              }}
            >
              {isEn ? "Back to Home" : "กลับสู่หน้าหลัก"}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
