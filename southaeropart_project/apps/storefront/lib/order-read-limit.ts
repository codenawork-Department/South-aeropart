import { headers } from "next/headers";
import { takeRateLimitWithRetryAfter } from "@repo/db";
import { getClientIp } from "./rate-limiter";

import {
  ORDER_READ_MAX_REQUESTS,
  ORDER_READ_WINDOW_MS,
} from "./order-read-policy";
export async function orderReadLimit() {
  const ip = getClientIp({ headers: await headers() });
  return takeRateLimitWithRetryAfter(
    `order-read:${ip}`,
    ORDER_READ_MAX_REQUESTS,
    ORDER_READ_WINDOW_MS,
  );
}
