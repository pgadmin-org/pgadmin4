import pgAdmin from 'sources/pgadmin';

/*
 * Resolves to whether the text reached the system clipboard. The text is also
 * cached in localStorage, which is what the Query Tool grid's Paste reads.
 * Pass cache: false for text that cannot be pasted back as rows, which clears
 * the cache instead so that Paste does not insert it. The cache is updated
 * before the system clipboard write starts, so that a Paste whilst the write
 * is pending never reads the previous copy's text.
 */
export async function copyToClipboard(text, {cache=true}={}) {
  cacheClipboardText(text, cache);
  let copied = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* Suppress error */
    pgAdmin.Browser.notifier.error('Does not have clipboard access');
    copied = false;
  }
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

function cacheClipboardText(text, cache=true) {
  try {
    if(cache) {
      localStorage.setItem('clipboard', text);
    } else {
      localStorage.removeItem('clipboard');
    }
  } catch {
    /* The cache is best effort, e.g. storage may be full or disabled */
  }
}

export function getFromClipboard() {
  return localStorage.getItem('clipboard');
}
