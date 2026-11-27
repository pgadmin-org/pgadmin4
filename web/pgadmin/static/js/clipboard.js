import pgAdmin from 'sources/pgadmin';

// Resolves to whether the text reached the system clipboard.
export async function copyToClipboard(text) {
  let copied = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* Suppress error */
    pgAdmin.Browser.notifier.error('Does not have clipboard access');
    copied = false;
  }
  try {
    localStorage.setItem('clipboard', text);
  } catch {
    /* The cache is best effort, e.g. storage may be full or disabled */
  }
  return copied;
}

export function getFromClipboard() {
  return localStorage.getItem('clipboard');
}
