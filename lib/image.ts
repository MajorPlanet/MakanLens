// Resize to max 1024 px JPEG (0.8), return base64 without the data: prefix.
const MAX = 1024;

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("We couldn't read that photo. HEIC files aren't supported in every browser, so try a JPEG or PNG instead.");
  }
}

export async function resizeImage(file: File): Promise<string> {
  const { src, w, h, close } = await decode(file);
  try {
    if (!w || !h) throw new Error("That photo looks empty. Please try another one.");
    const scale = Math.min(1, MAX / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't process the photo.");
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const comma = dataUrl.indexOf(",");
    if (comma < 0) throw new Error("Your browser couldn't process the photo.");
    return dataUrl.slice(comma + 1);
  } finally {
    close();
  }
}
