"use client";

import Script from "next/script";

/**
 * Google Analytics (GA4) integration for Next.js App Router using next/script.
 * Reads the measurement ID from NEXT_PUBLIC_GA_ID env var.
 */
export default function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;

  if (!measurementId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
