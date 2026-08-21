"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { recordLoginAction } from "@/actions/auth-audit.actions";

/**
 * Client-side session tracker that ensures every authenticated session
 * is audited and stored into Neon.tech PostgreSQL.
 *
 * Runs seamlessly in the background (no UI) once per browser session.
 */
export function AuthSessionTracker() {
  const { isLoaded, isSignedIn, user } = useUser();
  const recordedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Prevent duplicate logs within the same tab session
    const storageKey = `sa_audit_session_${user.id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey)) {
      return;
    }

    if (recordedUserRef.current === user.id) return;
    recordedUserRef.current = user.id;

    const email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      null;
    const fullName =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      null;
    const avatarUrl = user.imageUrl || null;
    const isOAuth = (user.externalAccounts && user.externalAccounts.length > 0);
    const loginMethod = isOAuth ? "google" : "email_password";

    recordLoginAction({
      userId: user.id,
      email,
      fullName,
      avatarUrl,
      loginMethod,
      metadata: {
        lastSignInAt: user.lastSignInAt
          ? new Date(user.lastSignInAt).toISOString()
          : new Date().toISOString(),
        clientOrigin: typeof window !== "undefined" ? window.location.origin : null,
      },
    }).then((res) => {
      if (res.success && typeof window !== "undefined") {
        window.sessionStorage.setItem(storageKey, "true");
      }
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
