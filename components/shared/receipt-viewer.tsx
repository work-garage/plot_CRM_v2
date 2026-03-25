"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function ReceiptViewer({
  receiptPath,
  title = "Receipt",
  bucket = "receipts",
}: {
  receiptPath?: string | null;
  title?: string;
  bucket?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const isPdf = (filename || receiptPath || "").toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let mounted = true;
    async function loadSignedUrl() {
      if (!receiptPath) {
        setUrl("");
        setFilename("");
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(receiptPath, 60 * 60);

        // Debug to verify we're using the correct bucket/path
        console.debug("[ReceiptViewer] signedUrl", {
          bucket,
          receiptPath,
          hasSignedUrl: !!data?.signedUrl,
          error: error?.message ?? null,
        });

        if (!mounted) return;
        if (error || !data?.signedUrl) {
          setUrl("");
          setFilename(receiptPath.split("/").pop() || "receipt");
          return;
        }

        setUrl(data.signedUrl);
        setFilename(receiptPath.split("/").pop() || "receipt");
      } catch (e) {
        if (!mounted) return;
        console.debug("[ReceiptViewer] signedUrl exception", e);
        setUrl("");
        setFilename(receiptPath.split("/").pop() || "receipt");
      }
    }

    loadSignedUrl();
    return () => {
      mounted = false;
    };
  }, [bucket, receiptPath]);

  async function handleDownload() {
    if (!url || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || "receipt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
    }
  }

  function handleOpenInNewTab() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!receiptPath) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        No receipt attached.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {isPdf ? "PDF" : "Image"}
        </Badge>
      </div>

      {url ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm text-zinc-600 mb-3">
            Preview is disabled here. Open the receipt in a new tab.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View {isPdf ? "PDF" : "File"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Downloading…" : "Download"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500">Receipt not available.</div>
      )}
    </div>
  );
}

