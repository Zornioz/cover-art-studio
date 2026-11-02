# CoverArt Studio

Cover art and glitch effect editor. Runs as a desktop app (Electron) and as a pure web app.

## Try it online

**https://zornioz.github.io/cover-art-studio**

No installation needed. Works in any current browser (Chrome, Edge, Safari, Firefox).

## Web version (GitHub Pages)

```
npm run dev:web      # local dev server
npm run build:web    # static build into dist-web/
npm run preview:web  # preview the build locally
```

`dist-web/` is fully static (relative paths) and can be hosted in any subfolder.
Deployment runs through GitHub Actions: `.github/workflows/pages.yml` (repo → Settings → Pages → Source: *GitHub Actions*).

Differences from the desktop version: saving and exporting happen as browser downloads, and images/projects are opened
through the file picker. MP4/WebM are encoded directly in the browser using WebCodecs (requires a current Chrome, Edge,
Safari or Firefox); GIF/PNG/JPG work everywhere.

## Windows EXE

```
npm run build:win
```

Produces in `release/`:

- `CoverArt Studio-<version>-portable.exe` – single file, runs without installation
- `CoverArt Studio-<version>-setup.exe` – installer

`scripts/build-win.mjs` works around electron-builder's symlink error (winCodeSign) on Windows without admin rights or
Developer Mode. The EXEs are not code-signed, so Windows SmartScreen shows a warning on first launch.

## "Open with" in the right-click menu (Windows)

The desktop app opens files passed to it at startup (PNG, JPG, WebP and `.coverart` projects).
If it is already running, the file is loaded into the existing window.

**With the installer (`…-setup.exe`)** – nothing else to do:

- Right-click an image → *Open with* → *CoverArt Studio* (listed for PNG, JPG, JPEG and WebP).
  The default viewer for these file types stays unchanged.
- `.coverart` projects are associated with CoverArt Studio: double-clicking opens them directly.
- On Windows 11, *Open with* is in the classic menu: *Show more options* (or `Shift` + right-click).
- Uninstalling removes the entries again.

**With the portable EXE** – a one-time manual step:

1. Right-click an image → *Open with* → *Choose another app*.
2. *More apps* → scroll to the bottom → *Look for another app on this PC* and select the `…-portable.exe`.
3. Do **not** tick "Always use this app" if the current default should stay.

Windows remembers the path of the EXE. If you move the file, repeat the step once.
Alternatively, drag and drop an image or `.coverart` file onto the EXE.

The registration lives in `resources/installer.nsh` (images) and `electron-builder.yml` → `fileAssociations` (`.coverart`).
