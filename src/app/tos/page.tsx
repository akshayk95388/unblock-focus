import Link from "next/link";
import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms and Conditions | Unblock Focus",
  description:
    "Read the Terms and Conditions for Unblock Focus. Learn about our services, user responsibilities, data handling, and more.",
  openGraph: {
    title: "Terms and Conditions | Unblock Focus",
    description:
      "Read the Terms and Conditions for Unblock Focus. Learn about our services, user responsibilities, and data handling.",
    url: "https://unblockfocus.com/tos",
  },
};

export default function TermsPage() {
  return (
    <LegalLayout>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
        Terms and Conditions
      </h1>

      <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 md:p-8 space-y-6 text-sm text-on-surface-variant leading-relaxed">
        <p className="text-xs font-mono text-on-surface-variant/60">
          Last Updated: February 23, 2026
        </p>

        <p>
          Welcome to Unblock Focus! These Terms &amp; Services (&quot;Terms&quot;)
          govern your access to and use of our website{" "}
          <a
            href="https://unblockfocus.com"
            className="text-primary hover:underline"
          >
            https://unblockfocus.com
          </a>{" "}
          and our AI-powered focus and guided session services
          (&quot;Services&quot;). By using our Services, you agree to these
          Terms.
        </p>

        <div className="space-y-4 pt-2">
          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              1. Services Provided
            </h2>
            <p>
              Unblock Focus provides an AI-powered productivity platform that
              enables users to manage tasks, generate personalized guided audio
              resets, track focus timers, and build consistent habits. A free
              trial is available for testing the product.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              2. Account &amp; User Responsibilities
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                You must provide accurate and complete information when creating
                an account.
              </li>
              <li>
                You are responsible for maintaining the confidentiality of your
                account credentials.
              </li>
              <li>
                You agree not to misuse the Services or engage in unauthorized
                access.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              3. Data &amp; Files
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                You retain ownership of all data and tasks you enter into our
                Services.
              </li>
              <li>
                By using the product, you grant Unblock Focus a limited license
                to process data solely for providing the Services.
              </li>
              <li>
                We do not share your data with third parties for marketing.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              4. Payment &amp; Billing
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                Payments are processed securely through our payment gateway.
              </li>
              <li>
                By making a purchase, you agree to provide valid payment details.
              </li>
              <li>Any applicable taxes are your responsibility.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              5. Data Collection &amp; Privacy
            </h2>
            <p>
              We collect personal data such as your name, email, and payment
              information. We also use web cookies to improve your experience.
              For more details, please review our{" "}
              <Link
                href="/privacy-policy"
                className="text-primary hover:underline font-semibold"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              6. Termination
            </h2>
            <p>
              Unblock Focus reserves the right to suspend or terminate your
              access if you violate these Terms or misuse the Services.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              7. Updates to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Any changes will be
              communicated via email or on our Website.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              8. Governing Law
            </h2>
            <p>
              These Terms are governed by and construed under the laws of India.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              9. Contact Information
            </h2>
            <p>
              For any questions or support, please contact us at{" "}
              <a
                href="mailto:support@unblockfocus.com"
                className="text-primary hover:underline"
              >
                support@unblockfocus.com
              </a>
              .
            </p>
          </div>
        </div>

        <p className="pt-2 text-xs text-on-surface-variant/70 border-t border-outline-variant/10">
          By using our Services, you acknowledge that you have read, understood,
          and agreed to these Terms.
        </p>
      </div>
    </LegalLayout>
  );
}
