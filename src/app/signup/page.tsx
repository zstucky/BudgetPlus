import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/app/auth/auth-form";
import { signup } from "@/app/auth/actions";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims) redirect("/");

  return <AuthForm mode="signup" action={signup} />;
}
