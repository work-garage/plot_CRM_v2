"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ReceiptViewButton } from "@/components/shared/receipt-view-button";

interface PaymentRowActionsProps {
  payment: any;
}

export function PaymentRowActions({ payment }: PaymentRowActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
      >
        <Receipt className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment</span>
            <div className="flex items-center gap-2">
              <ReceiptViewButton
                receiptPath={payment.receipt_path}
                title="Payment Receipt"
                variant="outline"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Date</span>
            <span className="font-medium">
              {formatDate(payment.payment_date)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Customer</span>
            <span className="font-medium">
              {payment.customers?.name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Project / Plot</span>
            <span className="font-medium text-right">
              {payment.plot_sales?.plots?.projects?.name ?? "—"}{" "}
              {payment.plot_sales?.plots?.plot_number
                ? `• ${payment.plot_sales.plots.plot_number}`
                : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Amount</span>
            <span className="font-bold">
              {formatCurrency(payment.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Mode</span>
            <span className="font-medium capitalize">
              {payment.payment_mode}
            </span>
          </div>
          {payment.slip_number && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Slip / Ref #</span>
              <span className="font-mono text-xs">
                {payment.slip_number}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Status</span>
            {payment.is_confirmed ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Confirmed
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                Pending
              </Badge>
            )}
          </div>
          {payment.notes && (
            <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 whitespace-pre-wrap">
              {payment.notes}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

