import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters"),
  ADMIN_MFA_ENCRYPTION_KEY: z.string().min(32).optional(),
  NEXT_PUBLIC_ADMIN_URL: z.string().default("http://localhost:3001"),
});

export const env = envSchema.parse(process.env);
