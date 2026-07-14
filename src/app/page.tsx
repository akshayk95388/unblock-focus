"use client";

import { useEffect, useState, useRef, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@/lib/mixpanel";

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const questionId = `faq-question-${id}`;
  const answerId = `faq-answer-${id}`;

  return (
    <div className="group bg-surface-container-low border border-outline-variant/15 hover:border-outline-variant/40 rounded-2xl overflow-hidden hover:bg-surface-container transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full flex items-center justify-between p-6 text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset rounded-t-2xl"
      >
        <span id={questionId} className="font-bold text-on-surface text-base md:text-lg pr-4">{question}</span>
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full bg-surface-container-highest group-hover:bg-primary-container group-hover:text-on-primary-container flex items-center justify-center text-on-surface-variant transition-all duration-300 ${
            isOpen ? "rotate-180 bg-primary-container text-on-primary-container" : ""
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>
      <div
        id={answerId}
        role="region"
        aria-labelledby={questionId}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-6 text-on-surface-variant text-sm md:text-base leading-relaxed border-t border-outline-variant/10">
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [stressor, setStressor] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = [
    "Pitch deck due tomorrow",
    "Can't focus, keep checking phone",
    "Feeling overwhelmed",
    "Exam anxiety",
  ];

  const faqs = [
    {
      question: "How does Unblock help me start working?",
      answer: "If you're feeling stuck, overwhelmed, or anxious about a task, Unblock helps you get unstuck. First, you type what's bothering you, and we build a short 2-to-10 minute guided breathing and calming session to clear your mind. Right after, we start a focus timer to help you get straight to work.",
    },
    {
      question: "What makes the guided session personalized?",
      answer: "Instead of a generic meditation, Unblock uses the specific problem you typed (like \"worried about a presentation tomorrow\") to create a personalized guided session. It guides you through simple breathing exercises and calming tips designed for your exact anxiety.",
    },
    {
      question: "Is my data private and secure?",
      answer: "Yes. Your stressors, tasks, and history are kept completely private and secure in your account. We never share them with anyone.",
    },
    {
      question: "What is the Stay-Focused Guard?",
      answer: "Starting a task is always the hardest part, and your mind will try to distract you in the first few minutes. The Stay-Focused Guard steps in with a friendly reminder if you try to quit early, helping you stay on track and build momentum.",
    },
    {
      question: "Is Unblock free to try?",
      answer: "Yes! You can create an account and try Unblock for free. All new accounts get free credits to generate custom guided sessions and try the focus timers.",
    },
  ];

  useEffect(() => {
    track("home_page_viewed");
  }, []);

  const handleGetUnblocked = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stressor.trim()) return;

    // Save pending session config to localStorage
    const pendingSession = {
      stressor: stressor.trim(),
      durationMins: 5,
      voice: "gentle_female",
      music: "none",
    };
    localStorage.setItem("pending_stressor_session", JSON.stringify(pendingSession));

    router.push("/focus");
  };

  const handleScrollToHero = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
  };

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
            <a
              href="#faq"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
            >
              FAQ
            </a>
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

      {/* ===== Hero Section ===== */}
      <main className="flex-1">
        <section id="hero" className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-10">
            {/* Center: Copy */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.05]">
                Break the loop.
                <br />
                <span className="text-primary-container">Get to work.</span>
              </h1>

              <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Can&apos;t start? Tell us what&apos;s blocking you. We&apos;ll
                build a personalized guided session to clear your head — then
                get you into deep work.
              </p>
            </div>

            <form onSubmit={handleGetUnblocked} className="bg-surface-container-low p-5 md:p-6 rounded-2xl border border-outline-variant/15 space-y-4 relative w-full max-w-3xl text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-2xl" />
              <div className="relative z-10 space-y-4">
                <textarea
                  ref={textareaRef}
                  value={stressor}
                  onChange={(e) => setStressor(e.target.value)}
                  placeholder="Describe what's blocking you right now... (e.g. pitch deck panic, feeling like a fraud)"
                  rows={3}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStressor(s);
                        textareaRef.current?.focus();
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer border border-transparent hover:border-outline-variant/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!stressor.trim()}
                  className={`w-full glow-button py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    !stressor.trim() ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95"
                  }`}
                >
                  ⚡ Get Unblocked
                </button>
              </div>
            </form>
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
                Your brain will try to trick you. A friendly reminder stops you
                from quitting when motivation dips in the first 5 minutes.
              </p>
            </div>
          </div>
        </section>

        {/* ===== FAQ Section ===== */}
        <section
          id="faq"
          className="py-20 md:py-28 px-6 md:px-12 max-w-4xl mx-auto"
        >
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-on-surface">
              Frequently Asked Questions
            </h2>
            <p className="text-on-surface-variant text-base md:text-lg">
              Everything you need to know about Unblock and how it helps you defeat procrastination.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))}
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
              <a
                href="#hero"
                onClick={handleScrollToHero}
                className="glow-button px-10 py-4 rounded-xl text-base font-bold mb-4 inline-flex items-center justify-center cursor-pointer"
              >
                Start Guided Session
              </a>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Start for free. No credit card required.
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
