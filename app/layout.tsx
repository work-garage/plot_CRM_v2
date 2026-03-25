// filepath: app/layout.tsx
import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
};

export const metadata: Metadata = {
	title: {
		default: "S-INFRA CRM | Real Estate & Plot Management",
		template: "%s | S-INFRA CRM",
	},
	description:
		"Advanced CRM system for real estate plot management, advisor commissions, and customer follow-ups by S-INFRA.",
	keywords: [
		"real estate",
		"crm",
		"plot management",
		"s-infra",
		"nagpur",
		"advisor commissions",
	],
	authors: [{ name: "S-INFRA" }],
	creator: "S-INFRA",
	publisher: "S-INFRA",
	icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "S-INFRA CRM | Real Estate & Plot Management",
    description: "Advanced CRM system for real estate plot management, advisor commissions, and customer follow-ups by S-INFRA.",
    url: "https://s-infra-crm.vercel.app",
    siteName: "S-INFRA CRM",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S-INFRA CRM | Real Estate & Plot Management",
    description: "Advanced CRM system for real estate plot management, advisor commissions, and customer follow-ups by S-INFRA.",
  },
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={cn("font-sans", geist.variable)}
			suppressHydrationWarning
		>
			<body className={inter.className} suppressHydrationWarning>
				{children}
				<Toaster position="top-right" richColors closeButton />
			</body>
		</html>
	);
}
