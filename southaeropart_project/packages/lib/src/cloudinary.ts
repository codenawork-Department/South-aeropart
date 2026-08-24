import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadImageOptions {
  folder?: string;
  tags?: string[];
  publicId?: string;
  moderation?: boolean;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Upload single image to Cloudinary (from base64 data URL or remote URL)
 */
export async function uploadImage(
  fileDataUrl: string,
  options: UploadImageOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder = "south-aero/general", tags = [], publicId, moderation = false } = options;

  const uploadOptions: Record<string, unknown> = {
    folder,
    tags,
    resource_type: "image",
  };

  if (publicId) {
    uploadOptions.public_id = publicId;
  }

  if (moderation) {
    uploadOptions.moderation = "aws_rek";
  }

  const result: UploadApiResponse = await cloudinary.uploader.upload(fileDataUrl, uploadOptions);

  if (moderation && Array.isArray(result.moderation)) {
    const mod = result.moderation[0] as { status?: string } | string | undefined;
    const status = typeof mod === "object" && mod !== null ? mod.status : mod;
    if (status === "rejected") {
      await cloudinary.uploader.destroy(result.public_id);
      throw new Error("IMAGE_MODERATION_REJECTED");
    }
  }

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * Compatibility helper for upload with strict AI moderation
 */
export async function uploadModeratedImage(fileDataUrl: string, folder: string) {
  return uploadImage(fileDataUrl, { folder, moderation: true });
}

/**
 * Upload multiple images concurrently
 */
export async function uploadMultipleImages(
  files: Array<{ data: string; folder?: string; tags?: string[] }>
): Promise<CloudinaryUploadResult[]> {
  const uploadPromises = files.map((file) =>
    uploadImage(file.data, {
      folder: file.folder || "south-aero/products",
      tags: file.tags || ["product"],
    })
  );

  return Promise.all(uploadPromises);
}

/**
 * Delete a single image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === "ok";
  } catch (error) {
    console.error(`[Cloudinary] Failed to delete image ${publicId}:`, error);
    return false;
  }
}

/**
 * Delete multiple images from Cloudinary concurrently
 */
export async function deleteMultipleImages(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;
  await Promise.allSettled(publicIds.map((id) => deleteImage(id)));
}

/**
 * Rename/move an asset on Cloudinary to a new public_id / folder path
 */
export async function renameImage(
  fromPublicId: string,
  toPublicId: string
): Promise<{ publicId: string; secureUrl: string } | null> {
  try {
    if (fromPublicId === toPublicId) return null;
    const result = await cloudinary.uploader.rename(fromPublicId, toPublicId, {
      overwrite: true,
      resource_type: "image",
      invalidate: true,
    });
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    console.error(`[Cloudinary] Failed to rename/move ${fromPublicId} to ${toPublicId}:`, error);
    return null;
  }
}

/**
 * Helper to build an optimized Cloudinary delivery URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  }
): string {
  const { width, height, crop = "fill", quality = "auto", format = "auto" } = options || {};

  const transformations: string[] = [`f_${format}`, `q_${quality}`];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push(`c_${crop}`);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const transformPath = transformations.join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformPath}/${publicId}`;
}

export { cloudinary };
