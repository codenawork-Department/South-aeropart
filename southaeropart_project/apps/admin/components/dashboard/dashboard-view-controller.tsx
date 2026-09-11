"use client";

import {
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Info,
  Layers3,
  Megaphone,
  Package,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { FullDashboardAnalytics } from "@/actions/analytics.actions";
import { RevenueProfitTrendChart } from "./revenue-profit-trend-chart";
import { ProfitWaterfallChart } from "./profit-waterfall-chart";
import { ChannelBreakdownMatrix } from "./channel-breakdown-matrix";
import { CustomerFunnelAnalytics } from "./customer-funnel-analytics";
import { ProductsMerchandisingAnalytics } from "./products-merchandising-analytics";
import { GrowthSimulatorActionPlan } from "./growth-simulator-action-plan";
import { RootCauseDiagnostic } from "./root-cause-diagnostic";
import { StrategicMatrix } from "./strategic-matrix";
import { RealtimeSyncWidget } from "@/components/ui/realtime-sync-widget";
import styles from "./dashboard.module.css";

const tabs = [
  { id: "sales", label: "ภาพรวม", icon: BarChart3 },
  { id: "products", label: "สินค้าและสต็อก", icon: Package },
  { id: "funnel", label: "ลูกค้า", icon: Users },
  { id: "marketing", label: "การตลาด", icon: Megaphone },
  { id: "strategy", label: "วางแผนธุรกิจ", icon: SlidersHorizontal },
] as const;
type DashboardTab = (typeof tabs)[number]["id"];

const money = (value: number) =>
  Number.isFinite(value)
    ? `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`
    : "—";
const count = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString("th-TH") : "—";
const percent = (value: number) =>
  Number.isFinite(value)
    ? `${value.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`
    : "—";
const barWidth = (value: number) =>
  `${Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0}%`;

function DataBadge({
  live,
  estimate = false,
}: {
  live?: boolean;
  estimate?: boolean;
}) {
  return (
    <span
      className={`${styles.badge} ${live && !estimate ? styles.liveBadge : ""}`}
    >
      <span className={styles.statusDot} aria-hidden="true" />
      {estimate ? "ประมาณการ" : live ? "ข้อมูลจริง" : "ข้อมูลตัวอย่าง"}
    </span>
  );
}

function DataNote({ children }: { children: ReactNode }) {
  return (
    <div className={styles.dataNote}>
      <Info size={15} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function DashboardViewController({
  initialData,
}: {
  initialData?: FullDashboardAnalytics;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [activeTab, setActiveTab] = useState<DashboardTab>("sales");
  const [chartView, setChartView] = useState<
    "products" | "trend" | "waterfall"
  >("products");
  const [strategyView, setStrategyView] = useState<
    "simulator" | "diagnostic" | "swot"
  >("simulator");
  const refresh = () => startRefresh(() => router.refresh());

  function handleTabKey(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[next].id);
    document.getElementById(`dashboard-tab-${tabs[next].id}`)?.focus();
  }

  if (!initialData)
    return (
      <div className={styles.dashboard}>
        <div className={styles.emptyState}>
          <BarChart3 size={28} />
          <h1>ยังไม่สามารถแสดงภาพรวมได้</h1>
          <p>ลองโหลดข้อมูลอีกครั้งเพื่อดูผลการดำเนินงาน</p>
          <button
            className={styles.button}
            onClick={refresh}
            disabled={isRefreshing}
          >
            โหลดข้อมูลอีกครั้ง
          </button>
        </div>
      </div>
    );

  const { executive: metrics, products, marketSplit, dataSource } = initialData;
  const ordersLive = dataSource.orders === "live";
  const productsLive = dataSource.products === "live";
  // The service can return sample SKUs even when orders are live.
  const rankingLive =
    ordersLive &&
    products.topSkus.length > 0 &&
    products.topSkus.every((item) => !item.id.startsWith("sku-"));
  const maxProductRevenue = Math.max(
    0,
    ...products.topSkus.map((item) => item.revenue),
  );
  const cards = [
    {
      title: "รายได้รวม",
      english: "TOTAL REVENUE",
      value: money(metrics.revenue.total),
      icon: CircleDollarSign,
      note: "จากคำสั่งซื้อที่ระบบนำมาคำนวณ",
      primary: true,
    },
    {
      title: "คำสั่งซื้อ",
      english: "ORDERS",
      value: count(metrics.orders.total),
      icon: ShoppingBag,
      note: "ชำระแล้วหรืออยู่ระหว่างดำเนินการ",
    },
    {
      title: "ยอดซื้อต่อออเดอร์",
      english: "AVERAGE ORDER VALUE",
      value: money(metrics.aov.value),
      icon: Layers3,
      note: "รายได้รวม ÷ จำนวนคำสั่งซื้อ",
    },
    {
      title: "กำไรสุทธิโดยประมาณ",
      english: "ESTIMATED NET PROFIT",
      value: money(metrics.netProfit.total),
      icon: BarChart3,
      note: `อัตรากำไร ${percent(metrics.netProfit.marginPercent)} · ใช้สัดส่วนต้นทุนสมมติ`,
      estimate: true,
    },
  ];

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SOUTH AERO / ANALYTICS</p>
          <h1>ภาพรวมธุรกิจ</h1>
          <p className={styles.subtitle}>
            ยอดขาย ลูกค้า และสินค้าของร้านในมุมเดียว
          </p>
        </div>
        <div className={styles.headerActions}>
          <RealtimeSyncWidget compact />
          <button
            className={styles.button}
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="รีเฟรชข้อมูลแดชบอร์ด"
          >
            <RefreshCw
              size={15}
              className={isRefreshing ? "animate-spin" : ""}
            />
            {isRefreshing ? "กำลังอัปเดต" : "รีเฟรชข้อมูล"}
          </button>
        </div>
      </header>

      <div className={styles.contextBar}>
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          ข้อมูลสะสมทั้งหมด
        </span>
        <span className={styles.contextHint}>
          ยังไม่มีข้อมูลเปรียบเทียบตามช่วงเวลา
        </span>
        <Link href="/orders" className={styles.textLink}>
          ดูคำสั่งซื้อ <ArrowUpRight size={14} />
        </Link>
      </div>

      <section className={styles.metricGrid} aria-label="ตัวชี้วัดหลัก">
        {cards.map((card) => (
          <article
            key={card.english}
            className={`${styles.metricCard} ${card.primary ? styles.primaryMetric : ""}`}
          >
            <div className={styles.metricHeading}>
              <span>{card.title}</span>
              <card.icon size={17} aria-hidden="true" />
            </div>
            <p className={styles.metricValue}>{card.value}</p>
            <p className={styles.metricEnglish}>{card.english}</p>
            <div className={styles.metricFooter}>
              <DataBadge live={ordersLive} estimate={card.estimate} />
              <p>{card.note}</p>
            </div>
          </article>
        ))}
      </section>

      <nav className={styles.tabs} role="tablist" aria-label="หมวดการวิเคราะห์">
        {tabs.map((tab, index) => (
          <button
            type="button"
            role="tab"
            id={`dashboard-tab-${tab.id}`}
            aria-controls="dashboard-panel"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKey(event, index)}
            className={activeTab === tab.id ? styles.activeTab : ""}
          >
            <tab.icon size={17} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </nav>

      <section
        role="tabpanel"
        id="dashboard-panel"
        aria-labelledby={`dashboard-tab-${activeTab}`}
        tabIndex={0}
        className={styles.tabPanel}
      >
        {activeTab === "sales" && (
          <div className={styles.overview}>
            <div className={styles.mainGrid}>
              <section
                className={styles.panel}
                aria-labelledby="revenue-analysis-title"
              >
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.eyebrow}>SALES PERFORMANCE</p>
                    <h2 id="revenue-analysis-title">วิเคราะห์รายได้</h2>
                  </div>
                  <DataBadge live={rankingLive && chartView === "products"} />
                </div>
                <div
                  className={styles.segmented}
                  aria-label="รูปแบบการวิเคราะห์รายได้"
                >
                  {(
                    [
                      { id: "products", label: "ตามสินค้า" },
                      { id: "trend", label: "แนวโน้ม 6 เดือน" },
                      { id: "waterfall", label: "โครงสร้างกำไร" },
                    ] as const
                  ).map((view) => (
                    <button
                      key={view.id}
                      aria-pressed={chartView === view.id}
                      onClick={() => setChartView(view.id)}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
                {chartView === "products" && (
                  <>
                    <div className={styles.rankingHeader}>
                      <span>สินค้า 5 อันดับแรกตามรายได้</span>
                      <span>รายได้ / จำนวนขาย</span>
                    </div>
                    {products.topSkus.length === 0 ? (
                      <div className={styles.emptyState}>
                        <Package size={26} />
                        <p>ยังไม่มีข้อมูลยอดขายสินค้า</p>
                      </div>
                    ) : (
                      <ol className={styles.ranking}>
                        {products.topSkus.slice(0, 5).map((product, index) => (
                          <li key={product.id}>
                            <span className={styles.rankNumber}>
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className={styles.rankBody}>
                              <div className={styles.rankDetails}>
                                <div>
                                  <p className={styles.productName}>
                                    {product.name}
                                  </p>
                                  <span className={styles.productMeta}>
                                    {product.type === "bundle"
                                      ? "ชุดเซ็ต"
                                      : "อะไหล่ชิ้นเดี่ยว"}
                                  </span>
                                </div>
                                <div className={styles.rankValue}>
                                  <strong>{money(product.revenue)}</strong>
                                  <span>{count(product.unitsSold)} ชิ้น</span>
                                </div>
                              </div>
                              <div
                                className={styles.barTrack}
                                aria-hidden="true"
                              >
                                <div
                                  className={
                                    index === 0
                                      ? styles.brandBar
                                      : styles.neutralBar
                                  }
                                  style={{
                                    width: barWidth(
                                      maxProductRevenue > 0
                                        ? (product.revenue /
                                            maxProductRevenue) *
                                            100
                                        : 0,
                                    ),
                                  }}
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    <div className={styles.panelFooter}>
                      <span>ความยาวแท่งเทียบกับสินค้าที่มีรายได้สูงสุด</span>
                      <button
                        className={styles.textLink}
                        onClick={() => setActiveTab("products")}
                      >
                        เจาะลึกสินค้า <ArrowRight size={14} />
                      </button>
                    </div>
                    {!rankingLive && (
                      <DataNote>
                        รายการนี้มีข้อมูลตัวอย่าง ใช้สำรวจรูปแบบการวิเคราะห์
                      </DataNote>
                    )}
                  </>
                )}
                {chartView === "trend" && <RevenueProfitTrendChart />}
                {chartView === "waterfall" && (
                  <div className={styles.detail}>
                    <DataNote>
                      ตัวอย่างโครงสร้างกำไรจากรายได้ ฿1,280,000 และต้นทุนสมมติ
                      ไม่ใช่ผลประกอบการจริงของร้าน
                    </DataNote>
                    <ProfitWaterfallChart />
                  </div>
                )}
              </section>

              <aside
                className={styles.panel}
                aria-labelledby="stock-attention-title"
              >
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.eyebrow}>INVENTORY WATCH</p>
                    <h2 id="stock-attention-title">สต็อกที่ควรตรวจสอบ</h2>
                  </div>
                  <Package
                    size={19}
                    className={styles.mutedIcon}
                    aria-hidden="true"
                  />
                </div>
                <div className={styles.inventorySummary}>
                  <div>
                    <strong>{products.lowStockAlerts.length}</strong>
                    <span>รายการที่แสดง</span>
                  </div>
                  <DataBadge live={productsLive} />
                </div>
                <p className={styles.helper}>
                  แสดงสูงสุด 5 รายการจากการแจ้งเตือนสต็อก
                </p>
                <ul className={styles.stockList}>
                  {products.lowStockAlerts.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <div>
                        <p className={styles.productName}>{item.name}</p>
                        <span className={styles.productMeta}>{item.sku}</span>
                      </div>
                      <span
                        className={`${styles.stockCount} ${item.stockQuantity <= 5 ? styles.lowStock : ""}`}
                      >
                        {count(item.stockQuantity)}
                        <small>คงเหลือ</small>
                      </span>
                    </li>
                  ))}
                </ul>
                {products.lowStockAlerts.length === 0 && (
                  <div className={styles.emptyState}>
                    <Package size={24} />
                    <p>ไม่มีรายการแจ้งเตือนสต็อก</p>
                  </div>
                )}
                <Link href="/products" className={styles.inventoryLink}>
                  ตรวจสอบสินค้าทั้งหมด <ArrowRight size={15} />
                </Link>
              </aside>
            </div>

            <div className={styles.secondaryGrid}>
              <section
                className={styles.panel}
                aria-labelledby="customer-overview-title"
              >
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.eyebrow}>CUSTOMER RETENTION</p>
                    <h2 id="customer-overview-title">การกลับมาซื้อซ้ำ</h2>
                  </div>
                  <DataBadge live={ordersLive} />
                </div>
                <div className={styles.customerSummary}>
                  <strong>{percent(metrics.repeatRate.percent)}</strong>
                  <p>
                    สัดส่วนลูกค้าที่มีคำสั่งซื้อ
                    <br />
                    มากกว่า 1 ครั้ง
                  </p>
                </div>
                <div className={styles.customerBar} aria-hidden="true">
                  <div
                    style={{ width: barWidth(metrics.repeatRate.percent) }}
                  />
                </div>
                <div className={styles.customerLegend}>
                  <span>
                    <i />
                    ซื้อซ้ำ{" "}
                    <strong>
                      {count(metrics.repeatRate.repeatCustomersCount)}
                    </strong>{" "}
                    คน
                  </span>
                  <span>
                    <i />
                    ซื้อครั้งเดียว{" "}
                    <strong>
                      {count(metrics.repeatRate.newCustomersCount)}
                    </strong>{" "}
                    คน
                  </span>
                </div>
                <button
                  className={styles.sectionLink}
                  onClick={() => setActiveTab("funnel")}
                >
                  ดูพฤติกรรมลูกค้า <ChevronRight size={15} />
                </button>
              </section>
              <section
                className={styles.panel}
                aria-labelledby="market-overview-title"
              >
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.eyebrow}>MARKET DISTRIBUTION</p>
                    <h2 id="market-overview-title">สัดส่วนตลาด</h2>
                  </div>
                  <DataBadge estimate />
                </div>
                <div className={styles.marketRows}>
                  {[
                    { label: "ในประเทศ", data: marketSplit.domestic },
                    { label: "ต่างประเทศ", data: marketSplit.international },
                  ].map((market) => (
                    <div key={market.label}>
                      <div className={styles.marketLabel}>
                        <span>{market.label}</span>
                        <strong>
                          {money(market.data.revenue)}{" "}
                          <small>{percent(market.data.sharePercent)}</small>
                        </strong>
                      </div>
                      <div className={styles.barTrack} aria-hidden="true">
                        <div
                          className={styles.neutralBar}
                          style={{ width: barWidth(market.data.sharePercent) }}
                        />
                      </div>
                      <p>{count(market.data.orders)} คำสั่งซื้อ</p>
                    </div>
                  ))}
                </div>
                <p className={styles.helper}>
                  คำนวณจากสัดส่วนสมมติ 80 : 20 ยังไม่ได้แยกตามที่อยู่จัดส่งจริง
                </p>
              </section>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className={styles.detail}>
            <DataNote>
              สินค้าและสต็อก: {productsLive ? "ข้อมูลจริง" : "ข้อมูลตัวอย่าง"} ·
              ยอดขายอันดับสินค้า:{" "}
              {rankingLive ? "ข้อมูลจริง" : "ข้อมูลตัวอย่าง"} · ต้นทุน มาร์จิ้น
              แนวโน้ม และจำนวนวันที่สต็อกจะหมดเป็นค่าประมาณการ
            </DataNote>
            <ProductsMerchandisingAnalytics
              topSkus={products.topSkus}
              lowStockAlerts={products.lowStockAlerts}
              catalogDemandItems={products.catalogDemandItems}
            />
          </div>
        )}
        {activeTab === "funnel" && (
          <div className={styles.detail}>
            <DataNote>
              Funnel การเข้าชมและขั้นตอนก่อนซื้อใช้แบบจำลอง · อัตราซื้อซ้ำ:{" "}
              {ordersLive ? "คำนวณจากคำสั่งซื้อจริง" : "ข้อมูลตัวอย่าง"} ·
              รีวิว:{" "}
              {dataSource.reviews === "live" ? "ข้อมูลจริง" : "ข้อมูลตัวอย่าง"}
            </DataNote>
            <CustomerFunnelAnalytics
              funnelData={initialData.funnel}
              reviewsData={initialData.reviews}
              cohortData={metrics.repeatRate}
            />
          </div>
        )}
        {activeTab === "marketing" && (
          <div className={styles.detail}>
            <DataNote>
              ข้อมูลช่องทางโฆษณา ROAS และ CAC เป็นข้อมูลตัวอย่าง
              ยังไม่ได้เชื่อมต่อผลโฆษณาจริง
            </DataNote>
            <ChannelBreakdownMatrix />
          </div>
        )}
        {activeTab === "strategy" && (
          <div className={styles.detail}>
            <DataNote>
              เครื่องมือวางแผนใช้ข้อมูลและสมมติฐานตัวอย่าง
              ผลลัพธ์ไม่ใช่การคาดการณ์จากยอดขายจริง
            </DataNote>
            <div
              className={styles.segmented}
              aria-label="เครื่องมือวางแผนธุรกิจ"
            >
              {(
                [
                  { id: "simulator", label: "จำลองการเติบโต" },
                  { id: "diagnostic", label: "วิเคราะห์ปัญหา" },
                  { id: "swot", label: "จุดแข็งและโอกาส" },
                ] as const
              ).map((view) => (
                <button
                  key={view.id}
                  aria-pressed={strategyView === view.id}
                  onClick={() => setStrategyView(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
            {strategyView === "simulator" && <GrowthSimulatorActionPlan />}
            {strategyView === "diagnostic" && <RootCauseDiagnostic />}
            {strategyView === "swot" && <StrategicMatrix />}
          </div>
        )}
      </section>
      <footer className={styles.pageFooter}>
        <Info size={14} aria-hidden="true" />
        <p>
          รายได้และคำสั่งซื้อเป็นยอดสะสม · กำไรใช้สัดส่วนต้นทุนสมมติ ·
          ป้ายกำกับระบุแหล่งข้อมูลของแต่ละส่วน
        </p>
      </footer>
    </div>
  );
}
