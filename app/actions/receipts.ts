"use server";

import { createClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export type ReceiptResult = {
	success: boolean;
	url?: string;
	path?: string;
	sizeKb?: number;
	error?: string;
};

function formatCurrency(amount: number): string {
	// Standard PDF WinAnsi fonts do not support the rupee symbol reliably.
	return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatDate(d: string | null | undefined): string {
	if (!d) return "—";
	return new Date(d).toISOString().slice(0, 10);
}

export async function generateReceipt(saleId: string): Promise<ReceiptResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: sale, error: saleErr } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      sale_phase,
      token_date,
      agreement_date,
      total_sale_amount,
      down_payment,
      amount_paid,
      remaining_amount,
      monthly_emi,
      emi_day,
      sold_by_admin,
      plots(plot_number, size_sqft, projects(name, location)),
      customers(name, phone, address),
      advisors(name)
    `
		)
		.eq("id", saleId)
		.single();

	if (saleErr || !sale) {
		return { success: false, error: "Sale not found" };
	}

	const s = sale as any;
	const project = s.plots?.projects;
	const plot = s.plots;
	const customer = s.customers;
	const advisor = s.advisors;
	const soldBy = s.sold_by_admin ? "Admin (Direct)" : advisor?.name ?? "—";

	// Build a styled PDF bill with proper table layout
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595, 842]); // A4 portrait
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const { width, height } = page.getSize();
	let isFirstSection = true;

	// Watermark
	page.drawText("S-INFRA", {
		x: 170,
		y: 420,
		size: 72,
		font: fontBold,
		color: rgb(0.93, 0.94, 0.97),
		rotate: degrees(32),
	});

	// Header block
	page.drawRectangle({
		x: 0,
		y: height - 120,
		width,
		height: 120,
		color: rgb(0.08, 0.36, 0.62),
	});
	page.drawText("S-INFRA", {
		x: 38,
		y: height - 50,
		size: 24,
		font: fontBold,
		color: rgb(1, 1, 1),
	});
	page.drawText("Real Estate | Land & Plot Development", {
		x: 40,
		y: height - 74,
		size: 11,
		font,
		color: rgb(0.93, 0.98, 1),
	});
	page.drawText(`Receipt Ref: #${saleId.slice(0, 8).toUpperCase()}`, {
		x: width - 220,
		y: height - 52,
		size: 10,
		font: fontBold,
		color: rgb(1, 1, 1),
	});
	page.drawText(`Date: ${formatDate(s.token_date || s.agreement_date)}`, {
		x: width - 220,
		y: height - 70,
		size: 10,
		font,
		color: rgb(0.95, 0.98, 1),
	});

	// Exact app icon (from favicon.svg) in header top-right.
	const logoScale = 1.05;
	const logoX = width - 108;
	const logoY = height - 76;
	const logoStroke = {
		borderColor: rgb(1, 1, 1),
		borderWidth: 1.4,
		scale: logoScale,
		x: logoX,
		y: logoY,
	};
	page.drawSvgPath("M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", logoStroke);
	page.drawSvgPath("M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", logoStroke);
	page.drawSvgPath("M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", logoStroke);
	page.drawSvgPath("M10 6h4", logoStroke);
	page.drawSvgPath("M10 10h4", logoStroke);
	page.drawSvgPath("M10 14h4", logoStroke);
	page.drawSvgPath("M10 18h4", logoStroke);

	const left = 36;
	let y = height - 146;
	const tableWidth = width - 72;
	const col1 = 170;
	const rowHeight = 23;

	const drawTable = (
		title: string,
		rows: Array<{ key: string; value: string; strong?: boolean }>
	) => {
		// Add extra breathing space between table sections to avoid visual sticking.
		if (!isFirstSection) y -= 8;

		// Section title bar
		page.drawRectangle({
			x: left,
			y: y - 2,
			width: tableWidth,
			height: 20,
			color: rgb(0.93, 0.95, 0.98),
		});
		page.drawText(title, {
			x: left + 8,
			y: y + 3,
			size: 11,
			font: fontBold,
			color: rgb(0.12, 0.2, 0.34),
		});
		y -= 24;

		// Outer border
		const bodyHeight = rows.length * rowHeight;
		page.drawRectangle({
			x: left,
			y: y - bodyHeight,
			width: tableWidth,
			height: bodyHeight,
			borderColor: rgb(0.84, 0.87, 0.91),
			borderWidth: 1,
		});

		// Vertical column divider
		page.drawLine({
			start: { x: left + col1, y },
			end: { x: left + col1, y: y - bodyHeight },
			thickness: 1,
			color: rgb(0.88, 0.9, 0.93),
		});

		for (let i = 0; i < rows.length; i++) {
			const rowYTop = y - i * rowHeight;
			const textY = rowYTop - 15;
			const r = rows[i];

			// Horizontal divider
			if (i > 0) {
				page.drawLine({
					start: { x: left, y: rowYTop },
					end: { x: left + tableWidth, y: rowYTop },
					thickness: 1,
					color: rgb(0.9, 0.92, 0.95),
				});
			}

			page.drawText(r.key, {
				x: left + 8,
				y: textY,
				size: 10.2,
				font,
				color: rgb(0.35, 0.39, 0.45),
			});
			page.drawText(r.value, {
				x: left + col1 + 8,
				y: textY,
				size: 10.2,
				font: r.strong ? fontBold : font,
				color: rgb(0.12, 0.12, 0.12),
			});
		}

		y -= bodyHeight + 18;
		isFirstSection = false;
	};

	drawTable("Customer Details", [
		{ key: "Name", value: customer?.name ?? "—" },
		{ key: "Phone", value: customer?.phone ?? "—" },
		{ key: "Address", value: customer?.address ?? "—" },
	]);

	drawTable("Transaction Details", [
		{ key: "Project", value: `${project?.name ?? "—"}${project?.location ? `, ${project.location}` : ""}` },
		{ key: "Plot", value: `${plot?.plot_number ?? "—"} (${plot?.size_sqft ?? "—"} sqft)` },
		{ key: "Phase", value: String(s.sale_phase ?? "").replace("_", " ") },
		{ key: "Token Date", value: formatDate(s.token_date) },
		{ key: "Agreement Date", value: formatDate(s.agreement_date) },
		{ key: "Sold By", value: soldBy },
	]);

	const paymentRows: Array<{ key: string; value: string; strong?: boolean }> = [
		{ key: "Total Sale Amount", value: formatCurrency(Number(s.total_sale_amount ?? 0)) },
		{ key: "Down Payment", value: formatCurrency(Number(s.down_payment ?? 0)) },
		{ key: "Amount Paid", value: formatCurrency(Number(s.amount_paid ?? 0)) },
		{ key: "Remaining Amount", value: formatCurrency(Number(s.remaining_amount ?? 0)), strong: true },
	];
	if (s.monthly_emi) {
		paymentRows.push({
			key: "Monthly EMI",
			value: `${formatCurrency(Number(s.monthly_emi))} (Day ${s.emi_day ?? "—"})`,
		});
	}
	drawTable("Payment Summary", paymentRows);

	drawTable("Terms & Conditions", [
		{ key: "•", value: "This is a computer-generated receipt and does not require signature." },
		{ key: "•", value: "Please preserve this receipt for your records." },
		{ key: "•", value: "For any queries, contact S-Infra." },
		{ key: "Sale ID", value: saleId, strong: true },
	]);

	// Footer strip
	page.drawRectangle({
		x: 0,
		y: 0,
		width,
		height: 40,
		color: rgb(0.97, 0.97, 0.98),
	});
	page.drawText("Online copy of bill", {
		x: 42,
		y: 15,
		size: 9,
		font,
		color: rgb(0.55, 0.58, 0.62),
	});
	page.drawText("Generated by S-Infra CRM", {
		x: width - 184,
		y: 15,
		size: 9,
		font,
		color: rgb(0.55, 0.58, 0.62),
	});

	const pdfBytes = await pdfDoc.save({
		useObjectStreams: true,
	});
	const sizeKb = Math.ceil((pdfBytes.byteLength / 1024) * 10) / 10;
	if (pdfBytes.byteLength > 100 * 1024) {
		return {
			success: false,
			error: `Generated PDF is ${sizeKb} KB, which exceeds 100 KB limit.`,
		};
	}
	const path = `sale-receipts/${saleId}-${Date.now()}.pdf`;

	const { error: uploadErr } = await supabase.storage
		.from("receipts")
		.upload(path, pdfBytes, {
			contentType: "application/pdf",
			cacheControl: "31536000",
			upsert: false,
		});

	if (uploadErr) {
		return { success: false, error: uploadErr.message };
	}

	const { error: updateErr } = await supabase
		.from("plot_sales")
		.update({ receipt_path: path })
		.eq("id", saleId);

	if (updateErr) {
		return { success: false, error: updateErr.message };
	}

	const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
	return { success: true, url: urlData.publicUrl, path, sizeKb };
}

export async function getReceiptUrl(saleId: string): Promise<string | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("plot_sales")
		.select("receipt_path")
		.eq("id", saleId)
		.single();

	if (error || !(data as any)?.receipt_path) return null;
	const path = (data as any).receipt_path;
	const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
	return urlData.publicUrl;
}

export async function getReceiptUrlByPath(path: string): Promise<string | null> {
	const supabase = await createClient();
	if (!supabase || !path) return null;
	const { data } = supabase.storage.from("receipts").getPublicUrl(path);
	return data.publicUrl;
}
