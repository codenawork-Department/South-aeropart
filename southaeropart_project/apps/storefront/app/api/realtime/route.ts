import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Keep track of active SSE client controllers in memory for live broadcast
type ClientController = ReadableStreamDefaultController<Uint8Array>;
const clients = new Set<ClientController>();

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

  // SSE Stream
  let controllerRef: ClientController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      clients.add(controller);

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
  if (!providedSecret || providedSecret !== secret) {
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
