"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import {
  Star,
  X,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { submitReview, uploadReviewImageAction } from "@/actions/review.actions";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
  existingReview?: {
    id: string;
    rating: number;
    title: string | null;
    content: string;
    imageUrls?: string[] | null;
  } | null;
  onReviewSubmitted?: () => void;
}

export function ProductReviewModal({
  isOpen,
  onClose,
  product,
  existingReview,
  onReviewSubmitted,
}: ProductReviewModalProps) {
  const { lang, t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  const ratingDescriptions: Record<number, { label: string; text: string; color: string }> = {
    5: { label: t.reviews.star5, text: t.reviews.star5Desc, color: "text-red-400" },
    4: { label: t.reviews.star4, text: t.reviews.star4Desc, color: "text-red-400" },
    3: { label: t.reviews.star3, text: t.reviews.star3Desc, color: "text-amber-400" },
    2: { label: t.reviews.star2, text: t.reviews.star2Desc, color: "text-orange-400" },
    1: { label: t.reviews.star1, text: t.reviews.star1Desc, color: "text-neutral-400" },
  };

  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        setRating(existingReview.rating || 5);
        setTitle(existingReview.title || "");
        setContent(existingReview.content || "");
        setImages(existingReview.imageUrls || []);
      } else {
        setRating(5);
        setTitle("");
        setContent("");
        setImages([]);
      }
      setMessage(null);
      setUploadError(null);
    }
  }, [isOpen, existingReview]);

  if (!isOpen || !product) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 3) {
      setUploadError(lang === "th" ? "สามารถแนบรูปภาพได้สูงสุด 3 รูปเท่านั้น" : "Maximum 3 images allowed");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(lang === "th" ? `ไฟล์ "${file.name}" มีขนาดเกิน 5MB` : `File "${file.name}" exceeds 5MB`);
          continue;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await uploadReviewImageAction(base64, product?.name);
        if (res.success && res.secureUrl) {
          setImages((prev) => [...prev, res.secureUrl]);
        } else {
          setUploadError(res.error || (lang === "th" ? "อัปโหลดรูปภาพไม่สำเร็จ" : "Failed to upload image"));
        }
      }
    } catch {
      setUploadError(lang === "th" ? "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ" : "Error processing image");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 5) {
      setMessage({
        type: "error",
        text: lang === "th" ? "กรุณาระบุความคิดเห็นอย่างน้อย 5 ตัวอักษร" : "Please enter at least 5 characters for your review",
      });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const res = await submitReview({
        reviewId: existingReview?.id,
        productId: product.id,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        imageUrls: images.length > 0 ? images : undefined,
      });

      if (res.success) {
        setMessage({
          type: res.moderationStatus === "rejected" ? "error" : "success",
          text: res.message || t.reviews.successMessage,
        });

        if (res.moderationStatus !== "rejected") {
          setTimeout(() => {
            onReviewSubmitted?.();
            onClose();
          }, 1500);
        }
      } else {
        setMessage({
          type: "error",
          text: res.error || (lang === "th" ? "ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง" : "Failed to submit review. Please try again."),
        });
      }
    });
  };

  const currentDisplayRating = hoverRating || rating;
  const ratingInfo = ratingDescriptions[currentDisplayRating] || ratingDescriptions[5];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-[#121212] border border-[#2D2D2D] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#222222] bg-[#161616] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent-red)]" />
            <h3 className="font-heading text-sm sm:text-base font-bold uppercase tracking-wider text-white">
              {existingReview ? (lang === "th" ? "แก้ไขรีวิวสินค้า" : "Edit Review") : `${t.reviews.modalTitle} (PRODUCT REVIEW)`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Product Banner */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#0D0D0D] border border-white/5">
            {product.imageUrl ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#262626] bg-[#181818] flex-shrink-0">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg border border-[#262626] bg-[#181818] flex items-center justify-center text-[0.65rem] font-mono text-neutral-500 flex-shrink-0">
                AERO
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[0.65rem] font-heading font-bold uppercase text-red-400 tracking-wider">
                SOUTH AERO AERODYNAMICS
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{product.name}</h4>
              <div className="flex items-center gap-1.5 mt-1 text-[0.7rem] text-emerald-400 font-medium">
                <ShieldCheck size={13} />
                <span>{lang === "th" ? "คำสั่งซื้อที่ได้รับการยืนยัน (Verified Purchase)" : "Verified Purchase"}</span>
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {message && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                message.type === "success"
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                  : "bg-red-950/40 border-red-500/50 text-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form id="review-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Interactive Rating Picker */}
            <div className="space-y-2.5">
              <label className="block text-xs font-heading font-bold uppercase text-neutral-300">
                {t.reviews.ratingStarLabel} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                {/* Continuous Hitbox Container with onMouseLeave at container level */}
                <div
                  className="inline-flex items-center p-1 rounded-xl bg-[#0C0C0C] border border-[#222222]"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= currentDisplayRating;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/5 transition-all duration-150 transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
                        aria-label={lang === "th" ? `ให้คะแนน ${star} ดาว` : `Rate ${star} stars`}
                      >
                        <Star
                          size={28}
                          className={
                            isActive
                              ? "text-red-500 fill-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)] transition-colors duration-150"
                              : "text-neutral-700 fill-transparent hover:text-neutral-500 transition-colors duration-150"
                          }
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30">
                  <Star size={13} className="text-red-500 fill-red-500" />
                  <span className="text-xs font-mono font-bold text-white tracking-wider">
                    {currentDisplayRating} / 5
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-semibold ${ratingInfo.color}`}>{ratingInfo.label}</span>
                <span className="text-neutral-500">—</span>
                <span className="text-neutral-400">{ratingInfo.text}</span>
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="block text-xs font-heading font-bold uppercase text-neutral-300 mb-1.5">
                {lang === "th" ? "หัวข้อรีวิว (ไม่บังคับ)" : "Review Headline (Optional)"}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder={t.reviews.reviewTitlePlaceholder}
                className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Review Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-heading font-bold uppercase text-neutral-300">
                  {lang === "th" ? "ความคิดเห็นและประสบการณ์การใช้งาน" : "Review & Experience"} <span className="text-red-500">*</span>
                </label>
                <span className="text-[0.65rem] font-mono text-neutral-500">
                  {content.length}/2000
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                placeholder={t.reviews.reviewContentPlaceholder}
                className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-red-500 rounded-xl p-3.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors leading-relaxed"
              />
            </div>

            {/* Photos Uploader */}
            <div className="space-y-2">
              <label className="block text-xs font-heading font-bold uppercase text-neutral-300">
                {t.reviews.uploadPhotos}
              </label>

              {uploadError && (
                <p className="text-[0.7rem] text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {uploadError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#333333] bg-black group"
                  >
                    <Image
                      src={imgUrl}
                      alt={`Review photo ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {images.length < 3 && (
                  <label className="w-16 h-16 rounded-xl border border-dashed border-[#333333] hover:border-red-500/60 bg-[#0A0A0A] flex flex-col items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
                    {isUploading ? (
                      <Loader2 size={18} className="animate-spin text-red-400" />
                    ) : (
                      <>
                        <UploadCloud size={18} />
                        <span className="text-[0.6rem] font-mono mt-1">+{lang === "th" ? "เพิ่มรูป" : "Photo"}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#222222] bg-[#161616] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-heading uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {lang === "th" ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            type="submit"
            form="review-form"
            disabled={isPending || !content.trim() || content.trim().length < 5}
            className="btn-primary py-2.5 px-6 text-xs font-heading font-bold uppercase tracking-wider gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> {t.reviews.submitting}
              </>
            ) : existingReview ? (
              lang === "th" ? "บันทึกการแก้ไข" : "Update Review"
            ) : (
              t.reviews.submitReview
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
