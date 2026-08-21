"use client";

import { useState, useCallback } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { recordLoginAction } from "@/actions/auth-audit.actions";
import { Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleGoogleSignUp = useCallback(async () => {
    if (!isLoaded || !signUp) return;
    setError("");
    setIsGoogleLoading(true);

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(
        clerkError.errors?.[0]?.message ?? "Failed to connect with Google. Please try again."
      );
      setIsGoogleLoading(false);
    }
  }, [isLoaded, signUp]);

  const handleEmailSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !signUp) return;

      setError("");
      setIsEmailLoading(true);

      try {
        await signUp.create({
          firstName,
          lastName,
          emailAddress: email,
          password,
        });

        // Send email verification code
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

        setPendingVerification(true);
      } catch (err: unknown) {
        const clerkError = err as { errors?: { message: string; code: string }[] };
        const errorCode = clerkError.errors?.[0]?.code;

        if (errorCode === "form_identifier_exists") {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (errorCode === "form_password_pwned") {
          setError("This password has been found in a data breach. Please use a different password.");
        } else if (errorCode === "form_password_length_too_short") {
          setError("Password must be at least 8 characters long.");
        } else {
          setError(clerkError.errors?.[0]?.message ?? "Sign up failed. Please try again.");
        }
      } finally {
        setIsEmailLoading(false);
      }
    },
    [isLoaded, signUp, firstName, lastName, email, password]
  );

  const handleVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !signUp) return;

      setError("");
      setIsVerifying(true);

      try {
        const result = await signUp.attemptEmailAddressVerification({
          code: verificationCode,
        });

        if (result.status === "complete" && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });

          // Record login history in Neon.tech
          const userId = (result as { createdUserId?: string })?.createdUserId || signUp.createdUserId || result.createdSessionId;
          await recordLoginAction({
            userId,
            email,
            fullName: [firstName, lastName].filter(Boolean).join(" "),
            loginMethod: "email_password",
          });

          router.push("/");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } catch (err: unknown) {
        const clerkError = err as { errors?: { message: string; code: string }[] };
        const errorCode = clerkError.errors?.[0]?.code;

        if (errorCode === "form_code_incorrect") {
          setError("Invalid verification code. Please check and try again.");
        } else {
          setError(clerkError.errors?.[0]?.message ?? "Verification failed. Please try again.");
        }
      } finally {
        setIsVerifying(false);
      }
    },
    [isLoaded, signUp, setActive, verificationCode, router]
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent-red)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex flex-col items-center group">
          <span className="font-heading text-3xl md:text-4xl font-bold tracking-[0.15em] text-[var(--text-primary)] group-hover:text-[var(--accent-red)] transition-colors">
            SOUTH
          </span>
          <span className="text-[0.55rem] md:text-[0.65rem] font-heading tracking-[0.3em] text-[var(--text-secondary)] -mt-1">
            A E R O
          </span>
        </Link>
        <p className="text-xs font-heading tracking-[0.2em] text-[var(--text-muted)] mt-3 uppercase">
          Not Loud, Just Different
        </p>
      </div>

      {/* Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm overflow-hidden">
        {/* Top accent bar */}
        <div className="h-[2px] bg-gradient-to-r from-[var(--accent-red)] via-[var(--accent-red-hover)] to-[var(--accent-red)]" />

        <div className="p-6 md:p-8">
          {/* ══════════════════════ VERIFICATION STEP ══════════════════════ */}
          {pendingVerification ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false);
                  setVerificationCode("");
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4 group"
              >
                <ArrowLeft
                  size={14}
                  className="transition-transform group-hover:-translate-x-1"
                />
                Back
              </button>

              <div className="text-center mb-6">
                <h1 className="font-heading text-xl md:text-2xl font-bold tracking-wider uppercase">
                  Verify Email
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                  We sent a verification code to
                </p>
                <p className="text-sm text-[var(--text-primary)] font-medium mt-0.5">
                  {email}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 p-3 mb-5 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-sm animate-fade-in"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-[var(--error)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--error)]">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerification} className="space-y-4">
                <div>
                  <label
                    htmlFor="verification-code"
                    className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                  >
                    Verification Code
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    className="input-dark rounded-sm text-center text-lg tracking-[0.3em] font-heading"
                  />
                </div>

                <button
                  id="verify-submit"
                  type="submit"
                  disabled={isVerifying || verificationCode.length < 6}
                  className="btn-primary w-full rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              </form>

              <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={async () => {
                    if (!signUp) return;
                    try {
                      await signUp.prepareEmailAddressVerification({
                        strategy: "email_code",
                      });
                      setError("");
                    } catch {
                      setError("Failed to resend code. Please try again.");
                    }
                  }}
                  className="text-[var(--accent-red)] hover:text-[var(--accent-red-hover)] transition-colors"
                >
                  Resend
                </button>
              </p>
            </>
          ) : (
            /* ══════════════════════ SIGN UP FORM ══════════════════════ */
            <>
              <div className="text-center mb-6">
                <h1 className="font-heading text-xl md:text-2xl font-bold tracking-wider uppercase">
                  Create Account
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                  Join the South Aero community
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 p-3 mb-5 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-sm animate-fade-in"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-[var(--error)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--error)]">{error}</p>
                </div>
              )}

              {/* Google OAuth */}
              <GoogleButton
                onClick={handleGoogleSignUp}
                isLoading={isGoogleLoading}
                label="Sign up with Google"
              />

              {/* Divider */}
              <div className="my-5">
                <AuthDivider />
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="sign-up-first-name"
                      className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                    >
                      First Name
                    </label>
                    <input
                      id="sign-up-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                      autoComplete="given-name"
                      className="input-dark rounded-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sign-up-last-name"
                      className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                    >
                      Last Name
                    </label>
                    <input
                      id="sign-up-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                      autoComplete="family-name"
                      className="input-dark rounded-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="sign-up-email"
                    className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="sign-up-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    className="input-dark rounded-sm"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="sign-up-password"
                    className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="sign-up-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="input-dark rounded-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="sign-up-submit"
                  type="submit"
                  disabled={
                    isEmailLoading ||
                    !firstName ||
                    !lastName ||
                    !email ||
                    !password
                  }
                  className="btn-primary w-full rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none mt-2"
                >
                  {isEmailLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Terms */}
              <p className="text-[0.65rem] text-[var(--text-muted)] text-center mt-4 leading-relaxed">
                By creating an account, you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors"
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors"
                >
                  Privacy Policy
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Bottom link */}
        {!pendingVerification && (
          <div className="px-6 md:px-8 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-[var(--accent-red)] hover:text-[var(--accent-red-hover)] font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[var(--text-muted)]"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-[0.65rem] text-[var(--text-muted)] tracking-wider uppercase font-heading">
          Secure Registration with Clerk
        </span>
      </div>
    </div>
  );
}
