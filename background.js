// Background worker: open links in a background tab (stay in the folder tab).
// Content scripts can't call chrome.tabs directly, and window.open() /
// anchor target=_blank from a file:// page either pop a new window or steal
// focus — so the content script messages us and we use tabs.create(active:false).
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "finder-open-background-tab") return;
  if (typeof message.url !== "string") return;

  const createProps = { url: message.url, active: false };
  // open right next to the folder tab when we know where it is
  if (sender.tab && typeof sender.tab.index === "number") {
    createProps.index = sender.tab.index + 1;
  }
  chrome.tabs.create(createProps);
});
