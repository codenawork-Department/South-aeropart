import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
    CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().default("/"),
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().default("/"),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
    REALTIME_SECRET: z.string().optional(),
    ORDER_TOKEN_SECRET: z.string().optional(),
    NEXT_PUBLIC_STOREFRONT_URL: z.string().default("http://localhost:3000"),
  })
  .superRefine((data, ctx) => {
    // SEC §5.6 Fail-Closed Production Requirements
    if (data.NODE_ENV === "production") {
      if (!data.CLERK_WEBHOOK_SECRET || data.CLERK_WEBHOOK_SECRET.startsWith("whsec_xxx")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLERK_WEBHOOK_SECRET is required and must not be a placeholder in production",
          path: ["CLERK_WEBHOOK_SECRET"],
        });
      }
      if (!data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required in production",
          path: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
        });
      }
      if (!data.REALTIME_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "REALTIME_SECRET is required in production for cache-invalidation webhooks",
          path: ["REALTIME_SECRET"],
        });
      }
      if (!data.CLOUDINARY_API_KEY || !data.CLOUDINARY_API_SECRET || !data.CLOUDINARY_CLOUD_NAME) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cloudinary credentials (CLOUD_NAME, API_KEY, API_SECRET) are required in production",
          path: ["CLOUDINARY_CLOUD_NAME"],
        });
      }
    }
  });

export const env = envSchema.parse(process.env);
