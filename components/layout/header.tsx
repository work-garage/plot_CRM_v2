"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LogOut, Menu, User, Loader2 } from "lucide-react";
import {
	Button,
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui";
import { SelfProfileModal } from "./self-profile-modal";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null>(null);
	const [loggingOut, setLoggingOut] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);

	async function loadUserInfo() {
		const supabase = createClient();

		const { data } = await supabase.auth.getUser();
		const user = data.user;
		if (!user) {
			setUserInfo(null);
			return;
		}

		const meta = (user.user_metadata || {}) as any;
		let displayName =
			meta.name || meta.full_name || user.user_metadata?.name || null;

		// For advisors, prefer the name from the advisors table instead of the login email
		if (meta.role === "advisor" && meta.advisor_id) {
			const { data: advisor } = await supabase
				.from("advisors")
				.select("name")
				.eq("id", meta.advisor_id)
				.single();

			if (advisor?.name) {
				displayName = advisor.name;
			}
		}

		setUserInfo({
			name: displayName,
			email: user.email,
			role: meta.role || null,
		});
	}

	useEffect(() => {
		void loadUserInfo();
	}, []);

	// Refresh header after "self profile" saves
	useEffect(() => {
		if (!profileOpen) void loadUserInfo();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profileOpen]);

  async function handleLogout() {
		if (loggingOut) return;
		setLoggingOut(true);
    const supabase = createClient();
		try {
			await supabase.auth.signOut();
		} finally {
			setLoggingOut(false);
		}
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 lg:px-6 dark:bg-zinc-950 dark:border-zinc-800">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        {userInfo && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-9 border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40"
              >
                <User className="h-4 w-4 text-zinc-500 mr-2" />
                <span className="max-w-[140px] truncate text-zinc-800 dark:text-zinc-100">
                  {userInfo.name || userInfo.email || "User"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                My profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-zinc-500 hover:text-red-600"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>

      <SelfProfileModal
				open={profileOpen}
				onOpenChange={setProfileOpen}
			/>
    </header>
  );
}
