import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  
  if (!supabase) {
    redirect("/login");
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    redirect("/dashboard");
  } catch (error) {
    console.error("Auth error in root page:", error);
    redirect("/login");
  }
}
