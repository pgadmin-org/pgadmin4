import Notifier from './helpers/Notifier';

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch(err) {
    /* Suppress error */
    Notifier.error('Does not have clipboard access');
  }
  localStorage.setItem('clipboard', text);
}

export function getFromClipboard() {
  return localStorage.getItem('clipboard');
}
