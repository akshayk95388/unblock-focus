import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MixpanelInit from "@/components/MixpanelInit";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AuthProvider from "@/components/AuthProvider";
import { UserPlanProvider } from "@/hooks/useUserPlan";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://unblockfocus.com"),
  title: {
    default: "Unblock — Guided Session + Focus Session for Deep Work",
    template: "%s | Unblock Focus",
  },
  description:
    "Can't start? Tell Unblock what's blocking you. Get a personalized guided session to clear your head, then a distraction-proof focus session to get your deep work done. No account required.",
  keywords: [
    "focus app",
    "guided session",
    "deep work",
    "productivity",
    "procrastination",
    "focus timer",
    "pomodoro",
    "guided breathing",
    "mental clarity",
    "unblock",
    "concentration",
    "work focus",
    "study focus",
    "anxiety relief",
    "task management",
  ],
  authors: [{ name: "Unblock Focus" }],
  creator: "Unblock Focus",
  alternates: {
    canonical: "https://unblockfocus.com",
  },
  openGraph: {
    title: "Unblock — Guided Session + Focus Session for Deep Work",
    description:
      "Tell Unblock what's blocking you. Get a personalized guided session to clear your head, then a distraction-proof focus session to get your deep work done.",
    siteName: "Unblock Focus",
    type: "website",
    url: "https://unblockfocus.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unblock — Guided Session + Focus Session for Deep Work",
    description:
      "Tell Unblock what's blocking you. Get a personalized guided session to clear your head, then a distraction-proof focus session to get your deep work done.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      "RgI0lALBfwxYhnZ0HZl7OqDh2P0adqK10e3FjACoK50",
  },
};

// JSON-LD structured data for rich search results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Unblock Focus",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "AI-powered productivity app. Get a personalized guided session to clear your head, then a distraction-proof focus session for deep work.",
  url: "https://unblockfocus.com",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to start. No credit card required.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <UserPlanProvider>
            <MixpanelInit />
            <GoogleAnalytics />
            {children}
          </UserPlanProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
