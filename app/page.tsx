import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export default async function RootPage() {
  const supabase = await createClient();
  
  if (!supabase) {
    redirect("/login");
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && !isExpectedLoggedOutAuthError(error)) {
      console.error("Auth error in root page:", error);
    }
    const user = data.user;

    if (!user) {
      redirect("/login");
    }

    redirect("/dashboard");
  } catch (error: any) {
    if (!isExpectedLoggedOutAuthError(error)) {
      console.error("Auth error in root page:", error);
    }
    redirect("/login");
  }
}
