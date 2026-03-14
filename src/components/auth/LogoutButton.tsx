"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";

export default function LogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
    >
      {t("common.logout", locale)}
    </button>
  );
}
