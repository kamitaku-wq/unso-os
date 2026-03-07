import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "運送OS",
  description: "運送業向け業務システム",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let employeeName: string | null = null
  let role: "DRIVER" | "ADMIN" | "OWNER" | null = null

  if (user?.email) {
    const { data: employee } = await supabase
      .from("employees")
      .select("name, role, is_active")
      .eq("google_email", user.email)
      .maybeSingle()

    if (employee?.is_active) {
      employeeName = employee.name
      role = employee.role
    }
  }

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell userEmail={user?.email ?? null} employeeName={employeeName} role={role}>
          {children}
        </AppShell>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
