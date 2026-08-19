import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadModeratedImage(fileDataUrl: string, folder: string) {
  const result = await cloudinary.uploader.upload(fileDataUrl, {
    folder,
    moderation: "aws_rek",
    resource_type: "image",
  });

  if (result.moderation?.[0]?.status === "rejected") {
    await cloudinary.uploader.destroy(result.public_id);
    throw new Error("IMAGE_MODERATION_REJECTED");
  }

  return { publicId: result.public_id as string, secureUrl: result.secure_url as string };
}

export async function deleteImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
