import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MixpanelInit from "@/components/MixpanelInit";
import AuthProvider from "@/components/AuthProvider";
import { UserPlanProvider } from "@/hooks/useUserPlan";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Unblock — Guided Session + Focus Session for Deep Work",
  description:
    "Can't start? Tell Unblock what's blocking you. Get a personalized guided session to clear your head, then a distraction-proof focus session to get your deep work done. No account required.",
  openGraph: {
    title: "Unblock — Guided Session + Focus Session for Deep Work",
    description:
      "Tell Unblock what's blocking you. Get a personalized guided session to clear your head, then a distraction-proof focus session to get your deep work done.",
    siteName: "Unblock Focus",
    type: "website",
    url: "https://unblockfocus.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unblock — Guided Session + Focus Session for Deep Work",
    description:
      "Tell Unblock what's blocking you. Get a personalized guided session to clear your head, then a distraction-proof focus session to get your deep work done.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <UserPlanProvider>
            <MixpanelInit />
            {children}
          </UserPlanProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
