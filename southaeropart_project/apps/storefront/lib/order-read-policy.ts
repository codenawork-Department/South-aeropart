// Shared across both reads and server instances; permits ordinary 2.5-second payment polling.
export const ORDER_READ_MAX_REQUESTS = 120;
export const ORDER_READ_WINDOW_MS = 60_000;
