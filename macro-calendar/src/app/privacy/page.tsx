import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold text-zinc-100">
          Privacy Policy
        </h1>
        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-sm leading-relaxed text-zinc-300">
          <p>
            <strong>Last updated:</strong> February 2026
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            1. Information We Collect
          </h2>
          <p>We collect:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account info:</strong> Email address when you sign up
            </li>
            <li>
              <strong>Usage data:</strong> Pages visited, features used, API
              call counts
            </li>
            <li>
              <strong>Payment info:</strong> Processed securely by Stripe; we
              never store card numbers
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-zinc-100">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To provide and improve the Service</li>
            <li>To send transactional emails (alerts, account updates)</li>
            <li>To enforce rate limits and usage quotas</li>
            <li>To respond to support requests</li>
          </ul>

          <h2 className="text-lg font-semibold text-zinc-100">
            3. What We Don&apos;t Do
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>We do not sell your personal information</li>
            <li>We do not send marketing emails without consent</li>
            <li>We do not share data with third parties except as needed to operate the Service (e.g., Stripe for billing, Supabase for infrastructure)</li>
          </ul>

          <h2 className="text-lg font-semibold text-zinc-100">
            4. Cookies & Analytics
          </h2>
          <p>
            We use minimal analytics to understand how the Service is used. We
            use essential cookies for authentication. We do not use advertising
            trackers.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            5. Data Retention
          </h2>
          <p>
            We retain your account data while your account is active. You may
            request deletion of your account and associated data at any time by
            contacting us.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            6. Security
          </h2>
          <p>
            We use industry-standard security measures including encryption in
            transit (TLS), secure authentication via Supabase, and encrypted
            payment processing via Stripe.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100">
            7. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Access your personal data</li>
            <li>Request correction or deletion</li>
            <li>Export your data</li>
            <li>Opt out of non-essential communications</li>
          </ul>

          <h2 className="text-lg font-semibold text-zinc-100">
            8. Contact
          </h2>
          <p>
            Privacy questions? Email{" "}
            <a
              href="mailto:privacy@econwatch.io"
              className="text-blue-400 hover:underline"
            >
              privacy@econwatch.io
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
