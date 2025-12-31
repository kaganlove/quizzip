export function stripHtml(html: string): string {
  // Small, safe-ish helper for MVP exports. Improve later with a real sanitizer.
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/?p\s*>/gi, "\n")
    .replace(/<\s*img[^>]*alt=["\']?([^"\'>]*)["\']?[^>]*>/gi, " [Image: $1] ")
    .replace(/<\s*img[^>]*>/gi, " [Image] ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toAlpha(i: number): string {
  return String.fromCharCode("A".charCodeAt(0) + i);
}
