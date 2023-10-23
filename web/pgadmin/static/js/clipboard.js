import pgAdmin from 'sources/pgadmin';

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch(err) {
    /* Suppress error */
    pgAdmin.Browser.notifier.error('Does not have clipboard access');
  }
  localStorage.setItem('clipboard', text);
}

export function getFromClipboard() {
  return localStorage.getItem('clipboard');
}
