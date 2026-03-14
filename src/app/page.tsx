import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/utils";

export default function Home() {
  redirect(`/${defaultLocale}`);
}
