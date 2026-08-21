"use server";
//h
import { z } from "zod";

const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(2000),
});

export async function submitReview(input: z.infer<typeof reviewSchema>) {
  const validated = reviewSchema.parse(input);

  // TODO: When database + moderation are connected:
  // 1. Run text through moderateText()
  // 2. If profanity detected, set status = "rejected"
  // 3. Otherwise set status = "pending" for manual review
  // 4. Insert into reviews table

  return {
    success: true,
    moderationStatus: "pending" as const,
  };
}
