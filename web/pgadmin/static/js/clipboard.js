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
  cacheClipboardText(text);
  return copied;
}

/*
 * Copy text that is not known yet, such as text built from a server
 * response, given a promise of it. Safari only allows a clipboard write made
 * within the user's click, which has ended by the time a request completes,
 * so where the browser supports it the write starts now, with the text to
 * follow. Resolves as copyToClipboard() does, or rejects with the error the
 * text's promise rejected with, in which case nothing is copied.
 */
export async function copyPromisedTextToClipboard(textPromise) {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    return copyToClipboard(await textPromise);
  }
  // The text's own failure is reported from here rather than as the write's.
  textPromise.catch(()=>{/* handled below */});
  let copied = true;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/plain': textPromise.then((text)=>new Blob([text], {type: 'text/plain'})),
    })]);
  } catch {
    copied = false;
  }
  const text = await textPromise;
  if (!copied) {
    pgAdmin.Browser.notifier.error('Does not have clipboard access');
  }
  cacheClipboardText(text);
  return copied;
}

function cacheClipboardText(text) {
  try {
    localStorage.setItem('clipboard', text);
  } catch {
    /* The cache is best effort, e.g. storage may be full or disabled */
  }
}

export function getFromClipboard() {
  return localStorage.getItem('clipboard');
}
