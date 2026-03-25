import { PageHeader } from "@/components/shared/page-header";
import { AdvisorForm } from "@/components/advisors/advisor-form";

export default function NewAdvisorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Advisor"
        subtitle="Register a new channel partner"
        showBackButton
      />
      <div className="flex justify-center">
        <AdvisorForm mode="create" />
      </div>
    </div>
  );
}
