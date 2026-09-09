"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Storefront Global Fatal Error]:", error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0A0A0A",
          color: "#FFFFFF",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
            CRITICAL APPLICATION ERROR
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#9CA3AF",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            เกิดข้อผิดพลาดรุนแรงระดับโครงสร้างระบบ กรุณาลองใหม่อีกครั้ง
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
              ลองใหม่อีกครั้ง (Try Again)
            </button>
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
              กลับสู่หน้าหลัก
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
