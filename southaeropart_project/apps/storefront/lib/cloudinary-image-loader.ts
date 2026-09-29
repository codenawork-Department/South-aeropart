import type { ImageLoader } from "next/image";

/** Only rewrite unsigned, versioned originals emitted by Cloudinary uploads.
 * Signed URLs, existing transformations and other hosts keep Next's loader.
 * This module is client-safe: it does not import the Cloudinary server SDK.
 */
export function getCloudinaryImageLoader(src: string): ImageLoader | undefined {
  const match = src.match(
    /^(https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/)(v\d+\/[^?#]+)$/,
  );
  if (!match || /\.svg$/i.test(match[2])) return undefined;

  const [, base, asset] = match;
  return ({ width, quality }) =>
    `${base}c_limit,w_${width},q_${quality ?? 75},f_auto/${asset}`;
}
