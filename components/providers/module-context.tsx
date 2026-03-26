"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { getModuleSettings, updateModuleSettings, type ModuleSettings } from "@/app/actions/settings";
import { toast } from "sonner";

type ModuleContextType = {
	modules: ModuleSettings;
	isLoading: boolean;
	isUpdating: boolean;
	toggleModule: (key: keyof ModuleSettings, enabled: boolean) => Promise<void>;
	refreshModules: () => Promise<void>;
};

const defaultSettings: ModuleSettings = {
	sales: false,
	payments: false,
	commissions: false,
	expenses: false,
	reports: false,
};

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: React.ReactNode }) {
	const [modules, setModules] = useState<ModuleSettings>(defaultSettings);
	const [isLoading, setIsLoading] = useState(true);
	const [isPending, startTransition] = useTransition();

	const fetchSettings = async () => {
		try {
			const settings = await getModuleSettings();
			setModules(settings);
		} catch (err) {
			console.error("Failed to fetch module settings:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchSettings();
	}, []);

	const toggleModule = async (key: keyof ModuleSettings, enabled: boolean) => {
		const updated = { ...modules, [key]: enabled };
		// Optimistic update
		setModules(updated);

		startTransition(async () => {
			const res = await updateModuleSettings({ [key]: enabled });
			if (!res.success) {
				toast.error("Failed to update module settings");
				// Revert on failure
				fetchSettings();
			} else {
				toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} module ${enabled ? 'enabled' : 'disabled'}`);
			}
		});
	};

	return (
		<ModuleContext.Provider value={{
			modules,
			isLoading,
			isUpdating: isPending,
			toggleModule,
			refreshModules: fetchSettings
		}}>
			{children}
		</ModuleContext.Provider>
	);
}

export function useModules() {
	const context = useContext(ModuleContext);
	if (context === undefined) {
		throw new Error("useModules must be used within a ModuleProvider");
	}
	return context;
}
