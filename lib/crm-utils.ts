// Shared CRM utility functions (not a server action)

export function deriveTaskStatus(f: {
	whatsapp_done: boolean;
	call_done: boolean;
	site_visit_done: boolean;
}): "Completed" | "Pending" {
	return f.whatsapp_done && f.call_done && f.site_visit_done ? "Completed" : "Pending";
}
