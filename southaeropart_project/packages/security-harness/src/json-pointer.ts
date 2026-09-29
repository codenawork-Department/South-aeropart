/** Mutate fixture data without traversing inherited properties or invoking __proto__. */
export function setJsonPointer(
  root: object,
  pointer: string,
  value: unknown,
): void {
  if (!pointer.startsWith("/") || /~(?![01])/u.test(pointer))
    throw new Error("Invalid fixture JSON pointer");
  const parts = pointer
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current = root as Record<string, unknown>;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (
      Array.isArray(current) &&
      (!/^(0|[1-9]\d*)$/.test(key) || Number(key) > 10000)
    )
      throw new Error("Invalid fixture array index");
    if (i === parts.length - 1) {
      Object.defineProperty(current, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      return;
    }
    const child = Object.hasOwn(current, key) ? current[key] : undefined;
    if (child === null || typeof child !== "object") {
      Object.defineProperty(current, key, {
        value: /^\d+$/.test(parts[i + 1]) ? [] : {},
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    current = current[key] as Record<string, unknown>;
  }
}
