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
  let isDemo = false

  if (user?.email) {
    const { data: employee } = await supabase
      .from("employees")
      .select("name, role, is_active, company_id")
      .eq("google_email", user.email)
      .maybeSingle()

    if (employee?.is_active) {
      employeeName = employee.name
      role = employee.role

      // デモ会社かどうかを確認する
      const { data: company } = await supabase
        .from("companies")
        .select("is_demo")
        .eq("id", employee.company_id)
        .maybeSingle()
      isDemo = company?.is_demo ?? false
    }
  }

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell userEmail={user?.email ?? null} employeeName={employeeName} role={role} isDemo={isDemo}>
          {children}
        </AppShell>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
