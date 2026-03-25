"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ADVISOR_NAV_ITEMS } from "@/components/layout/nav-items";

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<Sidebar
				open={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
				items={ADVISOR_NAV_ITEMS}
			/>

			<div className="flex flex-1 flex-col overflow-hidden">
				<Header onMenuClick={() => setSidebarOpen(true)} />
				<main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}

