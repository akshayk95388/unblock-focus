import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Unblock — Break the loop. Get to work.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Twitter card image — Exact Hero Section Replica (Optimized for Mobile Feed Readability)
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#121112",
          position: "relative",
          padding: "28px 40px",
          boxSizing: "border-box",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "4px",
            background:
              "linear-gradient(90deg, transparent 10%, #ffb692 30%, #ff823c 50%, #ffb692 70%, transparent 90%)",
            display: "flex",
          }}
        />

        {/* Ambient radial glow centered behind hero */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            background:
              "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255, 130, 60, 0.11) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top Header Logo */}
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "44px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 20,
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#ff823c",
            }}
          >
            Unblock
          </div>
        </div>

        {/* ===== Main Centered Hero Column ===== */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            width: "100%",
            maxWidth: "1000px",
            zIndex: 10,
            marginTop: "12px",
          }}
        >
          {/* 1. Badge Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 18px",
              borderRadius: "9999px",
              background: "rgba(35, 33, 34, 0.75)",
              border: "1px solid rgba(255, 130, 60, 0.3)",
              color: "#e8e4e5",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "9999px",
                background: "#ff823c",
                display: "flex",
              }}
            />
            <span>Get unblocked in under 5 minutes</span>
          </div>

          {/* 2. Stacked Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "56px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: "12px",
            }}
          >
            <div style={{ color: "#ffffff" }}>Break the loop</div>
            <div style={{ color: "#ff823c" }}>Get to work</div>
          </div>

          {/* 3. Subtitle */}
          <div
            style={{
              fontSize: "18px",
              color: "#c2b6b3",
              letterSpacing: "-0.01em",
              maxWidth: "820px",
              lineHeight: 1.4,
              marginBottom: "20px",
            }}
          >
            Can&apos;t start? Tell us what&apos;s blocking you. We&apos;ll build a personalized guided session to clear your head — then get you into deep work.
          </div>

          {/* 4. Interactive Input Card Container */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              background: "#19181a",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: "22px",
              padding: "20px 26px",
              boxShadow: "0 18px 45px rgba(0,0,0,0.55), 0 0 30px rgba(255, 130, 60, 0.1)",
              boxSizing: "border-box",
              marginBottom: "16px",
            }}
          >
            {/* Input Placeholder Text (Multiline Textarea Feel) */}
            <div
              style={{
                fontSize: "16px",
                color: "rgba(222, 192, 179, 0.45)",
                textAlign: "left",
                minHeight: "60px",
                marginBottom: "16px",
                fontWeight: 400,
                lineHeight: 1.4,
              }}
            >
              e.g. Can&apos;t focus, pitch deck panic, feeling overwhelmed...
            </div>

            {/* Toolbar Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Left Selector Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 15px",
                    borderRadius: "9999px",
                    background: "rgba(40, 38, 40, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ded6d5",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  <span>⏱️</span>
                  <span>Quick (2–5 min)</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 15px",
                    borderRadius: "9999px",
                    background: "rgba(40, 38, 40, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ded6d5",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  <span>🎙️</span>
                  <span>Calm</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 15px",
                    borderRadius: "9999px",
                    background: "rgba(40, 38, 40, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ded6d5",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  <span>🎵</span>
                  <span>Voice Only</span>
                </div>
              </div>

              {/* Get Unblocked Button */}
              <div
                style={{
                  padding: "9px 24px",
                  borderRadius: "9999px",
                  background: "#ff823c",
                  color: "#0c0b0c",
                  fontSize: "14px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Get Unblocked
              </div>
            </div>
          </div>

          {/* 5. Scenario Pills directly under the input card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Row 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {[
                "Pitch deck due tomorrow",
                "Can't focus, keep checking phone",
                "Feeling overwhelmed",
                "Procrastinating on hard task",
              ].map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "5px 15px",
                    borderRadius: "9999px",
                    background: "rgba(32, 30, 32, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(222, 192, 179, 0.75)",
                    fontSize: "12px",
                    fontWeight: 500,
                    display: "flex",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {["Imposter syndrome", "Exam & interview anxiety"].map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "5px 15px",
                    borderRadius: "9999px",
                    background: "rgba(32, 30, 32, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(222, 192, 179, 0.75)",
                    fontSize: "12px",
                    fontWeight: 500,
                    display: "flex",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}



