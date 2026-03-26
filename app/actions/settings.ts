"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ModuleSettings = {
	sales: boolean;
	payments: boolean;
	commissions: boolean;
	expenses: boolean;
	reports: boolean;
};

export async function getModuleSettings(): Promise<ModuleSettings> {
	const supabase = await createClient();
	if (!supabase) return defaultSettings;

	const { data, error } = await supabase
		.from("app_settings")
		.select("value")
		.eq("key", "modules")
		.maybeSingle();

	if (error || !data) return defaultSettings;

	return { ...defaultSettings, ...(data.value as any) };
}

export async function updateModuleSettings(settings: Partial<ModuleSettings>) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const current = await getModuleSettings();
	const updated = { ...current, ...settings };

	const { error } = await supabase
		.from("app_settings")
		.update({
			value: updated,
			updated_at: new Date().toISOString()
		})
		.eq("key", "modules");

	if (error) return { success: false, error: error.message };

	revalidatePath("/");
	revalidatePath("/(dashboard)", "layout");
	return { success: true };
}

const defaultSettings: ModuleSettings = {
	sales: false,
	payments: false,
	commissions: false,
	expenses: false,
	reports: false,
};
