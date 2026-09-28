# Finder for Folders v0.1.1

Makes your browser's `file://` folder listing look and behave like a macOS Finder window

## Features (v0.1)

- Finder-style dark icon grid for local folders
- Per-type icons: folder, PDF, image, video, code, archive, generic file
- Breadcrumb title bar built from the URL path
- Settings menu (gear, top right):
  - Sort by: `Name / Type (folders first) / Files first` stored in `localStorage`
  - Show hidden files toggle (dotfiles like `.DS_Store`)
  - Icon size slider (`48–256`, stored in `localStorage`)
- Single click to select, double click to open (has no real purpose right now but will be used for status bar later)
- Open in background tab (stay in the folder tab): `Shift+Enter`, `Shift+double-click`, `Cmd+click` (Mac) / `Ctrl+click` (Windows/Linux)
- Keyboard navigation: Arrow keys to move, `Enter` to open
- Hidden-file shortcut: `Cmd+Shift+.` (Mac) / `Ctrl+Shift+.` (Windows/Linux)
- Empty-folder state


## Shortcuts

| Action | Mac | Windows / Linux |
|---|---|---|
| Toggle hidden files | `Cmd+Shift+.` | `Ctrl+Shift+.` |
| Move selection | Arrow keys | Arrow keys |
| Open selected | `Enter` | `Enter` |
| Open in new background tab (keyboard) | `Shift+Enter` | `Shift+Enter` |
| Open in new background tab (mouse) | `Shift+double-click` or `Cmd+click` | `Shift+double-click` or `Ctrl+click` |

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
- Adding a Status bar to show info for the selected file
- Adding view options (list/grid), its just grid rn
- Implement search
- Show actual thumbnails for the files, insted of the current svg images

## How it works

1. Runs only on `file:///*` pages
2. Runs on the page if it looks like Chrome's auto-generated listing (`document.title` starts with `Index of` + a `<table>` exists)
3. Parses `<a href>` rows into `{ name, href, isDir, ext, isHidden }`, skipping the parent-directory row
4. Wipes `<body>` and renders the Finder UI (title bar + grid)
5. Background-tab opens (`Shift+Enter`, `Shift+double-click`, `Cmd/Ctrl+click`) go through `background.js` via `chrome.tabs.create({ active: false })`, so the folder tab stays focused

## Permissions & privacy

- Host access: `file:///*` only
- Storage: `localStorage` only (`finderSortMode`, `finderShowHidden`, `finderIconSize`)
- Tabs: background worker opens background tabs next to the folder tab (`chrome.tabs.create` with `active: false`)

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
background.js  # opens background tabs via chrome.tabs.create
finder.css     # Finder dark theme
LICENSE        # MIT
README.md      # this file
```

## License

MIT
