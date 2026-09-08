"use client";

import { useState, useTransition } from "react";
import { Star, CheckCircle, XCircle, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { updateReviewModerationAction } from "@/actions/review.actions";

interface ReviewItem {
  id: string;
  productId: string;
  productName: string | null;
  productSku: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  rating: number;
  title: string | null;
  content: string;
  imageUrls: string[] | null;
  isVerifiedPurchase: boolean;
  moderationStatus: "pending" | "approved" | "rejected";
  moderationReason: string | null;
  moderatedByAdminId: string | null;
  moderatedAt: Date | null;
  moderatorName: string | null;
  createdAt: Date;
}

interface ReviewsClientProps {
  initialReviews: ReviewItem[];
}

export function ReviewsClient({ initialReviews }: ReviewsClientProps) {
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(initialReviews);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const filteredReviews = reviewsList.filter((r) => {
    if (filterStatus === "all") return true;
    return r.moderationStatus === filterStatus;
  });

  const handleModerate = (reviewId: string, status: "approved" | "rejected") => {
    startTransition(async () => {
      setActionMessage(null);
      const res = await updateReviewModerationAction({
        reviewId,
        status,
        reason: status === "rejected" ? "ปฏิเสธโดยผู้ดูแลระบบ" : undefined,
      });

      if (res.success) {
        setReviewsList((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  moderationStatus: status,
                  moderationReason: status === "rejected" ? "ปฏิเสธโดยผู้ดูแลระบบ" : null,
                }
              : r
          )
        );
        setActionMessage({ text: res.message || "บันทึกสถานะเรียบร้อย", type: "success" });
      } else {
        setActionMessage({ text: res.error || "เกิดข้อผิดพลาด", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            รีวิวและคะแนนสินค้า (Customer Reviews)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            ตรวจสอบและอนุมัติความคิดเห็นจากลูกค้าที่ซื้อสินค้า ({reviewsList.length} รายการ)
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 bg-[#141414] p-1.5 rounded-xl border border-white/10 text-xs">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                filterStatus === status
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {status === "all"
                ? "ทั้งหมด"
                : status === "pending"
                ? "รอตรวจสอบ"
                : status === "approved"
                ? "อนุมัติแล้ว"
                : "ปฏิเสธแล้ว"}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            actionMessage.type === "success"
              ? "bg-green-950/40 border-green-800 text-green-300"
              : "bg-red-950/40 border-red-800 text-red-300"
          }`}
        >
          {actionMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-8 text-center text-gray-400">
          <Star size={32} className="mx-auto mb-2 opacity-40 text-yellow-500" />
          <p className="text-sm">ไม่มีรีวิวสินค้าในหมวดหมู่นี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-[#141414] border border-[#242424] hover:border-[#333333] rounded-2xl p-5 transition-all shadow-lg space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div>
                  <span className="text-xs font-mono text-gray-400 block">
                    สินค้า: <span className="text-white font-medium">{review.productName || "N/A"}</span>{" "}
                    ({review.productSku || "-"})
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-gray-300">
                      โดย: {review.userName || review.userEmail || "ลูกค้าทั่วไป"}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                        <ShieldCheck size={11} /> Verified Purchase
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                      review.moderationStatus === "approved"
                        ? "bg-emerald-950/70 border border-emerald-700 text-emerald-300"
                        : review.moderationStatus === "rejected"
                        ? "bg-red-950/70 border border-red-700 text-red-300"
                        : "bg-amber-950/70 border border-amber-700 text-amber-300"
                    }`}
                  >
                    {review.moderationStatus === "approved" ? (
                      <CheckCircle size={13} />
                    ) : review.moderationStatus === "rejected" ? (
                      <XCircle size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    {review.moderationStatus === "approved"
                      ? "อนุมัติแล้ว"
                      : review.moderationStatus === "rejected"
                      ? "ปฏิเสธแล้ว"
                      : "รอตรวจสอบ"}
                  </span>
                </div>
              </div>

              {/* Rating and Content */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={
                        s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                      }
                    />
                  ))}
                  {review.title && (
                    <span className="text-sm font-semibold text-white ml-2">{review.title}</span>
                  )}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{review.content}</p>
                {review.moderationReason && (
                  <p className="text-xs text-red-400/90 mt-2 font-mono">
                    เหตุผลการคัดกรอง: {review.moderationReason}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-500">
                <span>{new Date(review.createdAt).toLocaleDateString("th-TH")}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={isPending || review.moderationStatus === "approved"}
                    onClick={() => handleModerate(review.id, "approved")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium disabled:opacity-40 transition-colors"
                  >
                    อนุมัติ (Approve)
                  </button>
                  <button
                    disabled={isPending || review.moderationStatus === "rejected"}
                    onClick={() => handleModerate(review.id, "rejected")}
                    className="px-3 py-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 text-white font-medium disabled:opacity-40 transition-colors"
                  >
                    ปฏิเสธ (Reject)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
