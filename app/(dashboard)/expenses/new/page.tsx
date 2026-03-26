import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { getProjects } from "@/app/actions/project-actions";
import { requireModule } from "@/lib/server/modules";

export default async function NewExpensePage() {
  await requireModule("expenses", "/dashboard");
  const projects = await getProjects();
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Add Expense" 
        subtitle="Record a new office or operational expense" 
        showBackButton
      />
      <div className="flex justify-center">
        <ExpenseForm projects={projects as any[]} />
      </div>
    </div>
  );
}
