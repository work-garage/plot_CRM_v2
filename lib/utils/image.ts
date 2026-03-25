export async function compressImageToTarget(
  file: File,
  {
    maxBytes = 150 * 1024,
    maxWidth = 1600,
    maxHeight = 1600,
    mimeType = "image/webp",
  }: {
    maxBytes?: number;
    maxWidth?: number;
    maxHeight?: number;
    mimeType?: "image/webp" | "image/jpeg";
  } = {}
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const { width, height } = fitWithin(img.width, img.height, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, width, height);

  // Try decreasing quality until we hit target
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  while (blob.size > maxBytes && quality > 0.35) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  // If still too big, downscale further
  while (blob.size > maxBytes && canvas.width > 900) {
    canvas.width = Math.floor(canvas.width * 0.85);
    canvas.height = Math.floor(canvas.height * 0.85);
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) break;
    ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
    quality = Math.max(quality - 0.05, 0.35);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  return blob;
}

function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("Failed to encode image"));
        else resolve(b);
      },
      type,
      quality
    );
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    img.src = url;
  });
}

