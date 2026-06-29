// Creates a small JPEG thumbnail (data URL) from an image File so saved plants
// stay well within localStorage limits while still showing a recognizable photo.

export async function createThumbnail(
  file: File,
  maxSize = 240,
  quality = 0.7
): Promise<string | undefined> {
  try {
    const bitmapUrl = URL.createObjectURL(file);
    const img = await loadImage(bitmapUrl);
    URL.revokeObjectURL(bitmapUrl);

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return undefined;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
