(function () {
  "use strict";

  // works only if its a "Index of" table page
  const titleLooksRight = document.title.startsWith("Index of");
  const table = document.querySelector("table#list") || document.querySelector("table");
  if (!titleLooksRight || !table) {
    return;
  }

  // pull name/href/isDir/size out of the table links
  function sizeTextFromRow(a) {
    const tr = a.closest ? a.closest("tr") : null;
    if (!tr || !tr.querySelectorAll) return "";
    const cells = Array.from(tr.querySelectorAll("td"));
    const nameIdx = cells.findIndex((td) => td.contains && td.contains(a));
    const after = nameIdx >= 0 ? cells.slice(nameIdx + 1) : cells;
    for (const td of after) {
      const t = (td.textContent || "").trim();
      if (t === "-") return t;
      if (/^\d{4}$/.test(t)) continue; // lone year from a split date column, not a size
      if (/^[\d.,]+\s*([kmgtpe]?i?b?|bytes?)$/i.test(t)) return t;
    }
    return "";
  }

  // date column is whatever text is left after name + size, join split date/time cells back together
  function dateTextFromRow(a) {
    const tr = a.closest ? a.closest("tr") : null;
    if (!tr || !tr.querySelectorAll) return "";
    const cells = Array.from(tr.querySelectorAll("td"));
    const nameIdx = cells.findIndex((td) => td.contains && td.contains(a));
    const after = nameIdx >= 0 ? cells.slice(nameIdx + 1) : cells;
    const bits = [];
    for (const td of after) {
      const t = (td.textContent || "").trim();
      if (!t || t === "-" || t === "~") continue;
      if (/^\d{4}$/.test(t)) { bits.push(t); continue; } // year piece of a split date, keep it
      if (/^[\d.,]+\s*([kmgtpe]?i?b?|bytes?)$/i.test(t)) continue; // that's the size cell, not a date
      bits.push(t);
    }
    return bits.join(" ").trim();
  }

  // "1.2K" / "12 KB" / "3.4 GiB" -> bytes (1024-based, like the listings); "-" -> null
  function parseSizeBytes(text) {
    const t = (text || "").trim();
    if (!t || t === "-" || t === "~") return null;
    const m = t.match(/^([\d.,]+)\s*([kmgtpe]?)(i?[bB]|bytes?)?$/i);
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(num)) return null;
    const pow = { "": 0, k: 1, m: 2, g: 3, t: 4, p: 5, e: 6 }[(m[2] || "").toLowerCase()];
    if (pow === undefined) return null;
    return Math.round(num * Math.pow(1024, pow));
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    const units = ["KB", "MB", "GB", "TB", "PB"];
    let v = n, u = -1;
    do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
    return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10} ${units[u]}`;
  }

  // "9/28/2026, 10:00 AM" -> ms, garbage -> null (missing dates always sort last)
  function parseDateMs(text) {
    if (!text) return null;
    const ms = Date.parse(text);
    return isNaN(ms) ? null : ms;
  }

  // shared with the list column + sort, so rows and sorting never disagree
  function kindLabel(entry) {
    if (entry.isDir) return "Folder";
    if (!entry.ext) return "File";
    if (iconFor(entry) === ICONS.executable) return "Unix Executable File";
    return entry.ext.toUpperCase() + " File";
  }

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
      const sizeText = sizeTextFromRow(a);
      const dateText = dateTextFromRow(a);

      return { name, href, isDir, ext, isHidden, sizeText, sizeBytes: parseSizeBytes(sizeText), dateText, dateMs: parseDateMs(dateText) };
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
    audio: "audio",
    code: "code",
    text: "text",
    archive: "archive",
    executable: "executable",
    file: "file",
  };

  const EXT_MAP = {
    pdf: ICONS.pdf,
    png: ICONS.image, jpg: ICONS.image, jpeg: ICONS.image, gif: ICONS.image,
    webp: ICONS.image, svg: ICONS.image, heic: ICONS.image,
    mp4: ICONS.video, mov: ICONS.video, mkv: ICONS.video, webm: ICONS.video,
    avi: ICONS.video, m4v: ICONS.video,
    mp3: ICONS.audio, wav: ICONS.audio, flac: ICONS.audio, aac: ICONS.audio,
    ogg: ICONS.audio, oga: ICONS.audio, m4a: ICONS.audio, opus: ICONS.audio,
    midi: ICONS.audio, mid: ICONS.audio,
    js: ICONS.code, ts: ICONS.code, py: ICONS.code, cpp: ICONS.code, c: ICONS.code,
    h: ICONS.code, java: ICONS.code, html: ICONS.code, css: ICONS.code, json: ICONS.code,
    txt: ICONS.text, md: ICONS.text, markdown: ICONS.text, rtf: ICONS.text,
    log: ICONS.text, csv: ICONS.text, tsv: ICONS.text,
    zip: ICONS.archive, tar: ICONS.archive, gz: ICONS.archive, rar: ICONS.archive, "7z": ICONS.archive,
    out: ICONS.executable,
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
    audio: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#34C77B" stroke="#1E7A4C" stroke-width="0.7"/><path d="M9.5 15.2V8.1l7-1.6v7.3" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="7.6" cy="15.4" r="2.1" fill="#fff"/><circle cx="14.6" cy="14" r="2.1" fill="#fff"/></svg>`,
    text: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 2.5c0-.55.45-1 1-1h6.5L19 8v13.5c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V2.5Z" fill="#F4F1E6" stroke="#9AA1AB" stroke-width="0.7" stroke-linejoin="round"/><path d="M12.5 1.5L19 8h-5.5c-.55 0-1-.45-1-1V1.5Z" fill="#D8D3C2"/><path d="M8 12.5h8M8 15.2h8M8 17.9h5" stroke="#8A8571" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#8E6BFF" stroke="#5B3FD4" stroke-width="0.7"/><path d="M9.2 8.5 6.5 12l2.7 3.5M14.8 8.5 17.5 12l-2.7 3.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    archive: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="#C9A15A" stroke="#7A5E2B" stroke-width="0.7"/><rect x="10.5" y="5" width="3" height="15" fill="#8C6C33"/><rect x="3.5" y="9" width="17" height="1.2" fill="#8C6C33" opacity="0.65"/><rect x="9.7" y="11.2" width="4.6" height="3.4" rx="0.8" fill="#E8D9B0" stroke="#7A5E2B" stroke-width="0.6"/></svg>`,
    executable: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#101010" stroke="#4A4A4A" stroke-width="0.7"/><path d="M7 9.2 10 12l-3 2.8" stroke="#4CD964" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12.5 15.5H17" stroke="#4CD964" stroke-width="1.8" stroke-linecap="round"/></svg>`,
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
  // same modes drive the list column headers, so the two never disagree
  const SORT_MODES = {
    "name": "Name",
    "size": "Size",
    "date": "Date Modified",
    "type-name": "Type",
    "files-first": "Files first",
  };
  let sortMode = localStorage.getItem("finderSortMode") || "name";
  if (!SORT_MODES[sortMode]) sortMode = "name";

  // hidden files (dotfiles like .DS_Store) stay off by default
  let showHidden = localStorage.getItem("finderShowHidden") === "true";

  // real thumbnails (images / video first-frame / PDF first-page) are on by
  // default, icons view only — the SVG icon stays underneath as fallback
  let showThumbs = localStorage.getItem("finderShowThumbnails") !== "false";

  // icons vs list layout, sticky across folders like the other settings
  const VIEW_MODES = { icons: "Icons", list: "List" };
  let viewMode = localStorage.getItem("finderViewMode") || "icons";
  if (!VIEW_MODES[viewMode]) viewMode = "icons";

  // list headers sort ascending first, second click flips, all sticky like the other settings
  let listSortDir = localStorage.getItem("finderListSortDir") || "asc";
  if (listSortDir !== "asc" && listSortDir !== "desc") listSortDir = "asc";

  // search filter, per-folder only (fresh page load = fresh search)
  let filterText = "";

  // columns and gear menu share modes, kind header is just the type mode
  const COLUMN_TO_MODE = { name: "name", size: "size", date: "date", kind: "type-name" };
  const MODE_TO_COLUMN = { name: "name", size: "size", date: "date", "type-name": "kind" };

  function persistSort() {
    localStorage.setItem("finderSortMode", sortMode);
    localStorage.setItem("finderListSortDir", listSortDir);
  }

  // gear menu checkmarks follow programmatic changes too (like column clicks)
  function syncSettingsMenu() {
    if (typeof menu === "undefined") return;
    menu.querySelectorAll(".finder-settings-item[data-sort-mode]").forEach((el) => {
      el.classList.toggle("active", el.dataset.sortMode === sortMode);
    });
  }

  function setSortMode(mode, dir) {
    sortMode = mode;
    if (dir) listSortDir = dir;
    persistSort();
    syncSettingsMenu();
    renderGrid();
  }

  function setListSort(column) {
    const mode = COLUMN_TO_MODE[column];
    if (!mode) return;
    if (mode === sortMode) {
      // clicking the same column flips direction, Finder-style
      listSortDir = listSortDir === "asc" ? "desc" : "asc";
    } else {
      sortMode = mode;
      listSortDir = "asc";
    }
    persistSort();
    syncSettingsMenu();
    renderGrid();
  }

  // case-insensitive name compare (with a case-sensitive tiebreak so order is stable)
  function cmpNames(a, b) {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) ||
      a.name.localeCompare(b.name, undefined, { numeric: true });
  }

  // missing sizes/dates (folders, unknown) always sink to the bottom regardless of direction
  function cmpMissingLast(aMissing, bMissing) {
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return 0;
  }

  // type compare shared by icons + list so the gear menu and kind column agree
  function cmpByType(a, b) {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    const ka = iconFor(a), kb = iconFor(b);
    if (ka !== kb) return ka.localeCompare(kb);
    if (a.ext !== b.ext) return a.ext.localeCompare(b.ext);
    return cmpNames(a, b);
  }

  function sortEntries(list) {
    const sorted = list.slice();
    // icons view is always ascending, list view flips via its header arrows
    const dir = viewMode === "list" && listSortDir === "desc" ? -1 : 1;
    // files-first has no column, so it never flips
    if (sortMode === "files-first") {
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? 1 : -1;
        return cmpNames(a, b);
      });
      return sorted;
    }
    if (sortMode === "size") {
      sorted.sort((a, b) => {
        // missing sizes stay at the bottom either way, only real sizes flip
        const missing = cmpMissingLast(a.sizeBytes == null, b.sizeBytes == null);
        if (missing !== 0) return missing;
        const c = (a.sizeBytes || 0) - (b.sizeBytes || 0);
        return c !== 0 ? dir * c : cmpNames(a, b);
      });
      return sorted;
    }
    if (sortMode === "date") {
      sorted.sort((a, b) => {
        const missing = cmpMissingLast(a.dateMs == null, b.dateMs == null);
        if (missing !== 0) return missing;
        const c = (a.dateMs || 0) - (b.dateMs || 0);
        return c !== 0 ? dir * c : cmpNames(a, b);
      });
      return sorted;
    }
    if (sortMode === "type-name") {
      sorted.sort((a, b) => dir * cmpByType(a, b));
      return sorted;
    }
    sorted.sort((a, b) => dir * cmpNames(a, b));
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
    item.dataset.sortMode = mode;
    if (mode === sortMode) item.classList.add("active");

    const itemLabel = document.createElement("span");
    itemLabel.textContent = SORT_MODES[mode];
    const itemCheck = document.createElement("span");
    itemCheck.className = "finder-settings-checkmark";
    itemCheck.textContent = "✓";
    item.appendChild(itemLabel);
    item.appendChild(itemCheck);

    item.addEventListener("click", () => {
      // gear picks the mode, direction resets so the column arrow is predictable
      setSortMode(mode, "asc");
      menu.hidden = true;
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

  const thumbToggle = document.createElement("button");
  thumbToggle.type = "button";
  thumbToggle.className = "finder-settings-item finder-settings-toggle";
  if (showThumbs) thumbToggle.classList.add("active");

  const thumbToggleLabel = document.createElement("span");
  thumbToggleLabel.textContent = "Show thumbnails";
  const thumbToggleCheck = document.createElement("span");
  thumbToggleCheck.className = "finder-settings-checkmark";
  thumbToggleCheck.textContent = "\u2713";

  thumbToggle.appendChild(thumbToggleLabel);
  thumbToggle.appendChild(thumbToggleCheck);

  function setShowThumbs(value) {
    showThumbs = value;
    localStorage.setItem("finderShowThumbnails", String(showThumbs));
    thumbToggle.classList.toggle("active", showThumbs);
    renderGrid();
  }

  thumbToggle.addEventListener("click", () => {
    setShowThumbs(!showThumbs);
  });
  menu.appendChild(thumbToggle);

  // icon size sliders, one per view so grid and list don't fight each other
  const sizeDivider = document.createElement("div");
  sizeDivider.className = "finder-settings-divider";
  menu.appendChild(sizeDivider);

  const MIN_ICON = 48;
  const MAX_ICON = 256;
  const DEFAULT_ICON = 125;
  let iconSize = parseInt(localStorage.getItem("finderIconSize"), 10);
  if (!iconSize || iconSize < MIN_ICON || iconSize > MAX_ICON) iconSize = DEFAULT_ICON;

  const MIN_LIST_ICON = 16;
  const MAX_LIST_ICON = 48;
  const DEFAULT_LIST_ICON = 28;
  let listIconSize = parseInt(localStorage.getItem("finderListIconSize"), 10);
  if (!listIconSize || listIconSize < MIN_LIST_ICON || listIconSize > MAX_LIST_ICON) listIconSize = DEFAULT_LIST_ICON;

  function setIconSize(value) {
    iconSize = value;
    localStorage.setItem("finderIconSize", String(iconSize));
    document.body.style.setProperty("--icon-size", iconSize + "px");
  }

  function setListIconSize(value) {
    listIconSize = value;
    localStorage.setItem("finderListIconSize", String(listIconSize));
    document.body.style.setProperty("--list-icon-size", listIconSize + "px");
  }

  // one slider, retargeted per view so grid and list keep independent sizes
  const sizeRow = document.createElement("div");
  sizeRow.className = "finder-settings-slider-row";

  const sizeHeading = document.createElement("div");
  sizeHeading.className = "finder-settings-heading";
  sizeRow.appendChild(sizeHeading);

  const sizeSlider = document.createElement("input");
  sizeSlider.type = "range";
  sizeSlider.className = "finder-settings-slider";
  sizeRow.appendChild(sizeSlider);
  menu.appendChild(sizeRow);

  // slider reflects whichever view is active, switching views swaps its range/value
  function refreshSizeSlider() {
    if (viewMode === "list") {
      sizeHeading.textContent = "List icon size";
      sizeSlider.min = String(MIN_LIST_ICON);
      sizeSlider.max = String(MAX_LIST_ICON);
      sizeSlider.value = String(listIconSize);
      sizeSlider.setAttribute("aria-label", "List icon size");
    } else {
      sizeHeading.textContent = "Grid icon size";
      sizeSlider.min = String(MIN_ICON);
      sizeSlider.max = String(MAX_ICON);
      sizeSlider.value = String(iconSize);
      sizeSlider.setAttribute("aria-label", "Grid icon size");
    }
  }

  // live-update while dragging, routed to the active view's setting
  sizeSlider.addEventListener("input", () => {
    const value = parseInt(sizeSlider.value, 10);
    if (viewMode === "list") setListIconSize(value);
    else setIconSize(value);
  });
  // slider drag shouldn't close the menu like the other items do
  sizeSlider.addEventListener("click", (e) => e.stopPropagation());
  sizeSlider.addEventListener("mousedown", (e) => e.stopPropagation());

  // apply on load, each view reads its own var so they stay independent
  setIconSize(iconSize);
  setListIconSize(listIconSize);
  refreshSizeSlider();

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

  let grid = document.createElement("div");
  grid.className = "finder-grid";

  // status bar, fixed to the viewport bottom: item/selection count on the left
  const statusBar = document.createElement("div");
  statusBar.className = "finder-statusbar";

  const statusCount = document.createElement("div");
  statusCount.className = "finder-statusbar-count";

  const statusFolder = document.createElement("div");
  statusFolder.className = "finder-statusbar-folder";
  const folderName = segments.length ? segments[segments.length - 1] : "/";
  statusFolder.textContent = folderName;

  const statusSize = document.createElement("div");
  statusSize.className = "finder-statusbar-size";

  statusBar.appendChild(statusCount);
  statusBar.appendChild(statusFolder);
  statusBar.appendChild(statusSize);
  // attached to the body after the titlebar below

  function updateStatusBar() {
    const list = tiles();
    const total = list.length;
    const n = selected.size;
    statusCount.textContent = n > 0
      ? `${total} item${total === 1 ? "" : "s"}, ${n} selected`
      : `${total} item${total === 1 ? "" : "s"}`;

    // center: a single selection shows that file's name, otherwise the folder name
    let centerName = folderName;
    if (n === 1) {
      const only = Array.from(selected)[0];
      const single = currentVisible[parseInt(only.dataset.entryIndex, 10)];
      if (single) centerName = single.name;
    }
    statusFolder.textContent = centerName;
    statusFolder.title = centerName;

    // right side: summed size of files. Chrome's listing reports "-" for
    // folders, so folder sizes are unknown — never count them as 0, just
    // say how many were excluded so the total isn't misleading.
    const pool = n > 0 ? Array.from(selected) : list;
    const poolEntries = pool
      .map((tile) => currentVisible[parseInt(tile.dataset.entryIndex, 10)])
      .filter(Boolean);
    let bytes = 0;
    let known = false;
    let folderCount = 0;
    poolEntries.forEach((entry) => {
      if (entry.isDir) {
        folderCount++;
        return;
      }
      if (entry.sizeBytes !== null && entry.sizeBytes !== undefined) {
        bytes += entry.sizeBytes;
        known = true;
      }
    });
    const folderSuffix = (count) => (count === 1 ? "1 folder" : `${count} folders`);
    if (!known) {
      // no files with a known size in the pool: folders-only or empty
      if (n > 0) {
        statusSize.textContent = folderCount > 0 ? `\u2014 (${folderSuffix(folderCount)})` : "\u2014";
      } else {
        statusSize.textContent = folderCount > 0 ? folderSuffix(folderCount) : "";
      }
    } else if (n > 0) {
      statusSize.textContent = folderCount > 0
        ? `${formatBytes(bytes)} (+ ${folderSuffix(folderCount)})`
        : formatBytes(bytes);
    } else {
      statusSize.textContent = folderCount > 0
        ? `${formatBytes(bytes)} total (${folderSuffix(folderCount)} excluded)`
        : `${formatBytes(bytes)} total`;
    }
    statusSize.title = statusSize.textContent;
  }

  // multi-select: a Set of tiles. Cmd/Ctrl+click toggles one, Shift+click selects all from the last-clicked tile
  let selected = new Set();
  let lastClickedTile = null;
  // sorted entries backing the current grid, parallel to tiles() order so the status bar can map a selected tile back to its size
  let currentVisible = [];

  function clearSelection() {
    selected.forEach((t) => t.classList.remove("selected"));
    selected.clear();
  }

  function selectOnly(tile) {
    clearSelection();
    selected.add(tile);
    tile.classList.add("selected");
    lastClickedTile = tile;
  }

  function toggleSelection(tile) {
    if (selected.has(tile)) {
      selected.delete(tile);
      tile.classList.remove("selected");
    } else {
      selected.add(tile);
      tile.classList.add("selected");
    }
    lastClickedTile = tile;
  }

  function selectRange(tile) {
    const list = tiles();
    const anchorIdx = lastClickedTile ? list.indexOf(lastClickedTile) : 0;
    const targetIdx = list.indexOf(tile);
    if (anchorIdx === -1 || targetIdx === -1) {
      selectOnly(tile);
      return;
    }
    clearSelection();
    const [start, end] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
    for (let i = start; i <= end; i++) {
      selected.add(list[i]);
      list[i].classList.add("selected");
    }
  }

  const tiles = () => Array.from(grid.querySelectorAll(".finder-tile"));

  // view mode toolbar: icons/list segmented control, Finder-style
  const toolbar = document.createElement("div");
  toolbar.className = "finder-toolbar";

  const iconsBtn = document.createElement("button");
  iconsBtn.type = "button";
  iconsBtn.className = "finder-toolbar-btn";
  iconsBtn.title = "Icons (⌘ 1)";
  iconsBtn.setAttribute("aria-label", "Icon view");
  iconsBtn.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15"><rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>`;

  const listBtn = document.createElement("button");
  listBtn.type = "button";
  listBtn.className = "finder-toolbar-btn";
  listBtn.title = "List (⌘ 2)";
  listBtn.setAttribute("aria-label", "List view");
  listBtn.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15"><rect x="1" y="2" width="14" height="2.2" rx="1" fill="currentColor"/><rect x="1" y="6.9" width="14" height="2.2" rx="1" fill="currentColor"/><rect x="1" y="11.8" width="14" height="2.2" rx="1" fill="currentColor"/></svg>`;

  function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem("finderViewMode", viewMode);
    iconsBtn.classList.toggle("active", viewMode === "icons");
    listBtn.classList.toggle("active", viewMode === "list");
    // slider follows the view so it always edits the size you're looking at
    refreshSizeSlider();
    renderGrid();
  }

  iconsBtn.classList.toggle("active", viewMode === "icons");
  listBtn.classList.toggle("active", viewMode === "list");
  iconsBtn.addEventListener("click", () => setViewMode("icons"));
  listBtn.addEventListener("click", () => setViewMode("list"));

  toolbar.appendChild(iconsBtn);
  toolbar.appendChild(listBtn);

  // quick filter, just narrows the current folder by name (no searching subfolders)
  const searchWrap = document.createElement("div");
  searchWrap.className = "finder-search";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "finder-search-input";
  searchInput.placeholder = "Search";
  searchInput.setAttribute("aria-label", "Filter by name");
  searchInput.autocomplete = "off";
  searchInput.spellcheck = false;
  searchWrap.appendChild(searchInput);

  searchInput.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderGrid();
  });
  // esc clears the filter first, second esc blurs out
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (searchInput.value) {
        searchInput.value = "";
        filterText = "";
        renderGrid();
      } else {
        searchInput.blur();
      }
    }
  });

  bar.appendChild(crumbs);
  bar.appendChild(searchWrap);
  bar.appendChild(toolbar);
  bar.appendChild(settingsWrap);
  document.body.appendChild(bar);
  document.body.appendChild(grid);
  document.body.appendChild(statusBar);

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

  // real thumbnails, icons view only. Images via <img>, videos via <video>
  // (first frame through a #t=0.1 media fragment), PDFs via an embedded
  // first-page render, text/code via the first lines fetched through the
  // background worker (content scripts can't fetch file:// URLs themselves).
  // heic/heif + mkv/avi are left as icons — Chrome can't render them, so
  // they'd just burn requests before falling back anyway.
  const THUMB_IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"]);
  const THUMB_VIDEO_EXTS = new Set(["mp4", "m4v", "mov", "webm", "ogv"]);
  // same set the code/text icons use, so previews and icons never disagree
  const THUMB_TEXT_EXTS = new Set(["txt", "md", "markdown", "rtf", "log", "csv", "tsv",
    "js", "ts", "py", "cpp", "c", "h", "java", "html", "css", "json"]);
  const MAX_THUMB_BYTES = 50 * 1024 * 1024; // skip huge files, the icon stays
  // text fetch is byte-capped by the worker, so no size guard needed there

  function thumbKind(entry) {
    if (entry.isDir || !showThumbs || viewMode !== "icons") return null;
    if (THUMB_TEXT_EXTS.has(entry.ext)) return "text";
    if (entry.sizeBytes != null && entry.sizeBytes > MAX_THUMB_BYTES) return null;
    if (entry.ext === "pdf") return "pdf";
    if (THUMB_IMAGE_EXTS.has(entry.ext)) return "image";
    if (THUMB_VIDEO_EXTS.has(entry.ext)) return "video";
    return null;
  }

  // text preview bodies, cached per page load so re-renders don't refetch.
  // url -> shaped string, or null when it failed (don't retry those)
  const textThumbCache = new Map();

  // document miniature: up to 60 lines, tabs flattened to 2 spaces so
  // indentation survives, wrapped by CSS inside the icon
  function shapeTextThumb(text, truncated) {
    const lines = String(text).split(/\r\n|\r|\n/).slice(0, 60)
      .map((line) => line.replace(/\t/g, "  ").slice(0, 300));
    // drop trailing blank lines so short files don't preview as empty paper
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (!lines.length) return null;
    const cut = truncated || String(text).split(/\r\n|\r|\n/).length > 60;
    return lines.join("\n") + (cut ? "\n…" : "");
  }

  function requestTextThumb(el) {
    const url = el.dataset.thumbTextUrl;
    if (!url) return;
    delete el.dataset.thumbTextUrl;
    const apply = (text) => {
      // re-renders discard tiles; never populate a detached one
      if (text == null || !el.isConnected) return;
      el.textContent = text;
      el.classList.add("loaded");
      // preview's in — drop the fallback icon behind it
      if (el.parentElement) el.parentElement.classList.add("thumb-on");
    };
    if (textThumbCache.has(url)) {
      apply(textThumbCache.get(url));
      return;
    }
    let result = null;
    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        result = chrome.runtime.sendMessage({ type: "finder-fetch-text", url });
      }
    } catch (e) {
      result = null; // no worker (file access off?) — icon stays
    }
    if (result && typeof result.then === "function") {
      result.then((res) => {
        const text = res && res.ok ? shapeTextThumb(res.text, res.truncated) : null;
        textThumbCache.set(url, text);
        apply(text);
      }).catch(() => textThumbCache.set(url, null));
    } else {
      textThumbCache.set(url, null);
    }
  }

  // PDF probe results, cached per page load so re-renders don't refetch.
  // target -> true (render it) or false (keep the icon, never retry)
  const pdfThumbCache = new Map();

  // empty/corrupt PDFs make Chrome's viewer render a "Failed to load PDF
  // document" error bar inside the thumbnail — probe the magic bytes first
  // and drop those back to the icon instead
  function requestPdfThumb(el, src) {
    const target = src || el.dataset.thumbSrc;
    if (!target) return;
    delete el.dataset.thumbSrc;
    const show = () => {
      // re-renders discard tiles; never load into a detached one
      if (!el.isConnected) return;
      el.src = target;
      // <embed> fires no reliable load event, just fade in its wrapper —
      // the icon underneath covers the brief blank flash
      setTimeout(() => {
        const showEl = el._showTarget || el;
        showEl.classList.add("loaded");
        // preview's in — drop the fallback icon behind it
        if (showEl.parentElement) showEl.parentElement.classList.add("thumb-on");
      }, 600);
    };
    const drop = () => {
      const wrap = el._showTarget || el;
      if (wrap.isConnected) wrap.remove();
    };
    if (pdfThumbCache.has(target)) {
      if (pdfThumbCache.get(target)) show();
      else drop();
      return;
    }
    let result = null;
    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        result = chrome.runtime.sendMessage({ type: "finder-check-pdf", url: target });
      }
    } catch (e) {
      result = null; // no worker (file access off?) — try the embed directly
    }
    if (result && typeof result.then === "function") {
      result.then((res) => {
        if (!res || !res.ok) {
          // probe itself failed, not the file — render like before probing
          pdfThumbCache.set(target, true);
          show();
          return;
        }
        pdfThumbCache.set(target, !!res.valid);
        if (res.valid) show();
        else drop();
      }).catch(() => {
        pdfThumbCache.set(target, true);
        show();
      });
    } else {
      show();
    }
  }

  // one observer per render: thumbnails only fetch once they scroll near the
  // viewport, so a folder with hundreds of photos doesn't hammer the disk
  let thumbObserver = null;

  function ensureThumbObserver() {
    if (thumbObserver) thumbObserver.disconnect();
    if (!("IntersectionObserver" in window)) {
      thumbObserver = null;
      return null;
    }
    thumbObserver = new IntersectionObserver((ioEntries) => {
      ioEntries.forEach((io) => {
        if (!io.isIntersecting) return;
        const el = io.target;
        thumbObserver.unobserve(el);
        // text previews fetch their body instead of setting a src
        if (el.tagName === "PRE") {
          requestTextThumb(el);
          return;
        }
        const src = el.dataset.thumbSrc;
        if (!src) return;
        delete el.dataset.thumbSrc;
        if (el.tagName === "VIDEO") {
          el.preload = "metadata";
          el.src = src;
          el.load();
        } else if (el.tagName === "EMBED") {
          // PDFs probe their magic bytes first, broken ones stay icons.
          // (src was already pulled out of the dataset above, pass it along)
          requestPdfThumb(el, src);
        } else {
          el.src = src;
        }
      });
    }, { rootMargin: "300px" });
    return thumbObserver;
  }

  // builds the tile grid using the current sortMode and viewMode
  function renderGrid() {
    const freshGrid = document.createElement("div");
    freshGrid.className = viewMode === "list" ? "finder-grid finder-grid-list" : "finder-grid";
    selected = new Set();
    lastClickedTile = null;
    ensureThumbObserver();

    let visible = showHidden ? entries.slice() : entries.filter((e) => !e.isHidden);
    // filter by name only, keeps hidden/size/date logic untouched
    if (filterText) {
      visible = visible.filter((e) => e.name.toLowerCase().includes(filterText));
    }

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "finder-empty";
      // tell filtered-zero apart from actually-empty so it doesn't look broken
      empty.textContent = filterText ? `No matches for "${searchInput.value.trim()}"` : "This folder is empty";
      freshGrid.appendChild(empty);
      if (filterText) {
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "finder-empty-btn";
        clearBtn.textContent = "Clear search";
        clearBtn.addEventListener("click", () => {
          searchInput.value = "";
          filterText = "";
          renderGrid();
          searchInput.focus();
        });
        empty.appendChild(document.createElement("br"));
        empty.appendChild(clearBtn);
      }
    }

    if (viewMode === "list" && visible.length > 0) {
      const header = document.createElement("div");
      header.className = "finder-list-header";
      // clickable columns, active arrow follows the gear menu mode so the two stay in sync
      // (files-first has no column, so nothing highlights then)
      const activeColumn = MODE_TO_COLUMN[sortMode] || null;
      const cols = [
        ["name", "Name", "finder-list-col-name"],
        ["size", "Size", "finder-list-col-size"],
        ["date", "Date Modified", "finder-list-col-date"],
        ["kind", "Kind", "finder-list-col-kind"],
      ];
      cols.forEach(([key, label, cls]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "finder-list-col " + cls;
        if (key === activeColumn) btn.classList.add("sorted");
        const arrow = key === activeColumn ? (listSortDir === "asc" ? " \u25B2" : " \u25BC") : "";
        btn.textContent = label + arrow;
        btn.title = `Sort by ${label}`;
        btn.setAttribute("aria-label", `Sort by ${label}`);
        btn.addEventListener("click", () => setListSort(key));
        header.appendChild(btn);
      });
      freshGrid.appendChild(header);
    }

    const sorted = sortEntries(visible);
    currentVisible = sorted;

    sorted.forEach((entry, idx) => {
      const tile = document.createElement("a");
      tile.className = viewMode === "list" ? "finder-tile finder-row" : "finder-tile";
      tile.href = entry.href;
      tile.dataset.entryIndex = String(idx);

      const iconWrap = document.createElement("div");
      iconWrap.className = "finder-icon";
      iconWrap.innerHTML = SVG[iconFor(entry)];

      // thumbnail overlay (icons view only): the SVG icon above stays
      // underneath as the loading/failure fallback, the real preview fades
      // in on top once it loads and the failed ones just remove themselves
      const tk = thumbKind(entry);
      if (tk === "text") {
        // text/code: first lines fetched via the background worker,
        // rendered as tiny monospace on paper — textContent only, never HTML
        const fileUrl = new URL(entry.href, location.href).href;
        const pre = document.createElement("pre");
        pre.className = "finder-thumb finder-thumb-text";
        pre.setAttribute("aria-hidden", "true");
        pre.dataset.thumbTextUrl = fileUrl;
        if (thumbObserver) {
          thumbObserver.observe(pre);
        } else {
          // no IntersectionObserver (very old browser): fetch immediately
          requestTextThumb(pre);
        }
        iconWrap.appendChild(pre);
      } else if (tk === "pdf") {
        // PDFs: first page only. The viewer can't scroll (pointer-events
        // are off on .finder-thumb) and its scrollbars are hidden two ways:
        // the scrollbar=0 param, plus the embed running 14px wider than its
        // overflow-hidden wrapper so any rendered scrollbar is clipped away
        const fileUrl = new URL(entry.href, location.href).href;
        const target = fileUrl + "#page=1&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0";
        const wrap = document.createElement("div");
        wrap.className = "finder-thumb finder-thumb-pdf";
        wrap.setAttribute("aria-hidden", "true");
        const emb = document.createElement("embed");
        emb.type = "application/pdf";
        emb._showTarget = wrap;
        wrap.appendChild(emb);
        iconWrap.appendChild(wrap);
        emb.dataset.thumbSrc = target;
        if (thumbObserver) {
          thumbObserver.observe(emb);
        } else {
          // no IntersectionObserver (very old browser): probe + load now
          requestPdfThumb(emb);
        }
      } else if (tk) {
        const fileUrl = new URL(entry.href, location.href).href;
        let media = null;
        let target = fileUrl;
        if (tk === "image") {
          media = document.createElement("img");
          media.decoding = "async";
          media.alt = "";
          media.addEventListener("load", () => {
            media.classList.add("loaded");
            if (media.parentElement) media.parentElement.classList.add("thumb-on");
          });
          media.addEventListener("error", () => media.remove());
        } else if (tk === "video") {
          media = document.createElement("video");
          media.muted = true;
          media.playsInline = true;
          media.preload = "none";
          media.setAttribute("playsinline", "");
          media.addEventListener("loadeddata", () => {
            media.classList.add("loaded");
            if (media.parentElement) media.parentElement.classList.add("thumb-on");
          });
          media.addEventListener("error", () => media.remove());
          target = fileUrl + "#t=0.1";
        }
        if (media) {
          media.className = "finder-thumb";
          media.setAttribute("aria-hidden", "true");
          if (thumbObserver) {
            media.dataset.thumbSrc = target;
            thumbObserver.observe(media);
          } else {
            // no IntersectionObserver (very old browser): load immediately,
            // still waiting for the real load event before fading in
            if (media.tagName === "VIDEO") media.preload = "metadata";
            media.src = target;
          }
          iconWrap.appendChild(media);
        }
      }

      const label = document.createElement("div");
      label.className = "finder-label";
      label.textContent = entry.name;

      if (viewMode === "list") {
        // name column holds icon + label together so it lines up with the header
        const nameCol = document.createElement("div");
        nameCol.className = "finder-row-name";
        nameCol.appendChild(iconWrap);
        nameCol.appendChild(label);
        tile.appendChild(nameCol);

        const size = document.createElement("div");
        size.className = "finder-row-size";
        // Chrome's file:// listing reports "-" for folders, so their size is

        size.textContent = entry.isDir ? "\u2014" : (entry.sizeText && entry.sizeText !== "-" ? entry.sizeText : "\u2014");
        size.title = entry.isDir ? "Folder size isn't listed" : size.textContent;
        tile.appendChild(size);

        const date = document.createElement("div");
        date.className = "finder-row-date";
        date.textContent = entry.dateText || "\u2014";
        date.title = date.textContent;
        tile.appendChild(date);

        const kind = document.createElement("div");
        kind.className = "finder-row-kind";
        kind.textContent = kindLabel(entry);
        tile.appendChild(kind);
      } else {
        tile.appendChild(iconWrap);
        tile.appendChild(label);
      }

      // Plain click selects only; Cmd/Ctrl+click toggles multi-select;
      // Shift+click selects a range. Middle-click opens in a background tab.
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        if (e.shiftKey) {
          selectRange(tile);
        } else if (e.metaKey || e.ctrlKey) {
          toggleSelection(tile);
        } else {
          selectOnly(tile);
        }
        updateStatusBar();
      });

      tile.addEventListener("auxclick", (e) => {
        // middle-click (button 1) opens in a background tab
        if (e.button === 1) {
          e.preventDefault();
          openInBackgroundTab(tile.href);
        }
      });

      tile.addEventListener("dblclick", (e) => {
        e.preventDefault();
        window.location.href = tile.href;
      });

      // right-click selects the tile too, feels more native than leaving selection untouched
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!selected.has(tile)) {
          selectOnly(tile);
          updateStatusBar();
        }
        openCtxMenu(tile, e.clientX, e.clientY);
      });

      freshGrid.appendChild(tile);
    });

    grid.replaceWith(freshGrid);
    grid = freshGrid;
    updateStatusBar();
  }

  renderGrid();

  // Cmd(or Ctrl)+Shift+. toggles hidden files
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === "Period" || e.key === "." || e.key === ">")) {
      e.preventDefault();
      setShowHidden(!showHidden);
    }
  });

  // Cmd/Ctrl+F focuses search, let typing keys alone when already in a field
  function typingInField() {
    const el = document.activeElement;
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  }

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // "/" jumps to search when not already typing, Finder-ish quick find
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (typingInField()) return;
    if (e.key === "/") {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Cmd/Ctrl+A selects all (multi-select).
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (typingInField()) return; // let text fields keep native select-all
    if (e.key === "a") {
      e.preventDefault();
      const list = tiles();
      selected = new Set(list);
      list.forEach((t) => t.classList.add("selected"));
      lastClickedTile = list[list.length - 1] || null;
      updateStatusBar();
    }
  });

  // Basic keyboard nav with arrow keys and Enter to move and open
  document.addEventListener("keydown", (e) => {
    if (typingInField()) return; // arrows/enter belong to the search box while typing
    // Cmd/Ctrl+Left/Right is browser back/forward, don't override
    if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      return;
    }
    // let the Cmd/Ctrl combos above (view mode, select-all) handle themselves
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "Enter" && lastClickedTile) {
        e.preventDefault();
        openInBackgroundTab(lastClickedTile.href);
      }
      return;
    }

    const list = tiles();
    if (list.length === 0) return;
    const current = lastClickedTile && list.includes(lastClickedTile) ? lastClickedTile : null;
    let idx = current ? list.indexOf(current) : -1;

    // list view is always a single column
    const cols = viewMode === "list" ? 1 : Math.max(1, Math.floor(grid.clientWidth / (iconSize + 30)));

    if (e.key === "ArrowRight" && viewMode !== "list") idx = Math.min(list.length - 1, idx + 1);
    else if (e.key === "ArrowLeft" && viewMode !== "list") idx = Math.max(0, idx - 1);
    else if (e.key === "ArrowDown") idx = Math.min(list.length - 1, idx + cols);
    else if (e.key === "ArrowUp") idx = Math.max(0, idx - cols);
    else if (e.key === "Enter" && current) {
      window.location.href = current.href;
      return;
    } else {
      return;
    }

    e.preventDefault();
    selectOnly(list[idx]);
    updateStatusBar();
    list[idx].scrollIntoView({ block: "nearest" });
  });

  // click on empty grid area clears selection, like real Finder
  document.body.addEventListener("click", (e) => {
    if (e.target === grid || e.target.classList.contains("finder-empty")) {
      clearSelection();
      updateStatusBar();
    }
  });
})();
