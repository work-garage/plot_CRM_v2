"use client";

import { useEffect, useState, useCallback } from "react";
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
  onMenuClick?: () => void;
}

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

export function Header({ onMenuClick = () => {} }: HeaderProps) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null>(null);
	const [loggingOut, setLoggingOut] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);

	const loadUserInfo = useCallback(async () => {
		const supabase = createClient();

		const { data, error } = await supabase.auth.getUser();
		if (error && !isExpectedLoggedOutAuthError(error)) {
			console.error("Header auth error:", error);
		}
		const user = data.user;
		if (!user) {
			setUserInfo(null);
			return;
		}

		const meta = (user.user_metadata || {}) as any;
		let displayName =
			meta.name || meta.full_name || user.user_metadata?.name || null;

		// For advisors, resolve by auth user id so stale metadata does not break the header.
		if (meta.role === "advisor") {
			const { data: advisor } = await supabase
				.from("advisors")
				.select("name")
				.eq("auth_user_id", user.id)
				.maybeSingle();

			if (advisor?.name) {
				displayName = advisor.name;
			}
		}

		setUserInfo({
			name: displayName,
			email: user.email,
			role: meta.role || null,
		});
	}, []);

	useEffect(() => {
		let cancelled = false;
		
		const load = async () => {
			await loadUserInfo();
		};
		
		void load();
		
		// Cleanup: prevent state updates after unmount
		return () => {
			cancelled = true;
		};
	}, [loadUserInfo]);

	// Refresh header after "self profile" saves
	useEffect(() => {
		if (!profileOpen) {
			void loadUserInfo();
		}
	}, [profileOpen, loadUserInfo]);

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
    <header className="sticky top-0 z-30 px-4 pt-4 lg:px-6">
      <div className="surface-panel flex h-16 items-center justify-between px-4 lg:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden lg:flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Workspace
          </span>
          <span className="text-sm font-medium text-foreground">EstateFlow CRM</span>
        </div>

        <div className="flex items-center gap-2">
        {userInfo && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-10 rounded-xl border border-border/80 bg-white/80 px-3 shadow-sm hover:bg-white"
              >
                <User className="h-[18px] w-[18px] text-zinc-500 mr-2" />
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
          className="h-10 rounded-xl border border-transparent px-3 text-zinc-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
      </div>

      <SelfProfileModal
				open={profileOpen}
				onOpenChange={setProfileOpen}
			/>
    </header>
  );
}
