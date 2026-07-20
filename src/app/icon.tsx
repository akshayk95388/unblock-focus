import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Favicon icon — Bold capital "U" mark with perfectly balanced stroke thickness
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131314",
          borderRadius: "6px",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M 28 22 V 55 C 28 67.15 37.85 77 50 77 C 62.15 77 72 67.15 72 55 V 22"
            stroke="#ff823c"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
