"use client";

import { useState, useEffect, useTransition } from "react";
import { Star, MessageSquarePlus, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { submitReview, getProductReviews } from "@/actions/review.actions";

interface ProductReviewsSectionProps {
  productId: string;
}

interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  imageUrls: string[] | null;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  userFullName: string | null;
  userAvatarUrl: string | null;
}

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const [reviewsList, setReviewsList] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadReviews() {
      try {
        setLoading(true);
        const res = await getProductReviews(productId);
        if (res.success && res.data) {
          setReviewsList(res.data as any);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [productId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await submitReview({
        productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
      });

      if (res.success) {
        setMessage({
          type: res.moderationStatus === "rejected" ? "error" : "success",
          text: res.message || "ส่งรีวิวสำเร็จ!",
        });
        if (res.moderationStatus !== "rejected") {
          setTitle("");
          setContent("");
          setShowForm(false);
        }
      } else {
        setMessage({
          type: "error",
          text: res.error || "ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง",
        });
      }
    });
  };

  const avgRating =
    reviewsList.length > 0
      ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length).toFixed(1)
      : null;

  return (
    <section className="container-main py-12 md:py-16 border-t border-[#1E1E1E]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#1E1E1E]">
        <div>
          <div className="flex items-center gap-2 text-xs font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider mb-2">
            <Star size={14} className="fill-[var(--accent-red)]" /> VERIFIED REVIEWS
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold uppercase text-white tracking-wide">
            CUSTOMER REVIEWS (รีวิวจากผู้ใช้งานจริง)
          </h2>
          <div className="flex items-center gap-3 mt-2">
            {avgRating ? (
              <div className="flex items-center gap-2">
                <span className="font-heading text-2xl font-black text-white">{avgRating}</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={
                        s <= Math.round(Number(avgRating))
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-neutral-600"
                      }
                    />
                  ))}
                </div>
                <span className="text-xs text-[var(--text-secondary)]">({reviewsList.length} รีวิว)</span>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">ยังไม่มีคะแนนรีวิวสำหรับสินค้านี้</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary self-start md:self-auto text-xs uppercase font-heading tracking-wider py-3 px-6 flex items-center gap-2"
        >
          <MessageSquarePlus size={16} /> {showForm ? "ปิดแบบฟอร์ม" : "เขียนรีวิวสินค้า"}
        </button>
      </div>

      {message && (
        <div
          className={`my-6 p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
              : "bg-red-950/40 border-red-800 text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="my-8 bg-[#121212] border border-[#262626] rounded-2xl p-6 sm:p-8 space-y-5 animate-fade-in"
        >
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
            เขียนรีวิวสินค้าของคุณ
          </h3>

          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-300 mb-2">
              ให้คะแนนความพึงพอใจ <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors cursor-pointer"
                >
                  <Star
                    size={24}
                    className={
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-neutral-600"
                    }
                  />
                </button>
              ))}
              <span className="text-xs font-mono text-gray-400 ml-2">({rating} / 5 ดาว)</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-300 mb-1.5">
              หัวข้อรีวิว (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น งานคาร์บอนเนียนมาก เข้ารูปพอดี 100%"
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-300 mb-1.5">
              ความคิดเห็นของคุณ <span className="text-[var(--accent-red)]">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="บอกเล่าประสบการณ์การใช้งาน คุณภาพชิ้นงาน หรือการติดตั้ง..."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="btn-primary text-xs uppercase font-heading tracking-wider py-3 px-8 flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> กำลังส่งรีวิว...
              </>
            ) : (
              "ยืนยันและส่งรีวิว"
            )}
          </button>
        </form>
      )}

      {/* Review List */}
      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-gray-500 text-xs">กำลังโหลดความคิดเห็น...</div>
        ) : reviewsList.length === 0 ? (
          <div className="py-12 bg-[#101010] border border-[#1E1E1E] rounded-2xl text-center text-gray-400 p-8">
            <Star size={28} className="mx-auto mb-2 opacity-30 text-yellow-500" />
            <p className="text-xs">ยังไม่มีรีวิวสำหรับสินค้านี้ ร่วมเป็นคนแรกที่รีวิวสินค้านี้!</p>
          </div>
        ) : (
          reviewsList.map((review) => (
            <div
              key={review.id}
              className="bg-[#121212] border border-[#222222] rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-heading text-xs font-bold text-white uppercase">
                    {(review.userFullName || "C")[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {review.userFullName || "ลูกค้าผู้มีอุปการคุณ"}
                      </span>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                          <ShieldCheck size={11} /> Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="text-[0.65rem] text-neutral-500 font-mono">
                      {new Date(review.createdAt).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      className={
                        s <= review.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-neutral-700"
                      }
                    />
                  ))}
                </div>
              </div>

              {review.title && (
                <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wide">
                  {review.title}
                </h4>
              )}
              <p className="text-xs text-gray-300 leading-relaxed">{review.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
