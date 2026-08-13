import { createClient } from "@/lib/supabase/server";

export type MembershipLookup = {
  householdId: string | null;
  userId: string | null;
  error: string | null;
};

export async function getCurrentMembership(): Promise<MembershipLookup> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { householdId: null, userId: null, error: userError?.message ?? null };
  }

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  console.log("Membership lookup:", {
  userId: user.id,
  data,
  error,
  });
  return {
    householdId: data?.household_id ?? null,
    userId: user.id,
    error: error?.message ?? null,
  };
}
