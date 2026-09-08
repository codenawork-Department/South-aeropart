import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Audit #7: In-memory rate limiting for POST endpoint
const postRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (postRateLimitMap.size > 1000) {
    for (const [k, v] of postRateLimitMap.entries()) {
      if (now > v.resetAt) postRateLimitMap.delete(k);
    }
  }
  const entry = postRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    postRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  entry.count++;
  return false;
}

// Keep track of active SSE client controllers in memory for live broadcast
type ClientController = ReadableStreamDefaultController<Uint8Array>;
const clients = new Set<ClientController>();

// Audit #13: Cap max SSE clients and prune dead connections via heartbeat
const MAX_SSE_CLIENTS = 250;
let heartbeatInterval: NodeJS.Timeout | null = null;

function ensureHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    if (clients.size === 0) {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      return;
    }
    const pingData = new TextEncoder().encode(": ping\n\n");
    clients.forEach((controller) => {
      try {
        controller.enqueue(pingData);
      } catch {
        clients.delete(controller);
      }
    });
  }, 25_000);

  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }
}

let currentCatalogVersion = Date.now();

function broadcastEvent(data: { type: string; version: number; action?: string; timestamp: number }) {
  currentCatalogVersion = data.version;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  clients.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch {
      clients.delete(controller);
    }
  });
}

/**
 * GET /api/realtime
 * - SSE stream for storefront clients
 * - Or JSON version check with ?check=1
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Simple poll/check query
  if (searchParams.get("check") === "1") {
    const clientVersion = Number(searchParams.get("v") || 0);
    return NextResponse.json({
      version: currentCatalogVersion,
      hasUpdate: clientVersion > 0 && currentCatalogVersion > clientVersion,
    });
  }

  // Audit #13: Connection limit guard
  if (clients.size >= MAX_SSE_CLIENTS) {
    return new Response("Service Unavailable: SSE client capacity reached", {
      status: 503,
      headers: {
        "Retry-After": "30",
        "Content-Type": "text/plain",
      },
    });
  }

  // SSE Stream
  let controllerRef: ClientController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      clients.add(controller);
      ensureHeartbeat();

      // Send initial connection packet
      const initMessage = `data: ${JSON.stringify({
        type: "connected",
        version: currentCatalogVersion,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initMessage));
    },
    cancel() {
      if (controllerRef) {
        clients.delete(controllerRef);
      }
      if (clients.size === 0 && heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * POST /api/realtime
 * - Called by Admin server actions when products/bundles/visibility change
 * - Protected by a shared secret to prevent unauthorised cache busting / SSE spam
 */
export async function POST(request: NextRequest) {
  // Audit #7: Rate limit the POST endpoint
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  // ── Auth: shared-secret validation ──────────────────────────────────────
  const secret = process.env.REALTIME_SECRET;
  if (!secret) {
    // Refuse requests when the secret env var is not configured — fail secure.
    return NextResponse.json(
      { success: false, error: "Realtime endpoint is not configured" },
      { status: 503 }
    );
  }
  const providedSecret = request.headers.get("x-realtime-secret");
  if (!providedSecret || !safeCompare(providedSecret, secret)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action || "catalog_update";
    const timestamp = Date.now();

    // Invalidate Storefront Next.js page & layout caches
    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/collection");
      revalidatePath("/products");
    } catch {
      // ignore
    }

    broadcastEvent({
      type: "refresh",
      version: timestamp,
      action,
      timestamp,
    });

    return NextResponse.json({
      success: true,
      version: timestamp,
      clientsCount: clients.size,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to broadcast realtime event" },
      { status: 500 }
    );
  }
}
