# Finder for Folders v0.1.0

Makes your browser's `file://` folder listing look and behave like a macOS Finder window

## Features (v0.1)

- Finder-style dark icon grid for local folders
- Per-type icons: folder, PDF, image, code, archive, generic file
- Breadcrumb title bar built from the URL path
- Settings menu (gear, top right):
  - Sort by: `Name / Type (folders first) / Files first` stored in `localStorage`
  - Show hidden files toggle (dotfiles like `.DS_Store`)
- Single click to select, double click to open (has no real purpose right now but will be used for status bar later)
- Keyboard navigation: Arrow keys to move, `Enter` to open
- Hidden-file shortcut: `Cmd+Shift+.` (Mac) / `Ctrl+Shift+.` (Windows/Linux)
- Empty-folder state


## Shortcuts

| Action | Mac | Windows / Linux |
|---|---|---|
| Toggle hidden files | `Cmd+Shift+.` | `Ctrl+Shift+.` |
| Move selection | Arrow keys | Arrow keys |
| Open selected | `Enter` | `Enter` |

## Install (unpacked)
1. Clone this repo
2. Open `chrome://extensions` (same in Brave / Edge, replace `chrome://` with `brave://` or `edge://`)
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked**, select this cloned folder
5. Click **Details** on the extension card → enable **Allow access to file URLs**. Required as Chrome might block `file://` access by default
6. Open any local folder, e.g. `file:///Users/you/Desktop/`


## How it works

1. Runs only on `file:///*` pages
2. Runs on the page if it looks like Chrome's auto-generated listing (`document.title` starts with `Index of` + a `<table>` exists)
3. Parses `<a href>` rows into `{ name, href, isDir, ext, isHidden }`, skipping the parent-directory row
4. Wipes `<body>` and renders the Finder UI (title bar + grid)

## Permissions & privacy

- Host access: `file:///*` only
- Storage: `localStorage` only (`finderSortMode`, `finderShowHidden`)

## Known limitations (v0.1)

- Chromium only, no Firefox yet
- No real thumbnails (image/PDF previews)
- No list view; no sort by size/date
- No drag-and-drop, no rename/delete
- Not yet packaged for the Chrome Web Store

## Files

```
manifest.json  # MV3 manifest, version 0.1.0
content.js     # parsing + rendering + interactions
finder.css     # Finder dark theme
LICENSE        # MIT
README.md      # this file
```

## License

MIT
