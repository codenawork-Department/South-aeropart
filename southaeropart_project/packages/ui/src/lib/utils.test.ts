import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility (class merging)", () => {
  it("merges simple string class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional falsy values gracefully", () => {
    expect(cn("btn", false && "btn-active", null, undefined, "")).toBe("btn");
  });

  it("resolves Tailwind CSS conflicts by keeping the last conflicting class", () => {
    // p-4 vs p-2: tailwind-merge resolves to p-2
    expect(cn("p-4", "p-2")).toBe("p-2");
    // text colors conflict
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    // layout conflict
    expect(cn("block", "inline-block", "flex")).toBe("flex");
  });

  it("handles array inputs correctly", () => {
    expect(cn(["font-bold", "text-center"])).toBe("font-bold text-center");
  });

  it("handles object inputs for conditional classes", () => {
    expect(
      cn({
        "bg-primary": true,
        "opacity-50": false,
        "cursor-pointer": true,
      })
    ).toBe("bg-primary cursor-pointer");
  });

  it("handles complex nested mixed inputs", () => {
    const isActive = true;
    const isDisabled = false;
    expect(
      cn(
        "base-btn",
        ["text-sm", { "btn-active": isActive }],
        { "btn-disabled": isDisabled },
        "px-4 px-2"
      )
    ).toBe("base-btn text-sm btn-active px-2");
  });
});
