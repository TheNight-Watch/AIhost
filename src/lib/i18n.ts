import type { Locale } from "@/types";
import zhMessages from "@/i18n/zh.json";
import enMessages from "@/i18n/en.json";

const messages: Record<Locale, typeof zhMessages> = {
  zh: zhMessages,
  en: enMessages,
};

/**
 * Get a nested translation value by dot-separated key.
 * Example: t("auth.email", "zh") => "邮箱"
 */
export function t(key: string, locale: Locale): string {
  const parts = key.split(".");
  let current: unknown = messages[locale];
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key; // fallback to key itself
    }
  }
  return typeof current === "string" ? current : key;
}
