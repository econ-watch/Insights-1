import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Header } from "./components/Header";
import { UsageBanner } from "./components/UsageBanner";
import { getCurrentUser } from "@/lib/supabase/auth";

const geistSans = localFont({
  src: "../../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 3,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: {
    default: "EconWatch — Live Economic Calendar",
    template: "%s | EconWatch",
  },
  description: "Real-time macroeconomic release calendar. Track GDP, CPI, employment data and central bank decisions across global economies.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EconWatch",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "EconWatch — Live Economic Calendar",
    description: "Real-time macroeconomic release calendar. Track GDP, CPI, employment data and central bank decisions across global economies.",
    type: "website",
    siteName: "EconWatch",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EconWatch Macro Calendar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EconWatch — Live Economic Calendar",
    description: "Real-time macroeconomic release calendar. Track GDP, CPI, employment data and central bank decisions across global economies.",
    images: ["/og-image.png"],
  },
};

/**
 * Routes that should skip auth checks in the layout.
 * These routes use alternative authentication mechanisms (e.g., signed tokens)
 * and calling getCurrentUser() could potentially interfere with the user's
 * existing session due to cookie manipulation during token refresh.
 */
const SKIP_AUTH_ROUTES = ["/unsubscribe"];

/**
 * Check if a route should skip auth.
 */
function shouldSkipAuth(pathname: string): boolean {
  return SKIP_AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the current pathname from headers
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Skip auth for routes that don't need it to avoid cookie manipulation
  // The unsubscribe page uses a signed token for authorization and
  // a service role Supabase client, so no user authentication is needed
  const user = shouldSkipAuth(pathname) ? null : await getCurrentUser();
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Analytics — Plausible (privacy-friendly, no cookies) */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        <Header initialUser={user} />
        {/* Usage warning banner - only shown for authenticated users approaching limits */}
        {user && <UsageBanner />}
        {children}
      </body>
    </html>
  );
}
