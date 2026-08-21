import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters"),
  ADMIN_MFA_ENCRYPTION_KEY: z.string().min(32).optional(),
  NEXT_PUBLIC_ADMIN_URL: z.string().default("http://localhost:3001"),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().default("http://localhost:3000"),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  OMISE_PUBLIC_KEY: z.string().optional(),
  OMISE_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);

