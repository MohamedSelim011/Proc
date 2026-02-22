import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/ui/toast";
import { TokenExpirationHandler } from "@/components/TokenExpirationHandler";
import { BRAND_FAVICON_URL, COMPANY_NAME } from "@/lib/branding";
import { resolveThemeCssVariables } from "@/lib/theme";

export const metadata: Metadata = {
  title: `${COMPANY_NAME} Procurement Management System`,
  description: `${COMPANY_NAME} enterprise procurement solution for streamlined purchase-to-pay processes`,
  keywords: "procurement, purchase orders, invoices, payments, supply chain, Oman",
  icons: {
    icon: BRAND_FAVICON_URL,
    shortcut: BRAND_FAVICON_URL,
    apple: BRAND_FAVICON_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeCssVariables = resolveThemeCssVariables();

  return (
    <html lang="en">
      <body
        className="antialiased"
        style={themeCssVariables}
      >
        <SessionProvider>
          <ToastProvider>
            <TokenExpirationHandler />
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
