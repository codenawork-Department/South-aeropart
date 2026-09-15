import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required — set it in .env or .env.local"),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters"),
  ADMIN_MFA_ENCRYPTION_KEY: z.string().min(32),
  NEXT_PUBLIC_ADMIN_URL: z.string().default("http://localhost:3001"),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().default("http://localhost:3000"),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && !["staging", "production"].includes(data.APP_ENV || "")) ctx.addIssue({code:z.ZodIssueCode.custom,path:["APP_ENV"],message:"Explicit deployment environment is required"});
});

const result = envSchema.safeParse(process.env);
if (!result.success) throw new Error(`Invalid server configuration: ${result.error.issues.map(issue => issue.path.join(".")).join(", ")}`);
export const env = result.data;
