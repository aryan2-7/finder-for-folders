# Finder for Folders v0.2

Makes your browser's `file://` folder listing look and behave like a macOS Finder window

## Features (v0.2)

- Finder-style dark icon grid for local folders
- Per-type icons: folder, PDF, image, video, audio, code, text, archive, executable, generic file
- Real thumbnails in Icons view (Finder-style cover-crop): images, video first-frames, PDF first-pages rendered with the bundled pdf.js (exact pixels, no viewer scrollbars or gaps — empty/corrupt PDFs keep their icon), and text/code as a tiny paper miniature of the whole document (indentation kept, wraps inside the icon) — lazy-loaded on scroll, files over 50 MB stay as icons (text previews are byte-capped instead, so even huge logs are cheap), List view stays icons-only
- Breadcrumb title bar built from the URL path
- Search box in the title bar: filters the current folder by name (per-folder, not recursive)
- Settings menu (gear, top right):
  - Show thumbnails toggle, stored in `localStorage`
  - Sort by: `Name / Size / Date Modified / Type (folders first) / Files first` stored in `localStorage`
  - Show hidden files toggle (dotfiles like `.DS_Store`)
  - One icon size slider that follows the active view: grid icons (`48–256`) in Icons view, row icons (`16–48`) in List view — each view keeps its own size in `localStorage`
- Icons / List view toggle, stored in `localStorage`
- List view: `Name / Size / Date Modified / Kind` columns, click a header to sort (click again to flip direction) — stays in sync with the gear menu sort
- Status bar (bottom): item count, selection count, files' summed size — folder sizes aren't reported by the listing, so folders show as `—` and totals note how many folders were excluded
- Multi-select: `Cmd/Ctrl+click` to toggle, `Shift+click` for a range, `Cmd/Ctrl+A` for all
- Right-click context menu: Open, Open in new tab, Copy link — becomes "Open N items" / "Open N items in new tabs" when multiple items are selected
- Bulk open: select several items, then right-click → **Open N items**, or press `Cmd/Ctrl+Enter` — opens each in its own background tab
- Single click to select, double click to open
- Open in background tab (stay in the folder tab): `Cmd+click` (Mac) / `Ctrl+click` (Windows/Linux), middle-click
- Keyboard navigation: Arrow keys to move, `Enter` to open
- Hidden-file shortcut: `Cmd+Shift+.` (Mac) / `Ctrl+Shift+.` (Windows/Linux)
- Empty-folder and no-matches states (with a Clear search button)


## Shortcuts

| Action | Mac | Windows / Linux |
|---|---|---|
| Toggle hidden files | `Cmd+Shift+.` | `Ctrl+Shift+.` |
| Move selection | Arrow keys | Arrow keys |
| Open selected | `Enter` | `Enter` |
| Open in new background tab (single, keyboard) | `Cmd+Enter` | `Ctrl+Enter` |
| Open in new background tab (single, mouse) | `Cmd+click` or middle-click | `Ctrl+click` or middle-click |
| Open whole selection in background tabs | `Cmd+Enter` (2+ selected), or right-click → Open N items | `Ctrl+Enter` (2+ selected), or right-click → Open N items |
| Focus search | `Cmd+F` or `/` | `Ctrl+F` or `/` |
| Clear search | `Esc` (in search box) | `Esc` (in search box) |

## Install (unpacked)
1. Clone this repo
2. Open `chrome://extensions` (same in Brave / Edge, replace `chrome://` with `brave://` or `edge://`)
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked**, select this cloned folder
5. Click **Details** on the extension card → enable **Allow access to file URLs**. Required as Chrome might block `file://` access by default
6. Open any local folder, e.g. `file:///Users/you/Desktop/`

## Screenshot

<table>
  <tr>
    <th>Without extension</th>
    <th>With extension</th>
  </tr>
  <tr>
    <td>
      <img width="800" alt="Finder for Folders without extension" src="https://github.com/user-attachments/assets/5e6f9fd1-85f0-45df-a820-1805e7ba8a75"/>
    </td>
    <td>
      <img width="800" alt="image" src="https://github.com/user-attachments/assets/c2a01e0d-ecd0-4350-a2ab-bf183709cead" />
    </td>
  </tr>
</table>

## What's next?

- Drag-and-drop, rename/delete

## How it works

1. Runs only on `file:///*` pages
2. Runs on the page if it looks like Chrome's auto-generated listing (`document.title` starts with `Index of` + a `<table>` exists)
3. Parses `<a href>` rows into `{ name, href, isDir, ext, isHidden, sizeText, sizeBytes, dateText, dateMs }`, skipping the parent-directory row
4. Wipes `<body>` and renders the Finder UI (title bar + search + toolbar + grid/list + status bar)
5. Background-tab opens (single: `Cmd/Ctrl+click`, middle-click; bulk: `Cmd/Ctrl+Enter` or the context menu with 2+ selected) go through `background.js` via `chrome.tabs.create({ active: false })`, so the folder tab stays focused
6. Text/code previews go through `background.js` too (`finder-fetch-text`): content scripts can't `fetch()` `file://` URLs, but the worker can with the same `file://` permission — it reads the first 64 KB, rejects binaries, and the tile renders the first lines as `textContent` (never HTML)
7. PDF previews render page 1 to canvas with the locally bundled pdf.js (`vendor-pdf.min.js` + worker): the worker fetches the file bytes (`finder-fetch-pdf`), the tile renders at 2x, caches the PNG data URL for re-renders — no viewer chrome, so no scrollbars, gaps, or error bars

## Permissions & privacy

- Host access: `file:///*` only
- Storage: `localStorage` only (`finderSortMode`, `finderShowHidden`, `finderShowThumbnails`, `finderViewMode`, `finderIconSize`, `finderListIconSize`, `finderListSortDir`)
- Tabs: background worker opens background tabs next to the folder tab (`chrome.tabs.create` with `active: false`)

## Known limitations (v0.2)

- Chromium only, no Firefox yet
- HEIC photos and mkv/avi videos keep generic icons (Chrome can't render them for previews)
- Search filters the current folder only, no subfolders
- No drag-and-drop, no rename/delete
- Not yet packaged for the Chrome Web Store

## Files

```
manifest.json  # MV3 manifest, version 0.1.0
vendor-pdf.min.js + vendor-pdf.worker.min.js  # pdf.js v3 (local, renders PDF thumbs, no CDN)
content.js     # parsing + rendering + interactions
background.js  # background tabs + file-byte fetching for previews
finder.css     # Finder dark theme
LICENSE        # MIT
README.md      # this file
```

## License

MIT
