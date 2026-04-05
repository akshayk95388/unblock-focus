import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Unblock — Break the Loop. Start Deep Work in 60 Seconds.",
  description:
    "Stop doomscrolling. Unblock uses a 60-second breathing intervention and a 5-minute focus challenge to rewire your impulse into sustained deep work. No account required.",
  openGraph: {
    title: "Unblock — Break the Loop. Start Deep Work in 60 Seconds.",
    description:
      "Stop doomscrolling. Unblock uses a 60-second breathing intervention and a 5-minute focus challenge to rewire your impulse into sustained deep work.",
    siteName: "Unblock Focus",
    type: "website",
    url: "https://unblockfocus.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unblock — Break the Loop. Start Deep Work in 60 Seconds.",
    description:
      "Stop doomscrolling. Unblock uses a 60-second breathing intervention and a 5-minute focus challenge to rewire your impulse into sustained deep work.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
