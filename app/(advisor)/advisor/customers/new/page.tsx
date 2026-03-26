import { redirect } from "next/navigation";

export default async function AdvisorNewCustomerPage() {
	redirect("/advisor/customers");
}
