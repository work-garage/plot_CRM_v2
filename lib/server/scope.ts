import type { SupabaseClient, User } from "@supabase/supabase-js";

type ScopeContext = {
  user: User | null;
  role: string | null;
  advisorId: string | null;
};

export async function getScopeContext(supabase: SupabaseClient): Promise<ScopeContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null, advisorId: null };
  }

  const role = typeof (user.user_metadata as any)?.role === "string"
    ? String((user.user_metadata as any).role)
    : null;

  if (role !== "advisor") {
    return { user, role, advisorId: null };
  }

  const { data: advisor } = await supabase
    .from("advisors")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return {
    user,
    role,
    advisorId: advisor?.id ?? null,
  };
}

export function isAdvisorRole(role: string | null): boolean {
  return role === "advisor";
}
