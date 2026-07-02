/**
 * Dynamically resolves the application's base site URL.
 * 
 * Resolution Precedence:
 * 1. process.env.NEXT_PUBLIC_SITE_URL (if set)
 * 2. x-forwarded-proto + x-forwarded-host / host headers from request (if present and safe)
 * 3. http://localhost:3000 (development fallback)
 * 
 * @param req Optional standard Request or NextRequest object
 */
export function getSiteUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (req && req.headers) {
    try {
      let host: string | null = null;
      let proto: string | null = null;

      if (typeof req.headers.get === "function") {
        host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        proto = req.headers.get("x-forwarded-proto");
      } else {
        const headersObj = req.headers as any;
        host = headersObj["x-forwarded-host"] || headersObj["host"];
        proto = headersObj["x-forwarded-proto"];
      }

      if (host) {
        const resolvedProto = proto 
          ? proto.split(",")[0].trim() 
          : (host.includes("localhost") ? "http" : "https");
        return `${resolvedProto}://${host}`;
      }
    } catch (error) {
      console.warn("[getSiteUrl] Failed to extract host/proto headers:", error);
    }
  }

  return "http://localhost:3000";
}
