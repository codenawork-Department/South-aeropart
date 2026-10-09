import { adminEnvSchema } from "@repo/lib/env-schemas";

const result = adminEnvSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(
    `Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
  );
}
export const env = result.data;
