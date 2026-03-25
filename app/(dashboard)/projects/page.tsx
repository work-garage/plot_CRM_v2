import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { getProjectsWithPlotCounts } from "@/app/actions/project-actions";

export default async function ProjectsPage() {
  const projects = await getProjectsWithPlotCounts();

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} land project${
          projects.length !== 1 ? "s" : ""
        }`}
        action={
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        }
      />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <Building2 className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">No projects yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            Get started by creating your first land project
          </p>
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              location={project.location}
              total_plots_count={project.total_plots_count}
              layout_expense={Number(project.layout_expense)}
              plotCounts={project.plotCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
