import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdvisorForm } from "@/components/advisors/advisor-form";
import { getAdvisorById } from "@/app/actions/advisors";

interface Props {
  params: { id: string };
}

export default async function EditAdvisorPage({ params }: Props) {
  const { id } = await params;
  const advisor = await getAdvisorById(id);

  if (!advisor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Advisor"
        subtitle={`Editing: ${advisor.name}`}
        showBackButton
      />
      <div className="flex justify-center">
        <AdvisorForm mode="edit" initialData={advisor} />
      </div>
    </div>
  );
}
