import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/auth/LoginForm";
import type { Locale } from "@/types";

export default async function LoginPage({
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
    // Supabase not configured yet — continue to render
  }

  return <LoginForm locale={locale as Locale} />;
}
