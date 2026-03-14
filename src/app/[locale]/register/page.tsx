import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/auth/LoginForm";
import type { Locale } from "@/types";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect(`/${locale}/dashboard`);
    }
  } catch {
    // Supabase not configured — continue
  }

  // Reuse LoginForm which handles both login and register tabs
  return <LoginForm locale={locale as Locale} initialMode="register" />;
}
