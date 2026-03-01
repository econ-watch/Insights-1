"use client";

import Link from "next/link";
import { useState } from "react";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the essentials",
    features: [
      "Browse the full economic calendar",
      "3 watchlist indicators",
      "Country & impact filters",
      "Community access",
    ],
    cta: "Get Started",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Plus",
    price: "$12",
    period: "/mo",
    yearlyPrice: "$99/yr",
    description: "For active traders who need alerts",
    features: [
      "Everything in Free",
      "Unlimited watchlist",
      "Email alerts on releases",
      "CSV & JSON data export",
      "1,000 API calls/mo",
    ],
    cta: "Start Free Trial",
    href: "/auth/signup?plan=plus",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    yearlyPrice: "$249/yr",
    description: "For developers and serious analysts",
    features: [
      "Everything in Plus",
      "Webhook integrations",
      "iCal calendar sync",
      "10,000 API calls/mo",
      "Historical data access",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/auth/signup?plan=pro",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "$79",
    period: "/mo",
    yearlyPrice: "$699/yr",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Team & org management",
      "Shared watchlists",
      "100,000 API calls/mo",
      "Org-level billing",
      "Dedicated support",
    ],
    cta: "Contact Us",
    href: "/auth/signup?plan=enterprise",
    highlight: false,
  },
];

const FEATURES = [
  {
    icon: "📊",
    title: "Real-Time Calendar",
    description:
      "Track GDP, CPI, employment, and central bank decisions across 20+ economies. See actual vs forecast the moment data drops.",
  },
  {
    icon: "🔔",
    title: "Smart Alerts",
    description:
      "Get email notifications before releases you care about. Never miss an NFP, ECB decision, or surprise revision again.",
  },
  {
    icon: "⚡",
    title: "Developer API",
    description:
      "RESTful API with OpenAPI docs. Build trading bots, dashboards, or research tools on top of clean, structured macro data.",
  },
  {
    icon: "🔗",
    title: "Webhooks & Integrations",
    description:
      "Push release data to your systems in real-time. Integrate with Slack, Discord, or your own infrastructure.",
  },
  {
    icon: "📈",
    title: "Revision Tracking",
    description:
      "See when economic data gets revised. Catch the revisions that move markets but most calendars ignore.",
  },
  {
    icon: "👥",
    title: "Team Collaboration",
    description:
      "Shared watchlists, org billing, and role management. Get your whole desk on the same page.",
  },
];

export function LandingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-zinc-100">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Live economic data — updated in real time
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          The economic calendar
          <br />
          <span className="text-blue-500">built for builders</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400">
          Track macro releases, get alerts, and integrate economic data into
          your trading systems. Clean API. Real-time updates. No Bloomberg
          terminal required.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
          >
            Get Started Free
          </Link>
          <Link
            href="/docs/api"
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
          >
            View API Docs →
          </Link>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/30 py-8">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            Trusted by traders, developers, and analysts worldwide
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
            Everything you need to track macro
          </h2>
          <p className="text-zinc-400">
            From browsing to building — one platform for all your economic data
            needs.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-[#151921] p-6 transition hover:border-zinc-700"
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
      >
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mb-6 text-zinc-400">
            Start free. Upgrade when you need more.
          </p>
          <div className="inline-flex items-center gap-3 rounded-full border border-zinc-700 bg-zinc-800/50 px-1 py-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                !annual
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                annual
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Annual{" "}
              <span className="text-emerald-400">Save ~30%</span>
            </button>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-6 transition ${
                tier.highlight
                  ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                  : "border-zinc-800 bg-[#151921]"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                  Popular
                </div>
              )}
              <h3 className="mb-1 text-lg font-semibold">{tier.name}</h3>
              <p className="mb-4 text-xs text-zinc-500">{tier.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">
                  {annual && tier.yearlyPrice
                    ? tier.yearlyPrice.split("/")[0]
                    : tier.price}
                </span>
                <span className="text-sm text-zinc-500">
                  {annual && tier.yearlyPrice ? "/yr" : tier.period}
                </span>
              </div>
              <ul className="mb-6 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`block rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                  tier.highlight
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/50 bg-zinc-900/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
            Stop missing market-moving data
          </h2>
          <p className="mb-6 text-zinc-400">
            Join traders and developers who use EconWatch to stay ahead of
            economic releases.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                EconWatch
              </span>
            </div>
            <div className="flex gap-6 text-xs text-zinc-500">
              <Link href="/docs/api" className="hover:text-zinc-300">
                API Docs
              </Link>
              <Link href="/terms" className="hover:text-zinc-300">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-zinc-300">
                Privacy
              </Link>
            </div>
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} EconWatch
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
