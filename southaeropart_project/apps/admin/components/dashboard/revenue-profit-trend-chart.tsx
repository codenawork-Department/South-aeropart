"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import styles from "./dashboard.module.css";

// Demonstration series only. The analytics response has no monthly history.
const exampleMonths = [
  { month: "ม.ค.", revenue: 940000, profit: 132000, orders: 3240 },
  { month: "ก.พ.", revenue: 980000, profit: 140000, orders: 3410 },
  { month: "มี.ค.", revenue: 1050000, profit: 152000, orders: 3680 },
  { month: "เม.ย.", revenue: 1120000, profit: 168000, orders: 3890 },
  { month: "พ.ค.", revenue: 1210000, profit: 182000, orders: 4120 },
  { month: "มิ.ย.", revenue: 1280000, profit: 198000, orders: 4320 },
];
const scale = 1500000;
const formatMoney = (value: number) => `฿${value.toLocaleString("th-TH")}`;

export function RevenueProfitTrendChart() {
  const [selectedIndex, setSelectedIndex] = useState(exampleMonths.length - 1);
  const selected = exampleMonths[selectedIndex];

  return (
    <div>
      <div className={styles.chartHeading}>
        <span>รายได้และกำไรสุทธิ</span>
        <span>หน่วย: ล้านบาท</span>
      </div>
      <div className={styles.chartLegend}>
        <span>
          <i className={styles.revenueSwatch} />
          รายได้
        </span>
        <span>
          <i className={styles.profitSwatch} />
          กำไรสุทธิ
        </span>
      </div>
      <div className={styles.chartArea}>
        <div className={styles.chartAxis} aria-hidden="true">
          {["1.5", "1.0", "0.5", "0"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className={styles.chartPlot}>
          <div className={styles.chartGrid} aria-hidden="true">
            {[0, 1, 2, 3].map((line) => (
              <span key={line} />
            ))}
          </div>
          <div className={styles.chartColumns}>
            {exampleMonths.map((point, index) => (
              <button
                key={point.month}
                className={styles.chartColumn}
                aria-pressed={selectedIndex === index}
                aria-label={`${point.month} รายได้ ${formatMoney(point.revenue)} กำไร ${formatMoney(point.profit)}`}
                onClick={() => setSelectedIndex(index)}
              >
                <span className={styles.chartBars} aria-hidden="true">
                  <span
                    className={styles.revenueBar}
                    style={{ height: `${(point.revenue / scale) * 100}%` }}
                  />
                  <span
                    className={styles.profitBar}
                    style={{ height: `${(point.profit / scale) * 100}%` }}
                  />
                </span>
                <span className={styles.monthLabel}>{point.month}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.chartSelection} aria-live="polite">
        <div>
          <span>เดือน {selected.month}</span>
          <strong>{selected.orders.toLocaleString("th-TH")} ออเดอร์</strong>
        </div>
        <div>
          <span>รายได้</span>
          <strong>{formatMoney(selected.revenue)}</strong>
        </div>
        <div>
          <span>กำไรสุทธิ</span>
          <strong>{formatMoney(selected.profit)}</strong>
        </div>
      </div>
      <div className={styles.dataNote}>
        <Info size={15} aria-hidden="true" />
        <p>
          ข้อมูลตัวอย่าง 6 เดือน ใช้มาตราส่วนเดียวกันทั้งสองชุดข้อมูล
          ยังไม่ได้เชื่อมต่อประวัติยอดขายรายเดือนจริง
        </p>
      </div>
    </div>
  );
}
