"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
	Button,
	Input,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui";
import { signInWithEmailOrPhone } from "@/app/actions/auth";

const loginSchema = z.object({
	identifier: z.string().trim().min(3, "Enter email or phone"),
	password: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { identifier: "", password: "" },
	});

	async function onSubmit(values: LoginFormValues) {
		setLoading(true);
		try {
			const result = await signInWithEmailOrPhone(
				values.identifier,
				(values.password ?? "").trim()
			);
			if (!result.success) {
				toast.error("Login failed", { description: result.error });
				return;
			}
			// On success, server action redirects based on role/middleware.
		} finally {
			setLoading(false);
		}
	}

	return (
		<div
			suppressHydrationWarning
			className="relative min-h-screen overflow-hidden"
		>
			{/* Background image (login screen only) */}
			<div
				suppressHydrationWarning
				aria-hidden
				className="absolute inset-0 bg-cover bg-center"
				style={{ backgroundImage: "url('/bg.jpg')" }}
			/>
			<div className="relative z-10 min-h-screen flex justify-center sm:justify-center lg:justify-start px-4 sm:px-12 lg:px-20">
				<div className="w-full sm:max-w-md sm:pt-0 sm:-translate-y-6 pt-20 sm:flex sm:items-center">
					<Card
						suppressHydrationWarning
						className="w-full max-w-md bg-zinc-100/90 border border-zinc-200/70 shadow-xl"
					>
				<CardHeader className="text-center space-y-4">
					<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
						<Building2 className="h-10 w-10 text-white dark:text-zinc-900" />
					</div>
					<div>
						<CardTitle className="text-2xl font-bold">EstateFlow CRM</CardTitle>
						<CardDescription className="text-sm mt-1">
							EstateFlow CRM login
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="identifier"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email or Phone</FormLabel>
										<FormControl>
											<Input
												placeholder="admin@crm.com or 9876543210"
												type="text"
												autoComplete="username"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input
													placeholder="••••••••"
													type={showPassword ? "text" : "password"}
													autoComplete="current-password"
													className="pr-10"
													{...field}
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0"
													onClick={() => setShowPassword((v) => !v)}
													aria-label={showPassword ? "Hide password" : "Show password"}
												>
													{showPassword ? (
														<EyeOff className="h-5 w-5" />
													) : (
														<Eye className="h-5 w-5" />
													)}
												</Button>
											</div>
										</FormControl>
										<p className="text-[10px] text-zinc-500">
											For advisors: if password is blank, default is your phone (last 10 digits).
										</p>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" className="w-full" disabled={loading}>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Sign In
							</Button>
						</form>
					</Form>
				</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
