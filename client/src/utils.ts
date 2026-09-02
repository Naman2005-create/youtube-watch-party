// Small utility: generate a random alphanumeric string of `len` characters
export function nanoid(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Extract the 11-char YouTube video ID from a URL or return the string as-is */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  // Already an ID (11 chars, no slashes)
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    // youtu.be/<id>
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
    // youtube.com/watch?v=<id>
    const v = url.searchParams.get('v');
    if (v) return v;
    // youtube.com/embed/<id>
    const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
  } catch {
    /* not a valid URL */
  }
  return null;
}
