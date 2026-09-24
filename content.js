(function () {
  "use strict";

  // works only if its a "Index of" table page
  const titleLooksRight = document.title.startsWith("Index of");
  const table = document.querySelector("table#list") || document.querySelector("table");
  if (!titleLooksRight || !table) {
    return;
  }

  // pull name/href/isDir out of the table links
  const anchors = Array.from(table.querySelectorAll("a[href]"));

  const entries = anchors
    .map((a) => {
      const href = a.getAttribute("href");
      if (!href) return null;

      let name = a.textContent.trim();
      const isDir = href.endsWith("/");
      if (isDir && name.endsWith("/")) name = name.slice(0, -1);

      // skip parent dir row, we make our own breadcrumbs
      if (name === "[parent directory]" || href === "../") return null;

      const ext = isDir ? "" : (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
      const isHidden = name.startsWith(".");

      return { name, href, isDir, ext, isHidden };
    })
    .filter(Boolean);

  if (entries.length === 0) {
    // empty folder is fine, grid shows empty state below
  }

  // icons mappinh
  const ICONS = {
    folder: "folder",
    pdf: "pdf",
    image: "image",
    video: "video",
    code: "code",
    archive: "archive",
    file: "file",
  };

  const EXT_MAP = {
    pdf: ICONS.pdf,
    png: ICONS.image, jpg: ICONS.image, jpeg: ICONS.image, gif: ICONS.image,
    webp: ICONS.image, svg: ICONS.image, heic: ICONS.image,
    mp4: ICONS.video, mov: ICONS.video, mkv: ICONS.video, webm: ICONS.video,
    avi: ICONS.video, m4v: ICONS.video,
    js: ICONS.code, ts: ICONS.code, py: ICONS.code, cpp: ICONS.code, c: ICONS.code,
    h: ICONS.code, java: ICONS.code, html: ICONS.code, css: ICONS.code, json: ICONS.code,
    zip: ICONS.archive, tar: ICONS.archive, gz: ICONS.archive, rar: ICONS.archive, "7z": ICONS.archive,
  };

  function iconFor(entry) {
    if (entry.isDir) return ICONS.folder;
    return EXT_MAP[entry.ext] || ICONS.file;
  }

  // Inline SVGs for efficiency (they be in there, swimming and stuff)
  const SVG = {
    folder: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 6.5C3 5.67 3.67 5 4.5 5H9l2 2h8.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-15C3.67 19 3 18.33 3 17.5v-11Z" fill="#5AB1FF" stroke="#2F7AC7" stroke-width="0.7" stroke-linejoin="round"/><path d="M3 6.5C3 5.67 3.67 5 4.5 5H9l2 2h8.5c.83 0 1.5.67 1.5 1.5V9H3V6.5Z" fill="#8FCBFF"/></svg>`,
    pdf: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 2.5c0-.55.45-1 1-1h6.5L19 8v13.5c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V2.5Z" fill="#EC3A35" stroke="#A9231F" stroke-width="0.7" stroke-linejoin="round"/><path d="M12.5 1.5L19 8h-5.5c-.55 0-1-.45-1-1V1.5Z" fill="#FF9B96"/><text x="12" y="17.4" font-size="5.4" fill="#fff" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" letter-spacing="0.3">PDF</text></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="3" fill="#FFD24C" stroke="#B98A12" stroke-width="0.7"/><circle cx="8.5" cy="10" r="2" fill="#fff"/><path d="M4 18l5-5 4 4 3-3 4 4v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1Z" fill="#fff"/></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" fill="#3A4152" stroke="#1E222C" stroke-width="0.7"/><path d="M10.2 9.3v5.4L14.8 12l-4.6-2.7Z" fill="#fff" stroke="#fff" stroke-width="1" stroke-linejoin="round"/><rect x="6" y="15.8" width="12" height="1.4" rx="0.7" fill="#5A6376"/><rect x="6" y="15.8" width="5" height="1.4" rx="0.7" fill="#FF5A5A"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#8E6BFF" stroke="#5B3FD4" stroke-width="0.7"/><path d="M9.2 8.5 6.5 12l2.7 3.5M14.8 8.5 17.5 12l-2.7 3.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    archive: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="#C9A15A" stroke="#7A5E2B" stroke-width="0.7"/><rect x="10.5" y="5" width="3" height="15" fill="#8C6C33"/><rect x="3.5" y="9" width="17" height="1.2" fill="#8C6C33" opacity="0.65"/><rect x="9.7" y="11.2" width="4.6" height="3.4" rx="0.8" fill="#E8D9B0" stroke="#7A5E2B" stroke-width="0.6"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 2.5c0-.55.45-1 1-1h6.5L19 8v13.5c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V2.5Z" fill="#D9DDE3" stroke="#9AA1AB" stroke-width="0.7" stroke-linejoin="round"/><path d="M12.5 1.5L19 8h-5.5c-.55 0-1-.45-1-1V1.5Z" fill="#F4F6F8"/><path d="M8 13h8M8 15.7h8M8 18.4h5" stroke="#9AA1AB" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  };

  // wipe body and render our finder UI
  document.body.innerHTML = "";
  document.body.classList.add("finder-body");

  // build breadcrumbs from the URL path
  const path = decodeURIComponent(location.pathname);
  const segments = path.split("/").filter(Boolean);

  const bar = document.createElement("div");
  bar.className = "finder-titlebar";
  const crumbs = document.createElement("div");
  crumbs.className = "finder-breadcrumb";

  let acc = "";
  const rootCrumb = document.createElement("a");
  rootCrumb.href = "file:///";
  rootCrumb.textContent = "/";
  crumbs.appendChild(rootCrumb);

  segments.forEach((seg, i) => {
    acc += "/" + seg;
    const sep = document.createElement("span");
    sep.textContent = " \u203a ";
    sep.className = "finder-sep";
    crumbs.appendChild(sep);

    const link = document.createElement("a");
    link.href = "file://" + encodeURI(acc) + "/";
    link.textContent = seg;
    crumbs.appendChild(link);
  });

  // sort menu, stashed in localStorage so it sticks across folders
  const SORT_MODES = {
    "name": "Name",
    "type-name": "Type",
    "files-first": "Files first",
  };
  let sortMode = localStorage.getItem("finderSortMode") || "name";
  if (!SORT_MODES[sortMode]) sortMode = "name";

  // hidden files (dotfiles like .DS_Store) stay off by default
  let showHidden = localStorage.getItem("finderShowHidden") === "true";

  // case-insensitive name compare (with a case-sensitive tiebreak so order is stable)
  function cmpNames(a, b) {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) ||
      a.name.localeCompare(b.name, undefined, { numeric: true });
  }

  function sortEntries(list) {
    const sorted = list.slice();
    if (sortMode === "name") {
      sorted.sort(cmpNames);
    } else if (sortMode === "files-first") {
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? 1 : -1;
        return cmpNames(a, b);
      });
    } else {
      // type: folders first, then group by icon kind, then extension, then name
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        const ka = iconFor(a), kb = iconFor(b);
        if (ka !== kb) return ka.localeCompare(kb);
        if (a.ext !== b.ext) return a.ext.localeCompare(b.ext);
        return cmpNames(a, b);
      });
    }
    return sorted;
  }

  // settings menu top right, just a lil dropdown for sort mode and hidden files toggle
  const settingsWrap = document.createElement("div");
  settingsWrap.className = "finder-settings";

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "finder-settings-btn";
  settingsBtn.type = "button";
  settingsBtn.textContent = "\u2699"; // gear icon
  settingsBtn.setAttribute("aria-label", "Sort settings");

  const menu = document.createElement("div");
  menu.className = "finder-settings-menu";
  menu.hidden = true;

  const menuHeading = document.createElement("div");
  menuHeading.className = "finder-settings-heading";
  menuHeading.textContent = "Sort by";
  menu.appendChild(menuHeading);

  Object.keys(SORT_MODES).forEach((mode) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "finder-settings-item finder-settings-toggle";
    if (mode === sortMode) item.classList.add("active");

    const itemLabel = document.createElement("span");
    itemLabel.textContent = SORT_MODES[mode];
    const itemCheck = document.createElement("span");
    itemCheck.className = "finder-settings-checkmark";
    itemCheck.textContent = "✓";
    item.appendChild(itemLabel);
    item.appendChild(itemCheck);

    item.addEventListener("click", () => {
      sortMode = mode;
      localStorage.setItem("finderSortMode", sortMode);
      // for the chosen settings to persist
      menu.querySelectorAll(".finder-settings-item").forEach((el) => {
        el.classList.toggle("active", el === item);
      });
      menu.hidden = true;
      renderGrid();
    });
    menu.appendChild(item);
  });

  const hiddenDivider = document.createElement("div");
  hiddenDivider.className = "finder-settings-divider";
  menu.appendChild(hiddenDivider);

  const hiddenToggle = document.createElement("button");
  hiddenToggle.type = "button";
  hiddenToggle.className = "finder-settings-item finder-settings-toggle";
  if (showHidden) hiddenToggle.classList.add("active");

  const hiddenToggleLabel = document.createElement("span");
  hiddenToggleLabel.textContent = "Show hidden files";
  const hiddenToggleCheck = document.createElement("span");
  hiddenToggleCheck.className = "finder-settings-checkmark";
  hiddenToggleCheck.textContent = "\u2713";

  hiddenToggle.appendChild(hiddenToggleLabel);
  hiddenToggle.appendChild(hiddenToggleCheck);

  function setShowHidden(value) {
    showHidden = value;
    localStorage.setItem("finderShowHidden", String(showHidden));
    hiddenToggle.classList.toggle("active", showHidden);
    renderGrid();
  }

  hiddenToggle.addEventListener("click", () => {
    setShowHidden(!showHidden);
  });
  menu.appendChild(hiddenToggle);

  // icon size slider, kept in localStorage same as the other settings
  const sizeDivider = document.createElement("div");
  sizeDivider.className = "finder-settings-divider";
  menu.appendChild(sizeDivider);

  const MIN_ICON = 48;
  const MAX_ICON = 256;
  const DEFAULT_ICON = 125;
  let iconSize = parseInt(localStorage.getItem("finderIconSize"), 10);
  if (!iconSize || iconSize < MIN_ICON || iconSize > MAX_ICON) iconSize = DEFAULT_ICON;

  const sizeRow = document.createElement("div");
  sizeRow.className = "finder-settings-slider-row";

  const sizeHeading = document.createElement("div");
  sizeHeading.className = "finder-settings-heading";
  sizeHeading.textContent = "Icon size";
  sizeRow.appendChild(sizeHeading);

  const sizeSlider = document.createElement("input");
  sizeSlider.type = "range";
  sizeSlider.className = "finder-settings-slider";
  sizeSlider.min = String(MIN_ICON);
  sizeSlider.max = String(MAX_ICON);
  sizeSlider.value = String(iconSize);
  sizeSlider.setAttribute("aria-label", "Icon size");
  sizeRow.appendChild(sizeSlider);
  menu.appendChild(sizeRow);

  function setIconSize(value) {
    iconSize = value;
    localStorage.setItem("finderIconSize", String(iconSize));
    document.body.style.setProperty("--icon-size", iconSize + "px");
  }

  // apply on load and live-update while dragging
  setIconSize(iconSize);
  sizeSlider.addEventListener("input", () => {
    setIconSize(parseInt(sizeSlider.value, 10));
  });
  // slider drag shouldn't close the menu like the other items do
  sizeSlider.addEventListener("click", (e) => e.stopPropagation());
  sizeSlider.addEventListener("mousedown", (e) => e.stopPropagation());

  const menuDivider = document.createElement("div");
  menuDivider.className = "finder-settings-divider";
  menu.appendChild(menuDivider);

  const repoLink = document.createElement("a");
  repoLink.className = "finder-settings-item finder-settings-link";
  repoLink.href = "https://github.com/aryan2-7/finder-for-folders";
  repoLink.target = "_blank";
  repoLink.rel = "noopener noreferrer";
  repoLink.textContent = "View on GitHub \u2197";
  menu.appendChild(repoLink);

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  document.addEventListener("click", () => {
    menu.hidden = true;
  });

  settingsWrap.appendChild(settingsBtn);
  settingsWrap.appendChild(menu);
  bar.appendChild(crumbs);
  bar.appendChild(settingsWrap);
  document.body.appendChild(bar);

  let grid = document.createElement("div");
  grid.className = "finder-grid";
  document.body.appendChild(grid);

  let selected = null;

  // Background-tab, the scripts can't use chrome.tabs, new window or opens in same tab, so we use background.js after chrome.tabs.create(active:false)
  function openInBackgroundTab(href) {
    const url = new URL(href, location.href).href;
    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        const result = chrome.runtime.sendMessage({
          type: "finder-open-background-tab",
          url,
        });
        // MV3 sendMessage returns a promise; a rejection means no listener
        if (result && typeof result.catch === "function") {
          result.catch(() => fallbackForegroundTab(url));
        }
        return;
      }
    } catch (e) {
      // fall through to anchor fallback
    }
    fallbackForegroundTab(url);
  }

  function fallbackForegroundTab(url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // right-click context menu — "Open", "Open in new tab", "Copy link", built fresh per tile
  const ctxMenu = document.createElement("div");
  ctxMenu.className = "finder-context-menu";
  ctxMenu.hidden = true;
  document.body.appendChild(ctxMenu);

  function closeCtxMenu() {
    ctxMenu.hidden = true;
  }

  function addCtxItem(label, onClick) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "finder-settings-item";
    item.textContent = label;
    item.addEventListener("click", () => {
      closeCtxMenu();
      onClick();
    });
    ctxMenu.appendChild(item);
    return item;
  }

  function openCtxMenu(tile, x, y) {
    ctxMenu.innerHTML = "";

    addCtxItem("Open", () => {
      window.location.href = tile.href;
    });
    addCtxItem("Open in new tab", () => {
      openInBackgroundTab(tile.href);
    });
    addCtxItem("Copy link", () => {
      const url = new URL(tile.href, location.href).href;
      navigator.clipboard.writeText(url).catch(() => {
        // clipboard API needs a secure context/permission, silently ignore if it's blocked
      });
    });

    ctxMenu.hidden = false;

    // keep it on-screen, same clamp idea as a native right-click menu
    const menuRect = ctxMenu.getBoundingClientRect();
    const maxX = window.innerWidth - menuRect.width - 4;
    const maxY = window.innerHeight - menuRect.height - 4;
    ctxMenu.style.left = Math.min(x, maxX) + "px";
    ctxMenu.style.top = Math.min(y, maxY) + "px";
  }

  document.addEventListener("click", closeCtxMenu);
  document.addEventListener("scroll", closeCtxMenu, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCtxMenu();
  });

  // builds the tile grid using the current sortMode
  function renderGrid() {
    const freshGrid = document.createElement("div");
    freshGrid.className = "finder-grid";
    selected = null;

    const visible = showHidden ? entries : entries.filter((e) => !e.isHidden);

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "finder-empty";
      empty.textContent = "This folder is empty";
      freshGrid.appendChild(empty);
    }

    sortEntries(visible).forEach((entry) => {
      const tile = document.createElement("a");
      tile.className = "finder-tile";
      tile.href = entry.href;

      const iconWrap = document.createElement("div");
      iconWrap.className = "finder-icon";
      iconWrap.innerHTML = SVG[iconFor(entry)];

      const label = document.createElement("div");
      label.className = "finder-label";
      label.textContent = entry.name;

      tile.appendChild(iconWrap);
      tile.appendChild(label);

      // Single click selects; Cmd/Ctrl+click opens in a background tab
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        if (selected) selected.classList.remove("selected");
        tile.classList.add("selected");
        selected = tile;
        if (e.ctrlKey || e.metaKey) {
          openInBackgroundTab(tile.href);
        }
      });

      tile.addEventListener("dblclick", (e) => {
        e.preventDefault();
        // Shift+double-click opens in a background tab, same as Shift+Enter
        if (e.shiftKey) {
          openInBackgroundTab(tile.href);
        } else {
          window.location.href = tile.href;
        }
      });

      // right-click selects the tile too, feels more native than leaving selection untouched
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (selected) selected.classList.remove("selected");
        tile.classList.add("selected");
        selected = tile;
        openCtxMenu(tile, e.clientX, e.clientY);
      });

      freshGrid.appendChild(tile);
    });

    grid.replaceWith(freshGrid);
    grid = freshGrid;
  }

  renderGrid();

  // Cmd(or Ctrl)+Shift+. toggles hidden files
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === "Period" || e.key === "." || e.key === ">")) {
      e.preventDefault();
      setShowHidden(!showHidden);
    }
  });

  // Basic keyboard nav with arrow keys and Enter to move and open
  const tiles = () => Array.from(grid.querySelectorAll(".finder-tile"));
  document.addEventListener("keydown", (e) => {
    // Cmd/Ctrl+Left/Right is browser back/forward, don't override
    if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      return;
    }

    const list = tiles();
    if (list.length === 0) return;
    let idx = selected ? list.indexOf(selected) : -1;

    // column count has to follow the icon size, otherwise Up/Down jumps wrong
    const cols = Math.max(1, Math.floor(grid.clientWidth / (iconSize + 30)));

    if (e.key === "ArrowRight") idx = Math.min(list.length - 1, idx + 1);
    else if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
    else if (e.key === "ArrowDown") idx = Math.min(list.length - 1, idx + cols);
    else if (e.key === "ArrowUp") idx = Math.max(0, idx - cols);
    else if (e.key === "Enter" && selected) {
      // Shift+Enter opens in a background tab, plain Enter navigates in place
      if (e.shiftKey) {
        openInBackgroundTab(selected.href);
      } else {
        window.location.href = selected.href;
      }
      return;
    } else {
      return;
    }

    e.preventDefault();
    if (selected) selected.classList.remove("selected");
    selected = list[idx];
    selected.classList.add("selected");
    selected.scrollIntoView({ block: "nearest" });
  });
})();
