import { ShoppingCart } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          รายการคำสั่งซื้อ (Orders Management)
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          ตรวจสอบคำสั่งซื้อ สถานะการชำระเงินผ่าน Omise และการจัดส่ง
        </p>
      </div>

      <div className="bg-[#121212] border border-[#222222] rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-gray-400 mx-auto flex items-center justify-center mb-3">
          <ShoppingCart size={24} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white mb-1">ยังไม่มีคำสั่งซื้อใหม่</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          เมื่อลูกค้าสั่งซื้อสินค้าผ่านหน้า Storefront ข้อมูลคำสั่งซื้อและสถานะการชำระเงินจะแสดงที่นี่
        </p>
      </div>
    </div>
  );
}

