/** A bounded scanner before JSON.parse: decoded duplicate keys, container depth and UTF-8. */
export class JsonInputError extends Error {
  constructor(readonly status: 400 | 413 | 422) {
    super("Invalid request");
  }
}
export function parseBoundedJson(
  raw: Buffer,
  maxBytes = 1048576,
  maxDepth = 32,
): unknown {
  if (raw.length > maxBytes) throw new JsonInputError(413);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      raw,
    );
  } catch {
    throw new JsonInputError(400);
  }
  let i = 0;
  const bad = (): never => {
    throw new JsonInputError(400);
  };
  const whitespace = () => {
    while (/[ \t\r\n]/.test(text[i] ?? "\0")) i++;
  };
  function string(): string {
    const start = i;
    if (text[i++] !== '"') bad();
    while (i < text.length) {
      const char = text[i++];
      if (char === '"') {
        try {
          return JSON.parse(text.slice(start, i)) as string;
        } catch {
          return bad();
        }
      }
      if (char === "\\") i++;
    }
    return bad();
  }
  function value(depth: number): void {
    whitespace();
    const c = text[i];
    if (c === "{" || c === "[") {
      if (depth + 1 > maxDepth) throw new JsonInputError(422);
      const object = c === "{",
        end = object ? "}" : "]";
      const keys = new Set<string>();
      i++;
      whitespace();
      if (text[i] === end) {
        i++;
        return;
      }
      while (i < text.length) {
        if (object) {
          whitespace();
          const key = string();
          if (keys.has(key)) bad();
          keys.add(key);
          if (["__proto__", "prototype", "constructor"].includes(key))
            throw new JsonInputError(422);
          whitespace();
          if (text[i++] !== ":") bad();
        }
        value(depth + 1);
        whitespace();
        if (text[i] === end) {
          i++;
          return;
        }
        if (text[i++] !== ",") bad();
        whitespace();
      }
      bad();
    } else if (c === '"') string();
    else {
      const tail = text.slice(i);
      const token =
        /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
          tail,
        )?.[0];
      if (!token) bad();
      i += token!.length;
      if (/^-?\d/.test(token!)) {
        const n = Number(token);
        if (
          !Number.isFinite(n) ||
          (Number.isInteger(n) && !Number.isSafeInteger(n))
        )
          throw new JsonInputError(422);
      }
    }
  }
  value(0);
  whitespace();
  if (i !== text.length) bad();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return bad();
  }
}
