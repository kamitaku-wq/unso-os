import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PushSetup } from "@/components/push-setup";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  manifest: "/manifest.json",
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
  let role: "WORKER" | "ADMIN" | "OWNER" | null = null
  let isDemo = false
  let customSettings: Record<string, unknown> | null = null
  let hasMultipleCompanies = false

  if (user?.email) {
    const { data: employee } = await supabase
      .from("employees")
      .select("name, role, is_active, company_id, companies(is_demo, custom_settings)")
      .eq("google_email", user.email)
      .maybeSingle()

    if (employee?.is_active) {
      employeeName = employee.name
      role = employee.role
      const company = employee.companies as { is_demo?: boolean; custom_settings?: Record<string, unknown> } | null
      isDemo = company?.is_demo ?? false
      customSettings = (company?.custom_settings as Record<string, unknown>) ?? null

      // 複数会社に所属しているか確認（admin で RLS バイパス）
      const admin = createAdminClient()
      const { count } = await admin
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("google_email", user.email)
        .eq("is_active", true)
      hasMultipleCompanies = (count ?? 0) > 1
    }
  }

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell userEmail={user?.email ?? null} employeeName={employeeName} role={role} isDemo={isDemo} customSettings={customSettings} hasMultipleCompanies={hasMultipleCompanies}>
          {children}
        </AppShell>
        <PushSetup />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
