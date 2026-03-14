"use client";

// RegisterForm is no longer used standalone — register page uses LoginForm with initialMode="register"
// Keeping this file to avoid import errors in case it's referenced elsewhere.

import type { Locale } from "@/types";
import LoginForm from "./LoginForm";

export default function RegisterForm({ locale }: { locale: Locale }) {
  return <LoginForm locale={locale} initialMode="register" />;
}
