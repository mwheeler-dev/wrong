import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TimezoneSync } from "@/components/TimezoneSync";
import { getCurrentUser, isAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Wrong.",
  description: "How wrong are you today? A daily prediction game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0A0A",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const admin = isAdmin(user?.email);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <Nav user={user} isAdmin={admin} />
        {/* flex-1 lets short pages push the footer to the viewport bottom */}
        <main className="flex-1 pb-12 pt-4">{children}</main>
        <Footer />
        {/* Keeps the user's stored IANA timezone in sync with their browser.
            Renders nothing — pure side-effect. */}
        {user && <TimezoneSync storedTimezone={user.timezone ?? null} />}
      </body>
    </html>
  );
}
