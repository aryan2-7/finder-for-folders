// Background worker: open links in a background tab (stay in the folder tab).
// Content scripts can't call chrome.tabs directly, and window.open() /
// anchor target=_blank from a file:// page either pop a new window or steal
// focus — so the content script messages us and we use tabs.create(active:false).

// Text previews: content scripts can't fetch() file:// URLs, but the worker
// can (same file:// host permission + "Allow access to file URLs"). Reads
// only the first maxBytes then cancels, so even huge logs cost nothing.
// NUL byte = binary (mislabeled file), reported as failure so the icon stays.
async function fetchHeadBytes(url, maxBytes) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("bad response");
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.length) {
      const room = maxBytes - total;
      if (value.length >= room) {
        chunks.push(value.slice(0, room));
        total += room;
        truncated = true;
        break;
      }
      chunks.push(value);
      total += value.length;
    }
    if (total >= maxBytes) {
      truncated = true;
      break;
    }
  }
  try {
    await reader.cancel();
  } catch (e) {
    // already closed, nothing to cancel
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return { buf, truncated };
}

async function fetchTextHead(url, maxBytes) {
  const { buf, truncated } = await fetchHeadBytes(url, maxBytes);
  if (buf.includes(0)) throw new Error("binary");
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(buf), truncated };
}

// empty/corrupt PDFs make Chrome's viewer render a "Failed to load PDF
// document" error bar inside the thumbnail — check the magic bytes first
// so those files just keep their icon
function looksLikePdf(buf) {
  if (buf.length < 5) return false;
  const head = new TextDecoder("latin1").decode(buf.slice(0, 1024));
  return head.trimStart().startsWith("%PDF-");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "finder-fetch-text") {
    if (typeof message.url !== "string") {
      sendResponse({ ok: false });
      return;
    }
    fetchTextHead(message.url, 64 * 1024).then(
      (r) => sendResponse({ ok: true, text: r.text, truncated: r.truncated }),
      () => sendResponse({ ok: false })
    );
    return true; // async response
  }

  if (message.type === "finder-check-pdf") {
    if (typeof message.url !== "string") {
      sendResponse({ ok: false });
      return;
    }
    fetchHeadBytes(message.url, 4096).then(
      (r) => sendResponse({ ok: true, valid: looksLikePdf(r.buf) }),
      () => sendResponse({ ok: false })
    );
    return true; // async response
  }

  if (message.type !== "finder-open-background-tab") return;
  if (typeof message.url !== "string") return;

  const createProps = { url: message.url, active: false };
  // open right next to the folder tab when we know where it is
  if (sender.tab && typeof sender.tab.index === "number") {
    createProps.index = sender.tab.index + 1;
  }
  chrome.tabs.create(createProps);
});
