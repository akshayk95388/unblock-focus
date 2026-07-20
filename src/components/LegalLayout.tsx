import Link from "next/link";

/**
 * Shared layout wrapper for legal pages (Privacy Policy, Terms of Service).
 * Provides the same header and footer as the landing page for consistent UX.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans">
      {/* ===== Header ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-tighter text-primary-container hover:opacity-80 transition-opacity"
          >
            Unblock
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#protocol"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
            >
              How it works
            </Link>
            <Link
              href="/#features"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
            >
              Features
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/focus"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Content ===== */}
      <main className="flex-1 pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors group"
          >
            <svg
              className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to Home
          </Link>
          {children}
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          {/* Top row: Brand + Nav */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-2">
              <Link
                href="/"
                className="text-lg font-bold tracking-tighter text-primary-container hover:opacity-80 transition-opacity"
              >
                Unblock
              </Link>
              <p className="text-xs text-on-surface-variant/50 max-w-xs">
                Break through mental blocks. Get to deep work.
              </p>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link
                href="/#protocol"
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                How it works
              </Link>
              <Link
                href="/#features"
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Features
              </Link>
              <a
                href="mailto:support@unblockfocus.com"
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Contact
              </a>
            </nav>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-outline-variant/20 to-transparent mb-6" />

          {/* Bottom row: Copyright + Legal Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-on-surface-variant/40">
              &copy; {new Date().getFullYear()} Unblock. All rights reserved.
            </span>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy-policy"
                className="text-xs text-on-surface-variant/50 hover:text-on-surface transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/tos"
                className="text-xs text-on-surface-variant/50 hover:text-on-surface transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
