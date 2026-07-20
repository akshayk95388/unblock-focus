import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Unblock — Break the loop. Get to work.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Twitter card image — matches Obsidian Ember design system
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
          background: "linear-gradient(145deg, #1c1b1c 0%, #131314 40%, #0e0e0f 100%)",
          position: "relative",
        }}
      >
        {/* Subtle ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255, 130, 60, 0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "4px",
            background: "linear-gradient(90deg, transparent 10%, #ffb692 30%, #ff823c 50%, #ffb692 70%, transparent 90%)",
            display: "flex",
          }}
        />

        {/* Logo + Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {/* U Icon badge */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(145deg, #201f20, #131314)",
              border: "1px solid rgba(87, 66, 56, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 800,
              color: "#ff823c",
            }}
          >
            U
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#ff823c",
            }}
          >
            Unblock
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#e5e2e3",
              lineHeight: 1.1,
            }}
          >
            Break the loop.
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #ffb692 0%, #ff823c 100%)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.1,
            }}
          >
            Get to work.
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#dec0b3",
            marginTop: "32px",
            letterSpacing: "-0.01em",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Guided sessions + Focus sessions for deep work
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "rgba(222, 192, 179, 0.4)",
            textTransform: "uppercase",
          }}
        >
          unblockfocus.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
