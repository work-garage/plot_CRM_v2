"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button, Input, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { compressImageToTarget } from "@/lib/utils/image";

type Props = {
  label?: string;
  bucket?: string;
  folder: string; // e.g. "payments" or "expenses"
  recordId: string; // uuid you generate on client
  value?: string; // receipt_path
  onChange: (path: string) => void;
};

export function ReceiptUpload({
  label = "Receipt image (optional)",
  bucket = "receipts",
  folder,
  recordId,
  value,
  onChange,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const publicUrl = useMemo(() => {
    if (!value) return "";
    const supabase = createClient();
    return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
  }, [bucket, value]);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImageToTarget(file, {
        maxBytes: 150 * 1024, // "few KB" is unrealistic for receipts; keep it small but readable
        maxWidth: 1600,
        maxHeight: 1600,
        mimeType: "image/webp",
      });

      const supabase = createClient();
      const path = `${folder}/${recordId}/${Date.now()}.webp`;
      const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
        contentType: "image/webp",
        upsert: true,
      });

      if (error) throw error;
      onChange(path);
      toast.success("Receipt uploaded");
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message || String(e) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        {value ? (
          <Badge variant="secondary" className="text-[10px]">
            Attached
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            Optional
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => onChange("")}
            disabled={uploading}
            title="Remove receipt"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled
            title="No receipt attached"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </div>

      {value && publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Preview receipt
        </a>
      )}

      {uploading && <div className="text-xs text-zinc-500">Uploading…</div>}
    </div>
  );
}

