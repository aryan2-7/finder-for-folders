# Finder for Folders

Makes your browser's `file://` folder listing look like a macOS Finder window making it more usable and better looking than a list of names.

## Install (unpacked, for now)

1. Open `chrome://extensions` (works the same in Brave/Edge).
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked**, select this folder.
4. Click **Details** on the extension card → toggle **Allow access to file URLs**. (This step is required as Chrome blocks file:// access by default for safety.)
5. Open any local folder in a new tab, e.g. `file:///Users/you/Desktop/`.

## What v0 does

- Detects Chrome's auto-generated directory listing page
- Parses the file/folder rows out of the existing HTML
- Re-renders them as a macOS-style icon grid (folders, PDFs, images, code files, archives get distinct icons; everything else gets a generic file icon)
- Click to select, double-click-equivalent (single click, since it's a link) to open/navigate
- Arrow-key navigation, Enter to open
- Breadcrumb path bar at the top

## Known limitations (v0)

- No real thumbnails (PDF page previews, image previews) yet
- Chromium-based browsers only (Chrome, Brave, Edge), no Firefox support yet
- No list view, no sort-by-size/date, no drag-and-drop yet
- Not yet packaged for the Chrome Web Store

## License

MIT
