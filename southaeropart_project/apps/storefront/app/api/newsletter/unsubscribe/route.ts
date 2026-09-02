import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByTokenAction } from "@/actions/newsletter.actions";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Invalid Link</title><meta charset="utf-8" /></head>
        <body style="background:#0A0A0A;color:#FFFFFF;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:400px;padding:24px;background:#141414;border:1px solid #282828;border-radius:8px;">
            <h2 style="color:#DC2626;">ลิงก์ไม่ถูกต้อง</h2>
            <p style="color:#A3A3A3;font-size:14px;">ไม่พบรหัสโทเค็นสำหรับการยกเลิกรับข่าวสาร</p>
            <a href="/" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#DC2626;color:#FFF;text-decoration:none;border-radius:4px;font-size:12px;font-weight:bold;">กลับสู่หน้าแรก</a>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const result = await unsubscribeByTokenAction(token);

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>South Aero — Unsubscribed</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="background:#0A0A0A;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;">
        <div style="text-align:center;max-width:460px;width:100%;padding:36px 28px;background:#141414;border:1px solid #282828;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.8);">
          <div style="font-size:24px;font-weight:900;letter-spacing:4px;color:#FFFFFF;margin-bottom:20px;">
            SOUTH <span style="color:#DC2626;">AERO</span>
          </div>
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.1);color:#10B981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:24px;">
            ✓
          </div>
          <h2 style="font-size:18px;font-weight:bold;margin:0 0 8px 0;color:#FFFFFF;">
            ยกเลิกการรับข่าวสารเรียบร้อยแล้ว
          </h2>
          <p style="color:#A3A3A3;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
            ระบบได้นำอีเมลของคุณออกจากรายชื่อผู้รับข่าวสารเรียบร้อยแล้ว คุณสามารถกลับมาเปิดรับข่าวสารใหม่อีกครั้งได้ตลอดเวลาผ่านหน้าโปรไฟล์หรือหน้าร้าน
          </p>
          <a href="/" style="display:inline-block;padding:12px 28px;background:#DC2626;color:#FFFFFF;text-decoration:none;border-radius:4px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
            กลับสู่หน้าร้านค้า SOUTH AERO
          </a>
        </div>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
