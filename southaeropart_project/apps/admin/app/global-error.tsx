"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminGlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Admin Global Fatal Error]:", error);
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
            backgroundColor: "#141414",
            border: "1px solid #262626",
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
              backgroundColor: "#1F1F1F",
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
            SOUTH AERO ADMIN
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
              margin: "0 0 24px 0",
            }}
          >
            เกิดข้อผิดพลาดร้ายแรงที่ไม่สามารถกู้คืนได้ในระบบแอดมิน กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: "10px",
                color: "#6B7280",
                fontFamily: "monospace",
                marginBottom: "20px",
              }}
            >
              Digest: {error.digest}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#E51D24",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ลองใหม่อีกครั้ง
            </button>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1F1F1F",
                color: "#FFFFFF",
                border: "1px solid #333333",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              หน้าแรก
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
