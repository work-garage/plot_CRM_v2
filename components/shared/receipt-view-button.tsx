"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ReceiptViewer } from "@/components/shared/receipt-viewer";

export function ReceiptViewButton({
  receiptPath,
  title = "Receipt",
  bucket = "receipts",
  variant = "ghost",
}: {
  receiptPath?: string | null;
  title?: string;
  bucket?: string;
  variant?: "ghost" | "outline" | "default";
}) {
  const [open, setOpen] = useState(false);

  const url = useMemo(() => {
    if (!receiptPath) return "";
    const supabase = createClient();
    return supabase.storage.from(bucket).getPublicUrl(receiptPath).data.publicUrl;
  }, [bucket, receiptPath]);

  if (!receiptPath) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={variant}
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="View receipt"
      >
        <Receipt className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">{title}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogTitle>
        </DialogHeader>
        <ReceiptViewer receiptPath={receiptPath} title={title} bucket={bucket} />
      </DialogContent>
    </Dialog>
  );
}

