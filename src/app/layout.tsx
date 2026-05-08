import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
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
      <body className="min-h-dvh">
        <Nav user={user} isAdmin={admin} />
        <main className="pb-20 pt-4">{children}</main>
      </body>
    </html>
  );
}
