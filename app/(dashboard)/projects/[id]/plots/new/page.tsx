import { PageHeader } from "@/components/shared/page-header";
import { PlotForm } from "@/components/projects/plot-form";

interface Props {
  params: { id: string };
}

export default async function NewPlotPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Add Plot" 
        subtitle="Add a new plot to this project" 
        showBackButton
      />
      <div className="flex justify-center">
        <PlotForm mode="create" projectId={id} />
      </div>
    </div>
  );
}
