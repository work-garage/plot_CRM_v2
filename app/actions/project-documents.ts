"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProjectDocumentRow = {
	id: string;
	project_id: string;
	doc_category: string;
	doc_type: string;
	file_path: string;
	file_name: string | null;
	mime_type: string | null;
	notes: string | null;
	created_at: string;
};

export async function getProjectDocuments(projectId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("project_documents")
		.select(
			`
      *
    `
		)
		.eq("project_id", projectId)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return (data ?? []) as ProjectDocumentRow[];
}

export async function createProjectDocument(values: {
	project_id: string;
	doc_category: string;
	doc_type: string;
	file_path: string;
	file_name?: string | null;
	mime_type?: string | null;
	notes?: string | null;
}) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data, error } = await supabase
		.from("project_documents")
		.insert({
			project_id: values.project_id,
			doc_category: values.doc_category,
			doc_type: values.doc_type,
			file_path: values.file_path,
			file_name: values.file_name ?? null,
			mime_type: values.mime_type ?? null,
			notes: values.notes ?? null,
		})
		.select()
		.single();

	if (error) return { success: false, error: error.message };

	revalidatePath(`/projects/${values.project_id}`);
	return { success: true, row: data as ProjectDocumentRow };
}

export async function deleteProjectDocument(id: string, projectId: string) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("project_documents")
		.delete()
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidatePath(`/projects/${projectId}`);
	return { success: true };
}

