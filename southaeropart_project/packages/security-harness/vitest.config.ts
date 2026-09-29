import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.diagnostic.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  plugins: [
    {
      name: "resolve-workspace-at-alias",
      enforce: "pre",
      resolveId(id, importer) {
        if (id.startsWith("@/")) {
          const sub = id.slice(2);
          const normalizedImporter = (importer || "").replace(/\\/g, "/");
          const isFromAdmin = normalizedImporter.includes("apps/admin");
          const baseDir = isFromAdmin
            ? path.resolve(__dirname, "../../apps/admin")
            : path.resolve(__dirname, "../../apps/storefront");

          const candidate = path.resolve(baseDir, sub);
          for (const ext of [
            "",
            ".ts",
            ".tsx",
            ".js",
            "/index.ts",
            "/index.tsx",
            "/index.js",
          ]) {
            const fullPath = candidate + ext;
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
              return fullPath;
            }
          }
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: "next/headers",
        replacement: path.resolve(__dirname, "./src/mocks/next-headers.ts"),
      },
      {
        find: "@repo/security-harness",
        replacement: path.resolve(__dirname, "./src"),
      },
      {
        find: "@storefront",
        replacement: path.resolve(__dirname, "../../apps/storefront"),
      },
      {
        find: "@admin",
        replacement: path.resolve(__dirname, "../../apps/admin"),
      },
    ],
  },
});
