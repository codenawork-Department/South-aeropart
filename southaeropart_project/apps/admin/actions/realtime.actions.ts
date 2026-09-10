"use server";

import {
  db,
  orders,
  sql,
  desc,
} from "@repo/db";
import { validateSession } from "@/lib/auth";

export interface RealtimeOrderItem {
  id: string;
  orderNumber: string;
  total: string;
  createdAt: string;
  createdAtMs: number;
}

export interface RealtimeHeartbeatData {
  totalOrders: number;
  latestOrderTime: string | null;
  latestOrderUpdated: string | null;
  recentOrders: RealtimeOrderItem[];
  serverTimestamp: number;
}

export type RealtimeHeartbeatResponse =
  | { success: true; data: RealtimeHeartbeatData }
  | { success: false; error: string };

/**
 * Lightweight real-time heartbeat query for Admin.
 * Executes in ~3-8ms to detect incoming orders and changes without full re-fetching.
 * Returns up to 5 latest orders for concurrent multiple-order alerts.
 */
export async function getAdminRealtimeHeartbeatAction(): Promise<RealtimeHeartbeatResponse> {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const [orderStats] = await db
      .select({
        totalOrders: sql<number>`COALESCE(count(*), 0)::int`,
        latestOrderTime: sql<string | null>`max(${orders.createdAt})::text`,
        latestOrderUpdated: sql<string | null>`max(${orders.updatedAt})::text`,
      })
      .from(orders);

    let recentOrders: RealtimeOrderItem[] = [];

    if (orderStats && orderStats.totalOrders > 0) {
      const topOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          total: orders.total,
          createdAt: sql<string>`${orders.createdAt}::text`,
          createdAtEpoch: sql<number>`ROUND(EXTRACT(EPOCH FROM ${orders.createdAt}) * 1000)::bigint`,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5);

      recentOrders = topOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        createdAt: o.createdAt,
        createdAtMs: Number(o.createdAtEpoch || 0),
      }));
    }

    return {
      success: true,
      data: {
        totalOrders: orderStats?.totalOrders ?? 0,
        latestOrderTime: orderStats?.latestOrderTime ?? null,
        latestOrderUpdated: orderStats?.latestOrderUpdated ?? null,
        recentOrders,
        serverTimestamp: Date.now(),
      },
    };
  } catch (error) {
    console.error("[Realtime Action] Heartbeat error:", error);
    return {
      success: false,
      error: "Failed to fetch realtime heartbeat",
    };
  }
}
