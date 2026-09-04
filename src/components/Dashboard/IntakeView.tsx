"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ConversationMessage {
  role: "assistant" | "user";
  content: string;
}

interface IntakeViewProps {
  stressor: string;
  category: string;
  intent: string;
  onComplete: (enrichedStressor: string) => void;
  onSkip: () => void;
  zenActive: boolean;
  onToggleZen?: () => void;
  onCancel?: () => void;
  preset?: string;
}

export default function IntakeView({
  stressor,
  category,
  intent,
  onComplete,
  onSkip,
  zenActive,
  onToggleZen,
  onCancel,
  preset,
}: IntakeViewProps) {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true); // true while waiting for first token
  const [questionCount, setQuestionCount] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isFadingOut, setIsFadingOut] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  const tokenQueueRef = useRef<string[]>([]);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDoneRef = useRef(false);
  const streamMetaRef = useRef<{ hasEnough: boolean; fullResponse: string; conv: ConversationMessage[]; qNum: number } | null>(null);

  // Cleanup reveal timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
  }, []);

  // Compile enriched stressor from conversation history (Q&A pairs)
  const compileEnrichedStressor = useCallback(
    (conv: ConversationMessage[]) => {
      // Build Q&A pairs so the script generator knows what each answer refers to
      const qaPairs: string[] = [];
      for (let i = 0; i < conv.length; i += 2) {
        const question = conv[i]; // assistant
        const answer = conv[i + 1]; // user
        if (question?.role === "assistant" && answer?.role === "user") {
          qaPairs.push(`Q: ${question.content} A: ${answer.content}`);
        }
      }

      if (qaPairs.length > 0) {
        return `${stressor}. [Follow-up context: ${qaPairs.join(" | ")}]`;
      }
      return stressor;
    },
    [stressor]
  );

  // Start the word-by-word reveal timer
  const startRevealTimer = useCallback(() => {
    if (revealTimerRef.current) return; // Already running

    revealTimerRef.current = setInterval(() => {
      const queue = tokenQueueRef.current;

      if (queue.length > 0) {
        const word = queue.shift()!;
        setIsWaiting(false);
        setCurrentQuestion((prev) => prev + word);
      } else if (streamDoneRef.current) {
        // Queue empty and stream finished — wrap up
        if (revealTimerRef.current) {
          clearInterval(revealTimerRef.current);
          revealTimerRef.current = null;
        }
        setIsStreaming(false);

        const meta = streamMetaRef.current;
        if (!meta) return;

        setQuestionCount(meta.qNum);

        const updatedConv: ConversationMessage[] = [
          ...meta.conv,
          { role: "assistant", content: meta.fullResponse },
        ];
        setConversation(updatedConv);

        // Defensive: if the message is a question (ends with ?), always wait for user input
        const isQuestion = meta.fullResponse.trim().endsWith("?");
        if (meta.hasEnough && !isQuestion) {
          setTimeout(() => {
            onComplete(compileEnrichedStressor(updatedConv));
          }, 1500);
        } else {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    }, 95); // ~95ms per word for a calm, readable typing pace
  }, [onComplete, compileEnrichedStressor]);

  // Stream a question from the intake endpoint
  const askQuestion = useCallback(
    async (conv: ConversationMessage[], qNum: number) => {
      setIsStreaming(true);
      setIsWaiting(true);
      setCurrentQuestion("");
      tokenQueueRef.current = [];
      streamDoneRef.current = false;
      streamMetaRef.current = null;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/intake/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stressor,
            category,
            intent,
            conversation: conv,
            question_number: qNum,
            preset: preset || "guided_session",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error("Intake ask failed:", response.status);
          onComplete(compileEnrichedStressor(conv));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onComplete(compileEnrichedStressor(conv));
          return;
        }

        const decoder = new TextDecoder();
        let fullResponse = "";
        let hasEnough = false;
        let buffer = "";

        // Start the reveal timer — it will pop tokens from the queue
        startRevealTimer();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);

                if (data.token !== undefined) {
                  fullResponse += data.token;
                  // Push token into queue — the reveal timer will display it
                  tokenQueueRef.current.push(data.token);
                } else if (data.has_enough_context !== undefined) {
                  hasEnough = data.has_enough_context;
                  fullResponse = data.full_response || fullResponse;
                } else if (data.error) {
                  console.error("Intake SSE error:", data.error);
                  onComplete(compileEnrichedStressor(conv));
                  return;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // Signal to the reveal timer that the stream is done
        streamMetaRef.current = { hasEnough, fullResponse, conv, qNum };
        streamDoneRef.current = true;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Intake ask error:", err);
        onComplete(compileEnrichedStressor(conv));
      }
    },
    [stressor, category, intent, onComplete, compileEnrichedStressor, startRevealTimer]
  );

  // Start the first question once category is available (from classify)
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (!category) return; // Wait for classify to complete
    hasStartedRef.current = true;
    askQuestion([], 1);

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Handle user submitting their answer
  const handleSubmit = useCallback(() => {
    const answer = userInput.trim();
    if (!answer || isStreaming || isWaiting) return;

    const updatedConv: ConversationMessage[] = [
      ...conversation,
      { role: "user", content: answer },
    ];

    setUserInput("");
    setIsStreaming(true);

    // Fade out current question
    setIsFadingOut(true);
    setTimeout(() => {
      setIsFadingOut(false);
      setCurrentQuestion("");

      const nextQ = questionCount + 1;
      if (nextQ > 3) {
        // Hard cap reached — compile and complete
        onComplete(compileEnrichedStressor(updatedConv));
      } else {
        // Ask the next question
        setConversation(updatedConv);
        askQuestion(updatedConv, nextQ);
      }
    }, 300);
  }, [
    userInput,
    isStreaming,
    isWaiting,
    conversation,
    questionCount,
    onComplete,
    compileEnrichedStressor,
    askQuestion,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isBusy = isWaiting || isStreaming;

  return (
    <div className="bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/15 rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[calc(100vh-8rem)]">
      {/* Question area */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className={`max-w-lg transition-opacity duration-300 ${
            isFadingOut ? "opacity-0" : "opacity-100"
          }`}
        >
          {isWaiting ? (
            /* Thinking indicator — three pulsing dots */
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <p className="text-xl md:text-2xl text-on-surface font-medium leading-relaxed tracking-tight">
              {currentQuestion}
              {isStreaming && (
                <span className="inline-block w-0.5 h-5 md:h-6 bg-primary ml-1.5 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Input area — only shown when not streaming and hasn't completed */}
      <div className="w-full max-w-md space-y-4 z-10 mb-6">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isBusy ? "Thinking..." : (preset === "visualization" ? "Describe your vision..." : "Type your answer...")}
            disabled={isBusy}
            className="w-full px-5 py-3.5 pr-14 bg-surface-container rounded-xl border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/70 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-90"
          />
          <button
            onClick={handleSubmit}
            disabled={isBusy || !userInput.trim()}
            className={`absolute right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isBusy || !userInput.trim()
                ? "bg-white/5 text-white/25 border border-white/5 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-on-primary shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
            }`}
          >
            <svg
              className="w-4 h-4 ml-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer"
        >
          {preset === "visualization" ? "Skip to visualization →" : "Skip to session →"}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="z-10 flex items-center justify-center gap-4">
        {onToggleZen && (
          <button
            onClick={onToggleZen}
            className="px-5 py-2 rounded-full text-[10px] tracking-wider uppercase text-outline hover:text-white transition-all border border-outline-variant/20 hover:bg-white/5 cursor-pointer font-bold"
          >
            {zenActive ? "🧘 Exit Zen Mode" : "🧘 Go Zen Mode"}
          </button>
        )}
        {onCancel && (
          <button
            onClick={() => {
              abortRef.current?.abort();
              onCancel();
            }}
            className="px-5 py-2 rounded-full text-[10px] tracking-wider uppercase text-outline hover:text-error transition-all border border-transparent hover:border-error/20 hover:bg-error-container/5 cursor-pointer font-bold"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
