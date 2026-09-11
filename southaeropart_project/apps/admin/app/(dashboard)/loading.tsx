import { Skeleton } from "@/components/ui/skeleton";
import styles from "@/components/dashboard/dashboard.module.css";

export default function DashboardLoading() {
  return (
    <div
      className={styles.dashboard}
      role="status"
      aria-label="กำลังโหลดภาพรวมธุรกิจ"
      aria-busy="true"
    >
      <span className="sr-only">กำลังโหลดภาพรวมธุรกิจ</span>
      <div aria-hidden="true">
        <div className={styles.header}>
          <div className="space-y-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-60 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className={styles.contextBar}>
          <Skeleton className="h-5 w-40" />
        </div>
        <div className={styles.metricGrid}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.metricCard}>
              <Skeleton className="h-4 w-24 max-w-full" />
              <Skeleton className="mt-5 h-9 w-36 max-w-full" />
              <Skeleton className="mt-3 h-3 w-28 max-w-full" />
              <div className={styles.metricFooter}>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="mt-3 h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.tabs}>
          <Skeleton className="mb-4 h-6 w-20" />
          <Skeleton className="mb-4 h-6 w-32" />
          <Skeleton className="mb-4 h-6 w-20" />
        </div>
        <div className={styles.mainGrid}>
          <div className={styles.panel}>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-5 h-10 w-64 max-w-full" />
            <div className="mt-7 space-y-6">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.panel}>
            <Skeleton className="h-6 w-40 max-w-full" />
            <Skeleton className="mt-6 h-10 w-20" />
            <div className="mt-6 space-y-5">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
            <Skeleton className="mt-6 h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
