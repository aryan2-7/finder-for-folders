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
    code: "code",
    archive: "archive",
    file: "file",
  };

  const EXT_MAP = {
    pdf: ICONS.pdf,
    png: ICONS.image, jpg: ICONS.image, jpeg: ICONS.image, gif: ICONS.image,
    webp: ICONS.image, svg: ICONS.image, heic: ICONS.image,
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
    folder: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 6.5C3 5.67 3.67 5 4.5 5H9l2 2h8.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-15C3.67 19 3 18.33 3 17.5v-11Z" fill="#5AB1FF"/><path d="M3 6.5C3 5.67 3.67 5 4.5 5H9l2 2h8.5c.83 0 1.5.67 1.5 1.5V9H3V6.5Z" fill="#8FCBFF"/></svg>`,
    pdf: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6V2Z" fill="#EE3C36"/><path d="M14 2v4h4l-4-4Z" fill="#FF9B96"/><text x="12" y="17" font-size="6" fill="#fff" text-anchor="middle" font-family="Helvetica" font-weight="700">PDF</text></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" fill="#FFD24C"/><circle cx="8" cy="10" r="2" fill="#fff"/><path d="M4 18l5-5 4 4 3-3 4 4v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" fill="#fff"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#8E6BFF"/><path d="M9 8 6 12l3 4M15 8l3 4-3 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    archive: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" fill="#C9A15A"/><rect x="10.5" y="4" width="3" height="16" fill="#8C6C33"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6V2Z" fill="#D9DDE3"/><path d="M14 2v4h4l-4-4Z" fill="#F1F3F5"/></svg>`,
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

  function sortEntries(list) {
    const sorted = list.slice();
    if (sortMode === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    } else if (sortMode === "files-first") {
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? 1 : -1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
    } else {
      // type-name: folders first, then files A-Z (the original default)
      sorted.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
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

      // Single click only selects, double click opens
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        if (selected) selected.classList.remove("selected");
        tile.classList.add("selected");
        selected = tile;
      });

      tile.addEventListener("dblclick", (e) => {
        e.preventDefault();
        window.location.href = tile.href;
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
    const list = tiles();
    if (list.length === 0) return;
    let idx = selected ? list.indexOf(selected) : -1;

    const cols = Math.max(1, Math.floor(grid.clientWidth / 155));

    if (e.key === "ArrowRight") idx = Math.min(list.length - 1, idx + 1);
    else if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
    else if (e.key === "ArrowDown") idx = Math.min(list.length - 1, idx + cols);
    else if (e.key === "ArrowUp") idx = Math.max(0, idx - cols);
    else if (e.key === "Enter" && selected) {
      window.location.href = selected.href;
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
