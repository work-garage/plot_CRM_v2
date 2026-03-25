"use client";

import { ProjectForm } from "@/components/projects/project-form";

interface ProjectEditWrapperProps {
	project: {
		id: string;
		name: string;
		location: string | null;
		total_plots_count: number;
		layout_expense: number | null;
		description: string | null;
	};
}

export function ProjectEditWrapper({ project }: ProjectEditWrapperProps) {
	return <ProjectForm mode="edit" initialData={project} />;
}
