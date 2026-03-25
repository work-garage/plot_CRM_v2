import { getMessagingDirectory } from "@/app/actions/messaging-directory";
import { MessagingDirectoryClient } from "@/components/messaging/messaging-directory-client";

export default async function MessagingPage() {
	const people = await getMessagingDirectory();
	return <MessagingDirectoryClient initialPeople={people} />;
}
