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
		default: "EstateFlow CRM | Real Estate & Plot Management",
		template: "%s | EstateFlow CRM",
	},
	description:
		"EstateFlow CRM — advanced real estate plot management, advisor tracking, and customer follow-up system.",
	keywords: [
		"real estate",
		"crm",
		"plot management",
		"estateflow",
		"nagpur",
		"advisor commissions",
	],
	authors: [{ name: "EstateFlow CRM" }],
	creator: "EstateFlow CRM",
	publisher: "EstateFlow CRM",
	icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "EstateFlow CRM | Real Estate & Plot Management",
    description: "EstateFlow CRM — advanced real estate plot management, advisor tracking, and customer follow-up system.",
    url: "https://estateflow-crm.vercel.app",
    siteName: "EstateFlow CRM",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EstateFlow CRM | Real Estate & Plot Management",
    description: "EstateFlow CRM — advanced real estate plot management, advisor tracking, and customer follow-up system.",
  },
};

import { ModuleProvider } from "@/components/providers/module-context";

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
				<ModuleProvider>
					{children}
				</ModuleProvider>
				<Toaster position="top-right" richColors closeButton />
			</body>
		</html>
	);
}
