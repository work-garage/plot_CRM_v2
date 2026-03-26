export type PeriodPreset = "all" | "this_month" | "last_month" | "this_year";

export function getPeriodPresetRange(preset: PeriodPreset, now = new Date()) {
  const today = toDateInputValue(now);

  if (preset === "all") {
    return { from: "", to: "" };
  }

  if (preset === "this_month") {
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      to: today,
    };
  }

  if (preset === "last_month") {
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: toDateInputValue(lastMonthStart),
      to: toDateInputValue(lastMonthEnd),
    };
  }

  return {
    from: `${now.getFullYear()}-01-01`,
    to: today,
  };
}

export function toDateInputValue(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export function buildSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
  preserveKeys: string[] = [],
) {
  const params = new URLSearchParams();

  for (const key of preserveKeys) {
    const value = current.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "" || value === "all") {
      params.delete(key);
      continue;
    }
    params.set(key, value);
  }

  return params;
}
