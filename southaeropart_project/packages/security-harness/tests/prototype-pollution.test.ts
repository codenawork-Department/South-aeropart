import { describe, it, expect } from "vitest";
import { runPrototypeCheckInIsolatedProcess } from "../src/prototype-isolation";
describe("Isolated JavaScript operations (not application-handler evidence)", () => {
  it("distinguishes receiver prototype changes from Object.prototype pollution", () => {
    const res = runPrototypeCheckInIsolatedProcess(
      '{"__proto__":{"isAdmin":true}}',
    );
    expect(res.completed).toBe(true);
    expect(res.polluted).toBe(false);
    expect(res.receiverPrototypeChanged).toBe(true);
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });
  it("keeps own prototype keys when supplied as Buffer", () => {
    const res = runPrototypeCheckInIsolatedProcess(
      Buffer.from('{"constructor":{"prototype":{"polluted":true}}}'),
    );
    expect(res.completed).toBe(true);
    expect(res.polluted).toBe(false);
  });
  it("does not turn malformed input or incomplete workers into safety passes", () => {
    const res = runPrototypeCheckInIsolatedProcess("{");
    expect(res.completed).toBe(false);
    expect(res.polluted).toBeNull();
    expect(res.exitCode).not.toBe(0);
  });
});
