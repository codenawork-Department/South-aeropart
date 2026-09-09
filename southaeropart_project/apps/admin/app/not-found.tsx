import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#0A0A0A]">
      <div className="max-w-md w-full text-center space-y-6 bg-[#141414] border border-[#262626] p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#1F1F1F] text-[#E51D24] mx-auto flex items-center justify-center ring-1 ring-[#333333]">
          <Compass size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#E51D24]">
            ERROR 404
          </span>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
            PAGE NOT FOUND
          </h1>
          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            ไม่พบหน้าที่คุณต้องการในระบบแอดมิน ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกย้ายไปแล้ว
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#E51D24] hover:bg-[#FF2E36] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            <ArrowLeft size={16} />
            กลับแดชบอร์ด
          </Link>
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333333] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            จัดการสินค้า
          </Link>
        </div>
      </div>
    </div>
  );
}
