import { getMessagingDirectory } from "@/app/actions/messaging-directory";
import { MessagingDirectoryClient } from "@/components/messaging/messaging-directory-client";

export default async function MessagingPage() {
	const people = await getMessagingDirectory();
	const todayIsoDate = new Date().toISOString().slice(0, 10);
	return <MessagingDirectoryClient initialPeople={people} todayIsoDate={todayIsoDate} />;
}
