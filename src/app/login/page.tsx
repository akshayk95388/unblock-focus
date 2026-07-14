"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, resetPassword } from "./actions";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "forgot";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError === "auth_callback_failed") {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Build redirect URL from search params
    const redirectParam = searchParams.get("redirect");
    const planParam = searchParams.get("plan");
    let redirectTo = "/focus";
    if (redirectParam === "checkout" && planParam) {
      redirectTo = `/api/checkout?plan=${planParam}`;
    }
    formData.set("redirectTo", redirectTo);

    try {
      let result;
      if (mode === "login") {
        result = await signIn(formData);
      } else if (mode === "signup") {
        result = await signUp(formData);
      } else {
        result = await resetPassword(formData);
      }

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
      }
    } catch {
      // signIn redirects on success, which throws a NEXT_REDIRECT
      // This is expected behavior
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const supabase = createClient();

    // Preserve checkout redirect through OAuth callback
    const redirectParam = searchParams.get("redirect");
    const planParam = searchParams.get("plan");
    let callbackUrl = `${window.location.origin}/auth/callback`;
    if (redirectParam === "checkout" && planParam) {
      callbackUrl += `?next=${encodeURIComponent(`/api/checkout?plan=${planParam}`)}`;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccess(null);
    setMode(newMode);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <Link
        href="/"
        className="mb-8 text-2xl font-bold tracking-tighter text-primary-container hover:opacity-80 transition-opacity z-10"
      >
        Unblock
      </Link>

      {/* Header — outside the card */}
      <div className="text-center mb-6 z-10">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          {mode === "login" && "Welcome back"}
          {mode === "signup" && "Create an account"}
          {mode === "forgot" && "Reset password"}
        </h1>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm z-10">
        <div className="bg-surface-container-low/60 backdrop-blur-xl border border-outline-variant/10 rounded-2xl p-8 space-y-5">

          {/* Error / Success messages */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-xl bg-tertiary/10 border border-tertiary/20 text-tertiary text-sm">
              {success}
            </div>
          )}

          {/* Email/Password Form — primary action */}
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full bg-surface-container-highest/60 border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    className="w-full bg-surface-container-highest/60 border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder={mode === "signup" ? "Min 6 characters" : "••••••••"}
                  />
                  {mode === "signup" && (
                    <p className="text-[11px] text-on-surface-variant/50 mt-1.5">Minimum 6 characters</p>
                  )}
                </div>
              )}
            </div>

            {/* Forgot password link (login mode only) */}
            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-[11px] font-medium text-primary/80 hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full glow-button px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "login" ? "Signing in..." : mode === "signup" ? "Creating account..." : "Sending link..."}
                </span>
              ) : (
                <>
                  {mode === "login" && "Sign in"}
                  {mode === "signup" && "Create account"}
                  {mode === "forgot" && "Send reset link"}
                </>
              )}
            </button>
          </form>

          {/* Google OAuth — below the form */}
          {mode !== "forgot" && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-outline-variant/20" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                  or
                </span>
                <div className="flex-1 h-px bg-outline-variant/20" />
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-surface-container-highest/60 hover:bg-surface-container-highest border border-outline-variant/10 text-on-surface text-sm font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Mode switchers */}
          <div className="text-center pt-1">
            {mode === "login" && (
              <p className="text-sm text-on-surface-variant">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  className="text-primary font-medium hover:text-primary-container transition-colors"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-sm text-on-surface-variant">
                Already have an account?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="text-primary font-medium hover:text-primary-container transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p className="text-sm text-on-surface-variant">
                Remember your password?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="text-primary font-medium hover:text-primary-container transition-colors"
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-on-surface-variant/40 mt-6">
          By continuing, you agree to Unblock&apos;s Terms of Service.
        </p>
      </div>
    </div>
  );
}
