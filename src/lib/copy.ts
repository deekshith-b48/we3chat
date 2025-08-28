export async function copyText(text: string): Promise<boolean> {
  // Prefer async Clipboard API if available and not blocked
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && 'writeText' in navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback: hidden textarea + execCommand('copy') within user gesture
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Avoid scrolling to bottom
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
