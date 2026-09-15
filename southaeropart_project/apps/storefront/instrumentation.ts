export async function register() {
  // Production artifacts are built without runtime credentials in CI.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    await import("./lib/env");
  }
}
