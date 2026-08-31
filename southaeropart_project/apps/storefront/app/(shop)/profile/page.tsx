import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "@/actions/profile.actions";
import { getVehicleSelectorData } from "@/actions/vehicle.actions";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export const metadata: Metadata = {
  title: "My Profile | South Aeropart",
  description:
    "Manage your South Aeropart account, saved garage vehicles, shipping destinations, and privacy preferences.",
};

export default async function ProfilePage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in?redirectUrl=/profile");
  }

  const [profileRes, brandsData] = await Promise.all([
    getUserProfile(),
    getVehicleSelectorData(),
  ]);

  if (!profileRes.success || !profileRes.data) {
    return (
      <div className="container-main py-24 min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 bg-[#141414] border border-[#262626] rounded-lg max-w-md">
          <h2 className="text-xl font-bold font-heading uppercase text-white mb-2">
            Unable to load profile
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {profileRes.error || "An error occurred while loading your profile data."}
          </p>
          <a href="/profile" className="btn-primary text-xs px-6 py-2.5">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  const { user, addresses, vehicles } = profileRes.data;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-24 md:pt-28 pb-20">
      <div className="container-main">
        {/* Main Profile Component with Dynamic Language Sync & Modals */}
        <ProfileTabs
          user={user}
          addresses={addresses}
          vehicles={vehicles}
          brands={brandsData}
        />
      </div>
    </div>
  );
}
