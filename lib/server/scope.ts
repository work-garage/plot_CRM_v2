import type { SupabaseClient, User } from "@supabase/supabase-js";

type ScopeContext = {
  user: User | null;
  role: string | null;
  advisorId: string | null;
};

function isExpectedLoggedOutAuthError(error: any): boolean {
  const code = String(error?.code ?? "");
  const name = String(error?.name ?? "");
  const message = String(error?.message ?? "");
  return (
    code === "refresh_token_not_found" ||
    code === "invalid_refresh_token" ||
    name === "AuthSessionMissingError" ||
    message.toLowerCase().includes("auth session missing")
  );
}

export async function getScopeContext(supabase: SupabaseClient): Promise<ScopeContext> {
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (!isExpectedLoggedOutAuthError(error)) {
        console.error("Scope auth error:", error);
      }
    }
    user = data.user;
  } catch (error: any) {
    if (!isExpectedLoggedOutAuthError(error)) {
      console.error("Scope auth exception:", error);
    }
  }

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
