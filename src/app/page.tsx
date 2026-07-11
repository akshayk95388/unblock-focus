"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== Header ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tighter text-primary-container">
            Unblock
          </span>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#protocol"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
            >
              How it works
            </a>
            <a
              href="#features"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
            >
              Features
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/focus"
              className="glow-button px-5 py-2 rounded-xl text-sm font-bold"
            >
              Start Guided Session
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <main className="flex-1">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.05] mb-6">
                Break the loop.
                <br />
                <span className="text-primary-container">Get to work.</span>
              </h1>

              <p className="text-on-surface-variant text-lg md:text-xl max-w-lg leading-relaxed mb-10">
                Can&apos;t start? Tell us what&apos;s blocking you. We&apos;ll
                build a personalized guided session to clear your head — then
                get you into deep work.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/focus"
                  className="glow-button px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center shrink-0"
                >
                  Start Guided Session
                </Link>
                <a
                  href="#protocol"
                  className="px-8 py-4 rounded-xl text-base font-medium text-on-surface ghost-border hover:bg-surface-container-low transition-all duration-300 text-center"
                >
                  How it works
                </a>
              </div>

              {/* Built for badges */}
              <div className="flex flex-wrap gap-3">
                {["Founders", "Engineers", "Students"].map((who) => (
                  <span
                    key={who}
                    className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant px-3 py-1 rounded-full bg-surface-container-low ghost-border"
                  >
                    {who}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Session Preview Card */}
            <div className="hidden lg:block">
              <div className="bg-surface-container-low rounded-3xl p-8 ghost-border relative overflow-hidden">
                {/* Dots */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-3 h-3 rounded-full bg-primary-container" />
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="w-3 h-3 rounded-full bg-tertiary" />
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                    Guided Session
                  </span>
                </div>

                {/* Flow steps preview */}
                <div className="space-y-4 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">Tell us what&apos;s blocking you</p>
                      <p className="text-[10px] text-on-surface-variant">&quot;Pitch deck due tomorrow&quot;</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">We build your session</p>
                      <p className="text-[10px] text-on-surface-variant">Breathing + calming exercises</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">Listen and reset</p>
                      <p className="text-[10px] text-on-surface-variant">2-10 min guided audio</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">✓</div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">Start your deep work</p>
                      <p className="text-[10px] text-on-surface-variant">Focus session with a stay-focused guard</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant mt-4">
                  <span>Personalized Session</span>
                  <span>Built For You</span>
                </div>
                <div className="h-1 w-full bg-surface-container-highest rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full w-3/4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Protocol Section ===== */}
        <section
          id="protocol"
          className="py-20 md:py-28 px-6 md:px-12 max-w-7xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-14">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1 */}
            <div className="bg-surface-container-low rounded-2xl p-8 group hover:bg-surface-container transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center mb-6">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-3">
                Personalized Guided Session
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Tell the app what&apos;s blocking you. We build a 2-10 minute
                guided session — with breathing and calming exercises tailored to
                your exact situation.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-low rounded-2xl p-8 group hover:bg-surface-container transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center mb-6">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-3">
                Timed Focus Session
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                After your guided session, start a timed focus session. When your
                brain tries to make you quit, a stay-focused guard steps in and
                keeps you on track.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Features Section ===== */}
        <section
          id="features"
          className="py-20 md:py-28 px-6 md:px-12 max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-surface-container-low rounded-2xl p-8 hover:bg-surface-container transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center mb-6">
                <svg
                  className="w-5 h-5 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-3">
                Built For Your Situation
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Not a generic meditation. Every session is built specifically
                for what&apos;s blocking you — deadlines, burnout, anxiety, or
                feeling like a fraud.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface-container-low rounded-2xl p-8 hover:bg-surface-container transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center mb-6">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-3">
                Day Streaks
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Track your consistency. Build momentum day after day with visual
                streak tracking.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-container-low rounded-2xl p-8 hover:bg-surface-container transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center mb-6">
                <svg
                  className="w-5 h-5 text-tertiary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-3">
                Stay-Focused Guard
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Your brain will try to trick you. A well-timed nudge stops you
                from quitting when motivation dips in the first 5 minutes.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Bottom CTA ===== */}
        <section className="py-20 md:py-28 px-6 md:px-12">
          <div className="max-w-3xl mx-auto bg-surface-container-low rounded-3xl p-12 md:p-16 text-center ghost-border relative overflow-hidden">
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 via-transparent to-secondary-container/5 pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-on-surface mb-2 leading-tight">
                Ready to
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary-container mb-8 leading-tight">
                get unstuck?
              </h2>
              <p className="text-on-surface-variant text-lg mb-10 max-w-md mx-auto leading-relaxed">
                Tell us what&apos;s blocking you, clear your head with a short
                guided session, then start a focus session. No complicated setup.
              </p>
              <Link
                href="/focus"
                className="glow-button px-10 py-4 rounded-xl text-base font-bold mb-4 inline-flex items-center justify-center"
              >
                Start Guided Session
              </Link>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                No account required to start.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="py-8 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-bold tracking-tighter text-primary-container">
          Unblock
        </span>
        <nav className="flex items-center gap-6">
          <a
            href="#"
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            How it works
          </a>
          <a
            href="#"
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Contact
          </a>
        </nav>
        <span className="text-[10px] text-on-surface-variant/50">
          © 2026 Unblock
        </span>
      </footer>
    </div>
  );
}
