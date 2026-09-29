import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Image from "./image";
import { getCloudinaryImageLoader } from "@/lib/cloudinary-image-loader";

const original =
  "https://res.cloudinary.com/eorcwggk/image/upload/v1787858514/south-aero/products/bmw/m2-g87/roof-spoiler/test04/gq4n7eq9ubwv3uurd67n.png";

afterEach(cleanup);

describe("Storefront image delivery", () => {
  it("requests responsive Cloudinary images directly instead of the local optimizer", () => {
    render(<Image src={original} alt="Roof spoiler" fill sizes="50vw" />);
    const img = screen.getByAltText("Roof spoiler");
    const candidates = img.getAttribute("srcset")!.split(/, /);
    expect(candidates.length).toBeGreaterThan(1);
    for (const candidate of candidates) {
      const [url, width] = candidate.split(" ");
      expect(url).toBe(original.replace("/upload/", `/upload/c_limit,w_${parseInt(width)},q_75,f_auto/`));
      expect(url).not.toContain("/_next/image");
    }
    expect(img).toHaveAttribute("sizes", "50vw");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("honors quality and forwards the image ref", () => {
    const ref = createRef<HTMLImageElement>();
    render(<Image ref={ref} src={original} alt="Spoiler" width={375} height={300} quality={85} />);
    expect(ref.current).toBe(screen.getByAltText("Spoiler"));
    expect(ref.current?.src).toContain("w_750,q_85,f_auto/");
  });

  it("keeps local assets on the Next optimizer", () => {
    render(<Image src="/images/FRONT.png" alt="Local" width={375} height={300} />);
    expect(screen.getByAltText("Local").getAttribute("src")).toBe("/_next/image?url=%2Fimages%2FFRONT.png&w=750&q=75");
  });

  it("keeps explicit unoptimized delivery, including data URLs", () => {
    const { rerender } = render(<Image src={original} unoptimized alt="Original" width={375} height={300} />);
    expect(screen.getByAltText("Original")).toHaveAttribute("src", original);
    expect(screen.getByAltText("Original")).not.toHaveAttribute("srcset");
    const dataUrl = "data:image/png;base64,aGVsbG8=";
    rerender(<Image src={dataUrl} alt="Original" width={375} height={300} />);
    expect(screen.getByAltText("Original")).toHaveAttribute("src", dataUrl);
  });

  it("honors an explicit loader", () => {
    render(<Image src={original} alt="Custom" width={375} height={300} loader={({ width }) => `/custom?w=${width}`} />);
    expect(screen.getByAltText("Custom")).toHaveAttribute("src", "/custom?w=750");
  });

  it("switches delivery correctly when the source changes", () => {
    const { rerender } = render(<Image src={original} alt="Changing" width={375} height={300} />);
    rerender(<Image src="/images/FRONT.png" alt="Changing" width={375} height={300} />);
    expect(screen.getByAltText("Changing").getAttribute("src")).toContain("/_next/image?");
  });

  it.each([
    "/images/FRONT.png",
    "https://img.clerk.com/avatar.png",
    original.replace("res.cloudinary.com", "res.cloudinary.com.example.com"),
    original.replace("https://", "http://"),
    original.replace("/upload/", "/upload/s--signature--/"),
    original.replace("/upload/", "/upload/c_crop,w_100/"),
    original.replace("/image/upload/", "/image/authenticated/"),
    `${original}?__cld_token__=signed`,
    original.replace(".png", ".svg"),
  ])("leaves unsupported or signed sources to the existing loader: %s", (src) => {
    expect(getCloudinaryImageLoader(src)).toBeUndefined();
  });
});
