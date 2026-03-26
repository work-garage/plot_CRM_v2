import { redirect } from "next/navigation";
import { getModuleSettings, type ModuleSettings } from "@/app/actions/settings";

export async function requireModule(moduleKey: keyof ModuleSettings, redirectTo: string) {
  const modules = await getModuleSettings();
  if (!modules[moduleKey]) {
    redirect(redirectTo);
  }
  return modules;
}
