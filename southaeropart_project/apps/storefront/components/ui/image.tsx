"use client";

import NextImage, { type ImageProps } from "next/image";
import { forwardRef } from "react";
import { getCloudinaryImageLoader } from "@/lib/cloudinary-image-loader";

// Keep Next Image's responsive sizing, lazy loading and layout, but let
// Cloudinary deliver resized originals without the local optimizer's timeout.
const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { loader, ...props },
  ref,
) {
  const cloudinaryLoader =
    !props.unoptimized && typeof props.src === "string"
      ? getCloudinaryImageLoader(props.src)
      : undefined;

  return <NextImage {...props} loader={loader ?? cloudinaryLoader} ref={ref} />;
});

export default Image;
