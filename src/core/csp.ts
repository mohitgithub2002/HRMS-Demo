/**
 * Content Security Policy for every page: scripts only from this site with the per-request nonce made by the proxy,
 * so an injected <script> never runs. Inline `style` attributes are allowed (bar widths, brand colour) — they cannot
 * run code.
 */
export function contentSecurityPolicy(nonce: string, { dev, https }: { dev: boolean; https: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export const HSTS = "max-age=63072000; includeSubDomains";
