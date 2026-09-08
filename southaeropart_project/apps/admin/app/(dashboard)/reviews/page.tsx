import { getAdminReviewsAction } from "@/actions/review.actions";
import { ReviewsClient } from "@/components/reviews/ReviewsClient";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const res = await getAdminReviewsAction();
  const initialReviews = res.success && res.data ? (res.data as any) : [];

  return <ReviewsClient initialReviews={initialReviews} />;
}
