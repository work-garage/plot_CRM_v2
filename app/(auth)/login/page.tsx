"use client";

import { useState } from "react";
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
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema) as any,
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
			className="relative min-h-screen overflow-hidden bg-slate-950"
		>
			{/* Background image (login screen only) */}
			<div
				suppressHydrationWarning
				aria-hidden
				className="absolute inset-0 bg-cover bg-center"
				style={{ backgroundImage: "url('/bg.jpg')" }}
			/>
			<div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.75),rgba(15,23,42,0.45),rgba(255,255,255,0.08))]" />
			<div className="relative z-10 flex min-h-screen justify-center px-4 sm:px-12 lg:justify-start lg:px-20">
				<div className="flex w-full items-center py-12 sm:max-w-md lg:py-0">
					<Card
						suppressHydrationWarning
						className="w-full max-w-md border border-white/50 bg-white/84 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl"
					>
				<CardHeader className="space-y-4 text-center">
					<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,hsl(var(--primary)),#0f172a)] shadow-[0_20px_40px_-24px_rgba(37,99,235,0.85)]">
						<Building2 className="h-10 w-10 text-white" />
					</div>
					<div>
						<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
							Secure Access
						</p>
						<CardTitle className="text-2xl font-semibold">EstateFlow CRM</CardTitle>
						<CardDescription className="mt-2 text-sm leading-6">
							Sign in to manage customers, plots, payments, and advisor operations.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
													className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 p-0"
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
										<p className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-[11px] leading-5 text-zinc-500">
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
