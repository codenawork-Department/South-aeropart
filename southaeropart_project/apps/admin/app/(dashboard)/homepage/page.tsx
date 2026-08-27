import { getHeroCardsAdminAction } from "@/actions/homepage.actions";
import { HomepageHeroCardsManager } from "./hero-cards-manager";

export const dynamic = "force-dynamic";

export default async function HomepageShowcasePage() {
  const result = await getHeroCardsAdminAction();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-red-800/40 text-[0.65rem] font-medium text-red-400 uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Storefront Showcase
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            จัดการ Hero Showcase หน้าแรก
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            ปรับแต่งรูปภาพ 3 คันใต้โมเดล 3D Ferrari, เลือกรุ่นรถยนต์ และกำหนดเส้นทางนำทาง (Target Link)
          </p>
        </div>

        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161616] hover:bg-[#202020] border border-[#2B2B2B] text-xs font-semibold text-gray-300 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>ดูหน้าร้านจริง</span>
          <span className="text-[0.65rem] font-mono text-gray-500">:3000 ↗</span>
        </a>
      </div>

      {/* Main Interactive Manager Component */}
      <HomepageHeroCardsManager
        initialCards={result.cards}
        brands={result.brands}
        models={result.models}
      />
    </div>
  );
}
