// Worker opens background tabs and fetches file:// bytes for previews.
// Content scripts cannot call chrome.tabs or fetch file:// URLs directly.
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

// Reject non-PDF bytes so empty or corrupt files keep their icon.
function looksLikePdf(buf) {
  if (buf.length < 5) return false;
  const head = new TextDecoder("latin1").decode(buf.slice(0, 1024));
  return head.trimStart().startsWith("%PDF-");
}

function uint8ToBase64(bytes) {
  if (typeof bytes.toBase64 === "function") {
    return bytes.toBase64();
  }
  let binary = "";
  const len = bytes.byteLength;
  const chunk = 0x8000;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, len)));
  }
  return btoa(binary);
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
    return true;
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
    return true;
  }

  if (message.type === "finder-fetch-pdf") {
    if (typeof message.url !== "string") {
      sendResponse({ ok: false });
      return;
    }
    // Base64 is used because extension messages serialize through JSON.
    fetchHeadBytes(message.url, 15 * 1024 * 1024).then(
      (r) => sendResponse({ ok: true, base64: uint8ToBase64(r.buf), truncated: r.truncated }),
      () => sendResponse({ ok: false })
    );
    return true;
  }

  if (message.type !== "finder-open-background-tab" && message.type !== "finder-open-background-tabs") return;
  if (message.type === "finder-open-background-tabs") {
    if (!Array.isArray(message.urls)) return;
    const urls = message.urls.filter((u) => typeof u === "string");
    if (urls.length === 0) return;
    const baseIndex = sender.tab && typeof sender.tab.index === "number" ? sender.tab.index + 1 : undefined;
    urls.forEach((url, i) => {
      const props = { url, active: false };
      if (baseIndex !== undefined) props.index = baseIndex + i;
      chrome.tabs.create(props);
    });
    return;
  }
  if (typeof message.url !== "string") return;

  const createProps = { url: message.url, active: false };
  if (sender.tab && typeof sender.tab.index === "number") {
    createProps.index = sender.tab.index + 1;
  }
  chrome.tabs.create(createProps);
});
