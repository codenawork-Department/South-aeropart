"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  UploadCloud,
  X,
  Star,
  Image as ImageIcon,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export interface ImageUploadItem {
  id?: string;
  data?: string; // Base64 data URL for preview and upload
  publicId?: string; // Existing Cloudinary public_id
  secureUrl?: string; // Existing or preview URL
  position: number;
  isPrimary: boolean;
  isDeleted?: boolean;
}

interface ImageUploaderProps {
  images: ImageUploadItem[];
  onChange: (images: ImageUploadItem[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploader({
  images,
  onChange,
  maxImages = 20,
  disabled = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImages = images.filter((img) => !img.isDeleted);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const files = Array.from(fileList);

      if (activeImages.length + files.length > maxImages) {
        setErrorMessage(`สามารถอัปโหลดรูปภาพได้สูงสุด ${maxImages} รูปเท่านั้น`);
        return;
      }

      const validFiles: File[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setErrorMessage(`ไฟล์ "${file.name}" ไม่ใช่รูปภาพ`);
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setErrorMessage(`ไฟล์ "${file.name}" มีขนาดเกิน 10MB`);
          return;
        }
        validFiles.push(file);
      }

      // Convert to Base64 data URLs
      const readPromises = validFiles.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      try {
        const base64List = await Promise.all(readPromises);
        const newItems: ImageUploadItem[] = base64List.map((dataUrl, idx) => ({
          data: dataUrl,
          secureUrl: dataUrl,
          position: activeImages.length + idx,
          isPrimary: activeImages.length === 0 && idx === 0,
        }));

        onChange([...images, ...newItems]);
      } catch (err) {
        console.error("Failed to read files:", err);
        setErrorMessage("เกิดข้อผิดพลาดในการโหลดรูปภาพ");
      }
    },
    [activeImages.length, images, maxImages, onChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const setPrimaryImage = (indexToSet: number) => {
    if (disabled) return;
    const updated = activeImages.map((img, idx) => ({
      ...img,
      isPrimary: idx === indexToSet,
    }));

    // Merge back with soft-deleted images
    const deletedImages = images.filter((img) => img.isDeleted);
    onChange([...updated, ...deletedImages]);
  };

  const removeImage = (indexToRemove: number) => {
    if (disabled) return;
    const targetImage = activeImages[indexToRemove];
    let newImages: ImageUploadItem[];

    if (targetImage.id || targetImage.publicId) {
      // Existing image on Cloudinary -> mark as isDeleted
      newImages = images.map((img) =>
        img === targetImage ? { ...img, isDeleted: true } : img
      );
    } else {
      // Newly added local image -> completely remove
      newImages = images.filter((img) => img !== targetImage);
    }

    // Re-index remaining active images & ensure a primary image exists
    const remainingActive = newImages.filter((img) => !img.isDeleted);
    if (remainingActive.length > 0 && !remainingActive.some((img) => img.isPrimary)) {
      remainingActive[0].isPrimary = true;
    }

    const reIndexed = newImages.map((img) => {
      if (img.isDeleted) return img;
      const activeIdx = remainingActive.indexOf(img);
      return {
        ...img,
        position: activeIdx,
        isPrimary: activeIdx === 0 && !remainingActive.some((r) => r.isPrimary),
      };
    });

    onChange(reIndexed);
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    if (disabled) return;
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeImages.length) return;

    const list = [...activeImages];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const reIndexed = list.map((item, idx) => ({
      ...item,
      position: idx,
    }));

    const deletedImages = images.filter((img) => img.isDeleted);
    onChange([...reIndexed, ...deletedImages]);
  };

  return (
    <div className="space-y-4">
      {/* Top Header info */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold text-gray-200 block">
            รูปภาพสินค้า (Product Images)
          </label>
          <span className="text-xs text-gray-400">
            อัปโหลดรูปภาพสินค้าขึ้น Cloudinary (รองรับ JPG, PNG, WEBP, AVIF ไม่เกิน 10MB ต่อไฟล์)
          </span>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded-md bg-[#1C1C1C] border border-[#2D2D2D] text-gray-300">
          <span className={activeImages.length >= maxImages ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
            {activeImages.length}
          </span>
          /{maxImages} รูป
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {activeImages.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? "border-red-500 bg-red-950/20 shadow-lg shadow-red-950/40"
              : "border-[#2E2E2E] bg-[#121212]/80 hover:bg-[#181818] hover:border-[#404040]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#333333] flex items-center justify-center text-red-500 shadow-inner">
              <UploadCloud size={24} />
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-200">
                ลากและวางรูปภาพที่นี่ หรือ <span className="text-red-400 underline">เลือกไฟล์</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                รูปแรกจะถูกตั้งเป็นรูปหน้าปกอัตโนมัติ (สามารถเปลี่ยนได้)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Grid */}
      {activeImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {activeImages.map((img, idx) => {
            const url = img.secureUrl || img.data || "";
            return (
              <div
                key={img.id || img.publicId || idx}
                className={`group relative aspect-square rounded-xl overflow-hidden bg-[#161616] border transition-all shadow-md ${
                  img.isPrimary
                    ? "border-red-500/80 ring-2 ring-red-500/30"
                    : "border-[#262626] hover:border-[#3E3E3E]"
                }`}
              >
                {/* Image */}
                {url ? (
                  <Image
                    src={url}
                    alt={`Product preview ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized={url.startsWith("data:")}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ImageIcon size={28} />
                  </div>
                )}

                {/* Primary Tag */}
                {img.isPrimary && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold shadow-md backdrop-blur-xs">
                    <Star size={10} className="fill-white" />
                    <span>รูปหลัก</span>
                  </div>
                )}

                {/* Order Index */}
                <div className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/70 text-gray-300 text-[10px] font-mono backdrop-blur-xs">
                  #{idx + 1}
                </div>

                {/* Overlay actions on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  {/* Top action: delete & set primary */}
                  <div className="flex items-center justify-between">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryImage(idx);
                        }}
                        className="p-1 rounded bg-[#242424]/90 hover:bg-red-600 text-gray-300 hover:text-white transition-colors shadow"
                        title="ตั้งเป็นรูปหลัก"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="p-1 rounded bg-red-600/90 hover:bg-red-500 text-white transition-colors shadow"
                      title="ลบรูปภาพ"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Bottom action: re-order buttons */}
                  <div className="flex items-center justify-center gap-2">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImage(idx, "left");
                        }}
                        className="p-1 rounded bg-[#242424]/90 hover:bg-gray-700 text-gray-300 transition-colors shadow"
                        title="ย้ายไปซ้าย"
                      >
                        <ArrowLeft size={13} />
                      </button>
                    )}
                    {idx < activeImages.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImage(idx, "right");
                        }}
                        className="p-1 rounded bg-[#242424]/90 hover:bg-gray-700 text-gray-300 transition-colors shadow"
                        title="ย้ายไปขวา"
                      >
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
