import { PageHeader } from "@/components/shared/page-header";
import { ProjectForm } from "@/components/projects/project-form";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader
        title="New Project"
        subtitle="Create a new land project / layout"
        showBackButton
      />
      <ProjectForm mode="create" />
    </div>
  );
}
