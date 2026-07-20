import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | Unblock Focus",
  description:
    "Learn how Unblock Focus collects, uses, and protects your personal information. Read our full privacy policy.",
  openGraph: {
    title: "Privacy Policy | Unblock Focus",
    description:
      "Learn how Unblock Focus collects, uses, and protects your personal information.",
    url: "https://unblockfocus.com/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
        Privacy Policy
      </h1>

      <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 md:p-8 space-y-6 text-sm text-on-surface-variant leading-relaxed">
        <p className="text-xs font-mono text-on-surface-variant/60">
          Last Updated: February 23, 2026
        </p>

        <p>
          Welcome to Unblock Focus. Your privacy is important to us. This
          Privacy Policy explains how we collect, use, and protect your
          information when you use our website{" "}
          <a
            href="https://unblockfocus.com"
            className="text-primary hover:underline"
          >
            https://unblockfocus.com
          </a>{" "}
          and our services.
        </p>

        <div className="space-y-4 pt-2">
          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              1. Information We Collect
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                <strong className="text-on-surface">Personal Data:</strong> We
                collect your name, email address, and payment information when
                you use our Services.
              </li>
              <li>
                <strong className="text-on-surface">Non-Personal Data:</strong>{" "}
                We collect web cookies and analytical usage data to enhance user
                experience and analyze app usage.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              2. Purpose of Data Collection
            </h2>
            <p>
              We collect personal data to process orders, generate personalized
              focus resets, and provide our Services effectively.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              3. Data Sharing
            </h2>
            <p>
              We do not sell or share your personal data with any third parties
              for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              4. Children&apos;s Privacy
            </h2>
            <p>
              Our Services are not intended for children, and we do not knowingly
              collect any data from children.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              5. Security
            </h2>
            <p>
              We implement appropriate security measures to protect your personal
              data from unauthorized access or misuse.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              6. Updates to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be communicated via email or through our website.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-on-surface text-base mb-1">
              7. Contact Information
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact
              us at{" "}
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
          By using our Website and Services, you agree to this Privacy Policy.
        </p>
      </div>
    </LegalLayout>
  );
}
