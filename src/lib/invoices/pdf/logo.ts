/** A decoded raster logo ready to embed with pdf-lib. */
export type LogoImage = { bytes: Uint8Array; format: "png" | "jpg" };

/** Max decoded logo size we will embed (defensive bound). */
export const MAX_LOGO_BYTES = 512 * 1024;

/**
 * Parse a `data:image/png|jpeg;base64,...` logo into bytes, or null if it is
 * absent/invalid/oversized. Only PNG and JPEG are supported (what pdf-lib embeds).
 */
export function parseLogoDataUrl(dataUrl: string | null | undefined): LogoImage | null {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return null;

  const [, mime, payload] = match;
  if (!mime || !payload) return null;
  const format: LogoImage["format"] = mime.toLowerCase().startsWith("jp") ? "jpg" : "png";

  try {
    const bytes = new Uint8Array(Buffer.from(payload.replace(/\s+/g, ""), "base64"));
    if (bytes.length === 0 || bytes.length > MAX_LOGO_BYTES) return null;
    return { bytes, format };
  } catch {
    return null;
  }
}
