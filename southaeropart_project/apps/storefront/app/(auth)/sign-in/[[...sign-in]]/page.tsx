"use client";

import { useState, useCallback } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { recordLoginAction } from "@/actions/auth-audit.actions";
import { Eye, EyeOff, AlertCircle, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  // Sign-in Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Verification (OTP / 2FA) State
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationType, setVerificationType] = useState<"first_factor" | "second_factor">("second_factor");
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<string>("email_code");

  const handleGoogleSignIn = useCallback(async () => {
    if (!isLoaded || !signIn) return;
    setError("");
    setResendSuccess(false);
    setIsGoogleLoading(true);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(
        clerkError.errors?.[0]?.message ?? "Failed to connect with Google. Please try again."
      );
      setIsGoogleLoading(false);
    }
  }, [isLoaded, signIn]);

  const handleEmailSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !signIn) return;

      setError("");
      setResendSuccess(false);
      setIsEmailLoading(true);

      try {
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status === "complete" && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });

          // Record login history in Neon.tech
          const userId = (result as { userData?: { id?: string } })?.userData?.id || result.createdSessionId;
          await recordLoginAction({
            userId,
            email,
            loginMethod: "email_password",
          });

          router.push("/");
        } else if (result.status === "needs_second_factor") {
          const supportedFactors = (result.supportedSecondFactors || []) as Array<{
            strategy: string;
            phoneNumberId?: string;
            emailAddressId?: string;
            safeIdentifier?: string;
          }>;

          const emailFactor = supportedFactors.find((f) => f.strategy === "email_code");
          const phoneFactor = supportedFactors.find((f) => f.strategy === "phone_code");
          const totpFactor = supportedFactors.find((f) => f.strategy === "totp");
          const backupFactor = supportedFactors.find((f) => f.strategy === "backup_code");

          setVerificationType("second_factor");

          if (emailFactor) {
            setSecondFactorStrategy("email_code");
            try {
              await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string }) => Promise<unknown> }).prepareSecondFactor({
                strategy: "email_code",
              });
            } catch (err) {
              console.log("[SignIn] prepareSecondFactor email_code:", err);
            }
            setPendingVerification(true);
          } else if (phoneFactor) {
            setSecondFactorStrategy("phone_code");
            try {
              if (phoneFactor.phoneNumberId) {
                await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string; phoneNumberId?: string }) => Promise<unknown> }).prepareSecondFactor({
                  strategy: "phone_code",
                  phoneNumberId: phoneFactor.phoneNumberId,
                });
              } else {
                await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string }) => Promise<unknown> }).prepareSecondFactor({
                  strategy: "phone_code",
                });
              }
            } catch (err) {
              console.log("[SignIn] prepareSecondFactor phone_code:", err);
            }
            setPendingVerification(true);
          } else if (totpFactor) {
            setSecondFactorStrategy("totp");
            setPendingVerification(true);
          } else if (backupFactor) {
            setSecondFactorStrategy("backup_code");
            setPendingVerification(true);
          } else if (supportedFactors.length > 0) {
            const fallbackStrategy = supportedFactors[0].strategy;
            setSecondFactorStrategy(fallbackStrategy);
            try {
              await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string }) => Promise<unknown> }).prepareSecondFactor({
                strategy: fallbackStrategy,
              });
            } catch {
              // ignore
            }
            setPendingVerification(true);
          } else {
            // Default fallback to email_code
            try {
              await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string }) => Promise<unknown> }).prepareSecondFactor({
                strategy: "email_code",
              });
            } catch {
              // ignore
            }
            setSecondFactorStrategy("email_code");
            setPendingVerification(true);
          }
        } else if (result.status === "needs_first_factor") {
          const supportedFactors = (result.supportedFirstFactors || []) as Array<{
            strategy: string;
            emailAddressId?: string;
            phoneNumberId?: string;
          }>;

          const emailFactor = supportedFactors.find(
            (f) => f.strategy === "email_code"
          );
          const phoneFactor = supportedFactors.find(
            (f) => f.strategy === "phone_code"
          );

          setVerificationType("first_factor");

          if (emailFactor?.emailAddressId) {
            try {
              await signIn.prepareFirstFactor({
                strategy: "email_code",
                emailAddressId: emailFactor.emailAddressId,
              });
            } catch (err) {
              console.log("[SignIn] prepareFirstFactor email_code:", err);
            }
            setPendingVerification(true);
          } else if (phoneFactor?.phoneNumberId) {
            try {
              await (signIn as unknown as { prepareFirstFactor: (params: { strategy: string; phoneNumberId?: string }) => Promise<unknown> }).prepareFirstFactor({
                strategy: "phone_code",
                phoneNumberId: phoneFactor.phoneNumberId,
              });
            } catch (err) {
              console.log("[SignIn] prepareFirstFactor phone_code:", err);
            }
            setPendingVerification(true);
          } else if (supportedFactors.length > 0) {
            setPendingVerification(true);
          } else {
            setError("Email verification required. Please check your inbox.");
          }
        } else {
          setError("Additional verification required. Please check your email.");
        }
      } catch (err: unknown) {
        const clerkError = err as { errors?: { message: string; code: string }[] };
        const errorCode = clerkError.errors?.[0]?.code;

        if (errorCode === "form_identifier_not_found") {
          setError("No account found with this email address.");
        } else if (errorCode === "form_password_incorrect") {
          setError("Incorrect password. Please try again.");
        } else if (errorCode === "strategy_for_user_invalid") {
          setError("This account uses Google sign-in. Please use the Google button above.");
        } else {
          setError(clerkError.errors?.[0]?.message ?? "Sign in failed. Please try again.");
        }
      } finally {
        setIsEmailLoading(false);
      }
    },
    [isLoaded, signIn, setActive, email, password, router]
  );

  const handleVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !signIn) return;

      setError("");
      setResendSuccess(false);
      setIsVerifying(true);

      try {
        let result;
        if (verificationType === "second_factor") {
          result = await (signIn as unknown as {
            attemptSecondFactor: (params: { strategy: string; code: string }) => Promise<{
              status: string;
              createdSessionId?: string;
              userData?: { id?: string };
            }>;
          }).attemptSecondFactor({
            strategy: secondFactorStrategy,
            code: verificationCode.trim(),
          });
        } else {
          result = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: verificationCode.trim(),
          });
        }

        if (result.status === "complete" && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });

          // Record login history in Neon.tech
          const userId =
            (result as { userData?: { id?: string } })?.userData?.id ||
            result.createdSessionId;
          await recordLoginAction({
            userId,
            email,
            loginMethod: "email_password",
          });

          router.push("/");
        } else {
          setError("Verification incomplete. Please check the code and try again.");
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
    [isLoaded, signIn, setActive, verificationType, secondFactorStrategy, verificationCode, email, router]
  );

  const handleResendCode = useCallback(async () => {
    if (!isLoaded || !signIn) return;
    setError("");
    setResendSuccess(false);
    setIsResending(true);

    try {
      if (verificationType === "first_factor") {
        const emailFactor = (signIn.supportedFirstFactors as Array<{ strategy: string; emailAddressId?: string }>)?.find(
          (factor) => factor.strategy === "email_code"
        );

        if (emailFactor?.emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
        }
      } else if (verificationType === "second_factor") {
        if (secondFactorStrategy === "email_code") {
          await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string }) => Promise<unknown> }).prepareSecondFactor({
            strategy: "email_code",
          });
        } else if (secondFactorStrategy === "phone_code") {
          const phoneFactor = (signIn.supportedSecondFactors as Array<{ strategy: string; phoneNumberId?: string }>)?.find(
            (factor) => factor.strategy === "phone_code"
          );

          if (phoneFactor?.phoneNumberId) {
            await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string; phoneNumberId?: string }) => Promise<unknown> }).prepareSecondFactor({
              strategy: "phone_code",
              phoneNumberId: phoneFactor.phoneNumberId,
            });
          } else {
            await (signIn as unknown as { prepareSecondFactor: (params: { strategy: string }) => Promise<unknown> }).prepareSecondFactor({
              strategy: "phone_code",
            });
          }
        }
      }
      setResendSuccess(true);
    } catch {
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setIsResending(false);
    }
  }, [isLoaded, signIn, verificationType, secondFactorStrategy]);

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
          {/* ══════════════════════ VERIFICATION STEP (2FA / OTP) ══════════════════════ */}
          {pendingVerification ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false);
                  setVerificationCode("");
                  setError("");
                  setResendSuccess(false);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4 group"
              >
                <ArrowLeft
                  size={14}
                  className="transition-transform group-hover:-translate-x-1"
                />
                Back to sign in
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] mb-3">
                  <ShieldCheck size={24} />
                </div>
                <h1 className="font-heading text-xl md:text-2xl font-bold tracking-wider uppercase">
                  {secondFactorStrategy === "totp"
                    ? "Authenticator Code"
                    : secondFactorStrategy === "phone_code"
                    ? "SMS Verification"
                    : secondFactorStrategy === "backup_code"
                    ? "Backup Code"
                    : "Security Verification"}
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                  {secondFactorStrategy === "totp"
                    ? "Enter the 6-digit code from your authenticator app"
                    : secondFactorStrategy === "phone_code"
                    ? "We sent a verification code to your registered phone number"
                    : secondFactorStrategy === "backup_code"
                    ? "Enter your backup recovery code"
                    : "We sent a 6-digit verification code to"}
                </p>
                {secondFactorStrategy !== "totp" && secondFactorStrategy !== "phone_code" && secondFactorStrategy !== "backup_code" && (
                  <p className="text-sm text-[var(--text-primary)] font-medium mt-0.5 break-all">
                    {email}
                  </p>
                )}
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

              {/* Success */}
              {resendSuccess && (
                <div
                  className="flex items-start gap-2.5 p-3 mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm animate-fade-in"
                  role="status"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-400">A new verification code has been sent.</p>
                </div>
              )}

              <form onSubmit={handleVerification} className="space-y-4">
                <div>
                  <label
                    htmlFor="signin-verification-code"
                    className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                  >
                    Verification Code
                  </label>
                  <input
                    id="signin-verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder={secondFactorStrategy === "backup_code" ? "Enter backup code" : "Enter 6-digit code"}
                    required
                    autoComplete="one-time-code"
                    maxLength={secondFactorStrategy === "backup_code" ? 16 : 8}
                    autoFocus
                    className="input-dark rounded-sm text-center text-lg tracking-[0.3em] font-heading uppercase"
                  />
                </div>

                <button
                  id="signin-verify-submit"
                  type="submit"
                  disabled={isVerifying || verificationCode.trim().length < 6}
                  className="btn-primary w-full rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>
              </form>

              {secondFactorStrategy !== "totp" && secondFactorStrategy !== "backup_code" && (
                <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                  Didn&apos;t receive the code?{" "}
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResendCode}
                    className="text-[var(--accent-red)] hover:text-[var(--accent-red-hover)] transition-colors disabled:opacity-50"
                  >
                    {isResending ? "Sending..." : "Resend"}
                  </button>
                </p>
              )}
            </>
          ) : (
            /* ══════════════════════ SIGN IN FORM ══════════════════════ */
            <>
              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="font-heading text-xl md:text-2xl font-bold tracking-wider uppercase">
                  Welcome Back
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                  Sign in to your account
                </p>
              </div>

              {/* Error message */}
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
                onClick={handleGoogleSignIn}
                isLoading={isGoogleLoading}
              />

              {/* Divider */}
              <div className="my-5">
                <AuthDivider />
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="sign-in-email"
                    className="block text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="sign-in-email"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="sign-in-password"
                      className="text-xs font-heading tracking-wider uppercase text-[var(--text-secondary)]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[0.7rem] text-[var(--accent-red)] hover:text-[var(--accent-red-hover)] transition-colors"
                      onClick={() => {
                        // TODO: Implement forgot password flow
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="sign-in-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="input-dark rounded-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="sign-in-submit"
                  type="submit"
                  disabled={isEmailLoading || !email || !password}
                  className="btn-primary w-full rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none mt-2"
                >
                  {isEmailLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Bottom link */}
        <div className="px-6 md:px-8 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-[var(--accent-red)] hover:text-[var(--accent-red-hover)] font-semibold transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
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
          Secure Login with Clerk
        </span>
      </div>
    </div>
  );
}
