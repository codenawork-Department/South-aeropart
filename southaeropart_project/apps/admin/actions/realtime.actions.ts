"use server";

import {
  db,
  orders,
  shippingQuotes,
  paymentReconciliationJobs,
  sql,
  desc,
  eq,
} from "@repo/db";
import { validateSession } from "@/lib/auth";

export interface RealtimeOrderItem {
  id: string;
  orderNumber: string;
  total: string;
  createdAt: string;
  createdAtMs: number;
}

export interface RealtimeQuoteItem {
  id: string;
  recipientName: string;
  phone: string;
  subtotal: string;
  createdAt: string;
  createdAtMs: number;
}

export interface RealtimeHeartbeatData {
  totalOrders: number;
  latestOrderTime: string | null;
  latestOrderUpdated: string | null;
  recentOrders: RealtimeOrderItem[];
  pendingQuotesCount: number;
  latestQuoteTime: string | null;
  latestQuoteUpdated: string | null;
  recentPendingQuotes: RealtimeQuoteItem[];
  pendingReconciliationCount: number;
  serverTimestamp: number;
}

export type RealtimeHeartbeatResponse =
  | { success: true; data: RealtimeHeartbeatData }
  | { success: false; error: string };

/**
 * Lightweight real-time heartbeat query for Admin.
 * Executes in ~3-8ms to detect incoming orders, shipping quote requests, and status changes.
 */
export async function getAdminRealtimeHeartbeatAction(): Promise<RealtimeHeartbeatResponse> {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const [orderStats, quoteStats, reconciliationStats] = await Promise.all([
      db
        .select({
          totalOrders: sql<number>`COALESCE(count(*), 0)::int`,
          latestOrderTime: sql<string | null>`max(${orders.createdAt})::text`,
          latestOrderUpdated: sql<string | null>`max(${orders.updatedAt})::text`,
        })
        .from(orders)
        .then((rows) => rows[0]),
      db
        .select({
          pendingQuotesCount: sql<number>`COALESCE(count(*) FILTER (WHERE ${shippingQuotes.status} = 'requested'), 0)::int`,
          latestQuoteTime: sql<string | null>`max(${shippingQuotes.createdAt})::text`,
          latestQuoteUpdated: sql<string | null>`max(${shippingQuotes.updatedAt})::text`,
        })
        .from(shippingQuotes)
        .then((rows) => rows[0]),
      db
        .select({
          pendingReconciliationCount: sql<number>`COALESCE(count(*) FILTER (WHERE ${paymentReconciliationJobs.state} = 'pending_review'), 0)::int`,
        })
        .from(paymentReconciliationJobs)
        .then((rows) => rows[0]),
    ]);

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

    let recentPendingQuotes: RealtimeQuoteItem[] = [];
    if (quoteStats && quoteStats.pendingQuotesCount > 0) {
      const topQuotes = await db
        .select({
          id: shippingQuotes.id,
          recipientName: sql<string>`COALESCE(${shippingQuotes.address}->>'recipientName', 'ลูกค้า')`,
          phone: sql<string>`COALESCE(${shippingQuotes.address}->>'phone', '')`,
          subtotal: shippingQuotes.subtotal,
          createdAt: sql<string>`${shippingQuotes.createdAt}::text`,
          createdAtEpoch: sql<number>`ROUND(EXTRACT(EPOCH FROM ${shippingQuotes.createdAt}) * 1000)::bigint`,
        })
        .from(shippingQuotes)
        .where(eq(shippingQuotes.status, "requested"))
        .orderBy(desc(shippingQuotes.createdAt))
        .limit(5);

      recentPendingQuotes = topQuotes.map((q) => ({
        id: q.id,
        recipientName: q.recipientName,
        phone: q.phone,
        subtotal: q.subtotal,
        createdAt: q.createdAt,
        createdAtMs: Number(q.createdAtEpoch || 0),
      }));
    }

    return {
      success: true,
      data: {
        totalOrders: orderStats?.totalOrders ?? 0,
        latestOrderTime: orderStats?.latestOrderTime ?? null,
        latestOrderUpdated: orderStats?.latestOrderUpdated ?? null,
        recentOrders,
        pendingQuotesCount: quoteStats?.pendingQuotesCount ?? 0,
        latestQuoteTime: quoteStats?.latestQuoteTime ?? null,
        latestQuoteUpdated: quoteStats?.latestQuoteUpdated ?? null,
        recentPendingQuotes,
        pendingReconciliationCount: reconciliationStats?.pendingReconciliationCount ?? 0,
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
