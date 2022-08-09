export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* Suppress error */
    console.error('Does not have clipboard acccess');
  }
  localStorage.setItem('clipboard', text);
}

export function getFromClipboard() {
  return localStorage.getItem('clipboard');
}
