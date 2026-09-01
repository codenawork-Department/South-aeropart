import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getWishlist } from "@/actions/wishlist.actions";
import { WishlistClient } from "@/components/wishlist/WishlistClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Wishlist | South Aeropart",
  description:
    "View and manage your saved aerodynamic components, custom wings, splitters, and full vehicle kits.",
};

export default async function WishlistPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in?redirectUrl=/wishlist");
  }

  const res = await getWishlist();
  const items = res.success && res.items ? res.items : [];

  return <WishlistClient initialItems={items} />;
}
