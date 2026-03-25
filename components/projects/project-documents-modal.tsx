"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Upload, Trash2 } from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Input,
	Textarea,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Badge,
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ProjectDocumentRow } from "@/app/actions/project-documents";
import { createProjectDocument, deleteProjectDocument } from "@/app/actions/project-documents";

type Props = {
	projectId: string;
	initialDocs: ProjectDocumentRow[];
};

export function ProjectDocumentsModal({ projectId, initialDocs }: Props) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState<"form" | "uploaded">("form");

	const [docs, setDocs] = useState<ProjectDocumentRow[]>(initialDocs);

	const [docCategory, setDocCategory] = useState("agreement");
	const [docType, setDocType] = useState("agreement");
	const [notes, setNotes] = useState("");
	const [uploading, setUploading] = useState(false);

	const [file, setFile] = useState<File | null>(null);

	const docTypes = useMemo(() => {
		// Simple defaults; you can extend these later
		return ["agreement", "photos", "contract", "other"];
	}, []);

	async function openDoc(row: ProjectDocumentRow) {
		try {
			const supabase = createClient();
			const { data, error } = await supabase.storage
				.from("project-docs")
				.createSignedUrl(row.file_path, 60 * 60);

			console.debug("[ProjectDocumentsModal] openDoc", {
				bucket: "project-docs",
				file_path: row.file_path,
				hasSignedUrl: !!data?.signedUrl,
				error: error?.message ?? null,
			});

			if (error || !data?.signedUrl) {
				toast.error("Cannot open document", { description: error?.message ?? "Signed URL not available" });
				return;
			}
			window.open(data.signedUrl, "_blank", "noopener,noreferrer");
		} catch (e: any) {
			toast.error("Cannot open document", { description: e?.message ?? String(e) });
		}
	}

	async function upload() {
		if (!file) {
			toast.error("Select a file first");
			return;
		}
		setUploading(true);
		try {
			const supabase = createClient();
			const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
			const path = `projects/${projectId}/${docCategory}/${docType}/${Date.now()}-${safeName}`;

			const { error: upErr } = await supabase.storage
				.from("project-docs")
				.upload(path, file, { upsert: true, contentType: file.type || undefined });

			console.debug("[ProjectDocumentsModal] upload", {
				bucket: "project-docs",
				path,
				fileType: file.type || null,
				error: upErr?.message ?? null,
			});

			if (upErr) throw upErr;

			const res = await createProjectDocument({
				project_id: projectId,
				doc_category: docCategory,
				doc_type: docType,
				file_path: path,
				file_name: file.name,
				mime_type: file.type || null,
				notes: notes || null,
			});

			if (!res.success) {
				toast.error("Failed to save document", { description: res.error });
				return;
			}

			if (!res.row) {
				toast.error("Failed to save document (missing row)");
				return;
			}

			setDocs((d) => [res.row!, ...d]);
			setFile(null);
			setNotes("");
			setActive("uploaded");
			toast.success("Document uploaded");
		} catch (e: any) {
			toast.error("Upload failed", { description: e?.message ?? String(e) });
		} finally {
			setUploading(false);
		}
	}

	async function removeDoc(row: ProjectDocumentRow) {
		const res = await deleteProjectDocument(row.id, projectId);
		if (!res.success) {
			toast.error("Delete failed", { description: res.error });
			return;
		}
		setDocs((d) => d.filter((x) => x.id !== row.id));
		toast.success("Deleted");
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<FileText className="h-4 w-4 mr-2" />
					Project Docs
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
				<DialogHeader className="p-5 pb-4 border-b border-zinc-100">
					<DialogTitle className="flex items-center justify-between gap-3">
						<span>Project Documents</span>
						<Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
					</DialogTitle>
				</DialogHeader>

				<div className="p-5 space-y-4">
					<div className="flex gap-2">
						<Button
							type="button"
							variant={active === "form" ? "default" : "outline"}
							onClick={() => setActive("form")}
						>
							<Plus className="h-4 w-4 mr-2" />
							Upload Form
						</Button>
						<Button
							type="button"
							variant={active === "uploaded" ? "default" : "outline"}
							onClick={() => setActive("uploaded")}
						>
							Uploaded Docs ({docs.length})
						</Button>
					</div>

					{active === "form" ? (
						<Card>
							<CardContent className="p-3 space-y-3">
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
									<div className="space-y-1">
										<div className="text-xs text-zinc-500">Category</div>
										<Input value={docCategory} onChange={(e) => setDocCategory(e.target.value)} />
									</div>
									<div className="space-y-1">
										<div className="text-xs text-zinc-500">Type</div>
										<Input value={docType} onChange={(e) => setDocType(e.target.value)} list="proj-doc-types" />
										<datalist id="proj-doc-types">
											{docTypes.map((t) => (
												<option key={t} value={t} />
											))}
										</datalist>
									</div>
									<div className="space-y-1">
										<div className="text-xs text-zinc-500">Upload file (image/pdf)</div>
										<Input
											type="file"
											accept="image/*,application/pdf"
											disabled={uploading}
											onChange={(e) => setFile(e.target.files?.[0] ?? null)}
										/>
									</div>
								</div>

								<div className="space-y-1">
									<div className="text-xs text-zinc-500">Notes (optional)</div>
									<Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
								</div>

								<div className="flex justify-end gap-2">
									<Button type="button" variant="outline" onClick={() => setActive("uploaded")} disabled={uploading}>
										Cancel
									</Button>
									<Button type="button" onClick={upload} disabled={uploading || !file}>
										{uploading ? "Uploading..." : "Upload"}
									</Button>
								</div>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{docs.length === 0 ? (
								<div className="col-span-full text-sm text-zinc-500 text-center py-10 border rounded-md border-dashed border-zinc-300">
									No project documents uploaded yet.
								</div>
							) : (
								docs.map((d) => (
									<div
										key={d.id}
										role="button"
										tabIndex={0}
										onClick={() => openDoc(d)}
										className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-3 space-y-2 hover:shadow-sm"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4 text-zinc-400" />
													<div className="font-semibold text-sm truncate">
														{d.file_name ?? d.file_path.split("/").pop()}
													</div>
												</div>
												<div className="text-[11px] text-zinc-500 mt-0.5">
													{d.doc_category} • {d.doc_type}
												</div>
												<div className="text-[11px] text-zinc-500 truncate">
													Uploaded: {new Date(d.created_at).toLocaleString()}
												</div>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<Badge variant="secondary" className="text-[10px]">
													{d.mime_type?.startsWith("application/pdf")
														? "PDF"
														: d.mime_type?.startsWith("image/")
															? "IMG"
															: "FILE"}
												</Badge>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															type="button"
															variant="destructive"
															size="icon"
															className="h-8 w-8"
															onClick={(e) => e.stopPropagation()}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>Delete document?</AlertDialogTitle>
															<AlertDialogDescription>
																This removes the database record. Storage file can be cleaned later.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogTrigger asChild>
																<Button variant="outline" className="hidden" />
															</AlertDialogTrigger>
															<Button
																variant="destructive"
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	removeDoc(d);
																}}
															>
																Delete
															</Button>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

