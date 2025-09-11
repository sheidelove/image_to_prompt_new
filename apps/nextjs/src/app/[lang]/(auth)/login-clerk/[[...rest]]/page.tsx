import { redirect } from "next/navigation";
import type { Locale } from "~/config/i18n-config";

export default async function LoginClerkPage({
  params: { lang },
}: {
  params: {
    lang: Locale;
  };
}) {
  // Redirect to the NextAuth login page
  redirect(`/${lang}/login`);
}