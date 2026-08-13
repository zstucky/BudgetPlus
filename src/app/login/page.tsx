import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/app/auth/auth-form";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims) redirect("/");

  const { error } = await searchParams;
  const notice = error === "confirmation_failed" ? "We could not confirm that link. Please request a new one." : undefined;

  return <AuthForm mode="login" action={login} notice={notice} />;
}
