import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold text-zinc-100">
          Terms of Service
        </h1>
        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-sm leading-relaxed text-zinc-300">
          <p>
            <strong>Last updated:</strong> February 2026
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using EconWatch (&quot;the Service&quot;), you agree
            to be bound by these Terms of Service. If you do not agree, do not
            use the Service.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            2. Description of Service
          </h2>
          <p>
            EconWatch provides a macroeconomic data calendar, API access, email
            alerts, and related tools. Data is aggregated from public and
            third-party sources. We make reasonable efforts to ensure accuracy
            but do not guarantee it.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            3. No Financial Advice
          </h2>
          <p>
            EconWatch is an informational tool. Nothing on this platform
            constitutes financial, investment, or trading advice. You are solely
            responsible for your trading and investment decisions.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            4. Accounts
          </h2>
          <p>
            You are responsible for maintaining the security of your account
            credentials and API keys. You agree not to share your API keys or
            allow unauthorized access to your account.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            5. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Resell or redistribute EconWatch data without permission</li>
            <li>
              Exceed your plan&apos;s API rate limits or attempt to circumvent
              them
            </li>
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to reverse-engineer or disrupt the Service</li>
          </ul>

          <h2 className="text-lg font-semibold text-zinc-100">
            6. Billing & Refunds
          </h2>
          <p>
            Paid plans are billed monthly or annually via Stripe. You may cancel
            at any time; access continues through the end of your billing
            period. Refunds are handled on a case-by-case basis.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            7. Data Accuracy
          </h2>
          <p>
            While we strive for accuracy, economic data may be delayed,
            incomplete, or subject to revision. EconWatch is not liable for
            losses arising from data inaccuracies.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            8. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, EconWatch shall not be
            liable for any indirect, incidental, or consequential damages
            arising from your use of the Service.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            9. Changes to Terms
          </h2>
          <p>
            We may update these terms at any time. Continued use after changes
            constitutes acceptance of the new terms.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            10. Contact
          </h2>
          <p>
            Questions about these terms? Contact us at{" "}
            <a
              href="mailto:support@econwatch.io"
              className="text-blue-400 hover:underline"
            >
              support@econwatch.io
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
