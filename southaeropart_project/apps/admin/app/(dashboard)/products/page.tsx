import Link from "next/link";
import { Package, Plus } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            จัดการสินค้า (Products Management)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            รายการสินค้าอะไหล่และชิ้นส่วน South Aero ทั้งหมดในระบบ
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md w-full sm:w-auto shrink-0 cursor-pointer">
          <Plus size={15} />
          <span>เพิ่มสินค้าใหม่</span>
        </button>
      </div>

      <div className="bg-[#121212] border border-[#222222] rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-gray-400 mx-auto flex items-center justify-center mb-3">
          <Package size={24} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white mb-1">ยังไม่มีสินค้าในรายการ</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          พร้อมสำหรับการจัดการรายการสินค้า สต็อก ราคา และรูปภาพสินค้า Cloudinary
        </p>
      </div>
    </div>
  );
}

