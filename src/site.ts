export function siteUrl(path: string, origin = import.meta.env?.VITE_SITE_URL) {
  if (!origin) return path
  try {
    const base = new URL(origin)
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return path
    return new URL(path, base).href
  } catch { return path }
}
