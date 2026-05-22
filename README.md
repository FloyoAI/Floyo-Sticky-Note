# Floyo Sticky Note

A stylised, canvas-only sticky-note node for **ComfyUI**, designed for the
Floyo workflow library. Use it to document and annotate workflows directly
on the canvas — the node carries no inputs or outputs and is skipped by the
prompt queue at run time.

![States: default / minimized / editor](image.png)

## Features

- **Three states** — default (display), minimised (just the header), and a
  full WYSIWYG editor mode (double-click the body to enter).
- **Rich-text toolbar** — H₁ / H₂ / H₃, **Bold**, *Italic*, <u>Underline</u>,
  ~~Strikethrough~~, clear formatting, inline `code`, code blocks, bullet
  lists, numbered lists.
- **Three brand themes** — Purple (default), Blue, Green. Pick from the
  footer swatches.
- **Font picker** — Default, Roboto, Arcade (Floyo), Janeiro (Floyo).
- **Editable title** — double-click the title text to rename.
- **Persists with the workflow** — full state lives in the workflow JSON
  under the node's `floyo_state` key.
- **Click-outside-to-save** — clicking anywhere off the note in editor mode
  saves and returns to display.

## Install

### Option A — Drop into `custom_nodes/`

```bash
cd /path/to/ComfyUI/custom_nodes
git clone <this-repo> Floyo-customnode-notes
```

Then restart ComfyUI. The node appears under **Add Node → Floyo → Notes →
📝 Floyo Sticky Note**.

### Option B — Manual copy

Copy this directory (`Floyo-customnode-notes/`) into your ComfyUI
`custom_nodes/` folder and restart ComfyUI.

## Usage

1. **Add Node → Floyo → Notes → 📝 Floyo Sticky Note**
2. Double-click the body to enter editor mode.
3. Use the toolbar to format text. Pick a theme/font from the footer.
4. Click the green ✓ button (or click anywhere off the note) to save and
   return to display mode.
5. Click the header bar (or the chevron) to minimise the note.
6. Double-click the title text to rename the note.

## Files

```
Floyo-customnode-notes/
├── __init__.py            # Registration + WEB_DIRECTORY
├── nodes.py               # Backend (no-op)
├── pyproject.toml         # Package metadata
├── README.md              # This file
├── NODE_SPEC.md           # Full design spec
├── image.png              # Reference screenshot from Figma
└── web/
    └── js/
        └── floyo_sticky_note.js
```

## Architecture

- **Backend** (`nodes.py`) — defines `FloyoStickyNote` with no inputs/outputs
  and a no-op `noop()` function. With nothing depending on its output, the
  ComfyUI prompt queue never executes this node.
- **Frontend** (`web/js/floyo_sticky_note.js`) — registers a ComfyUI
  extension that hooks `onNodeCreated` for `FloyoStickyNote` and attaches a
  single full-node DOM widget containing the header, toolbar, body and
  footer. All editing happens in a `contentEditable` div via
  `document.execCommand`. Persistence uses `onSerialize` / `onConfigure`.

## Troubleshooting

**The node doesn't show up in the Add Node menu.**
Check the ComfyUI server console where you launched ComfyUI — Python
import failures are printed there. The most common cause is the package
folder not being placed directly under `custom_nodes/`.

**The widget shows up but the editor toolbar buttons do nothing.**
Open the browser dev console. The widget logs errors prefixed with
`[Floyo Sticky Note]`. Most likely a `document.execCommand` was disabled in
your browser — try Chrome / Edge / Brave.

**My custom Arcade / Janeiro fonts aren't applied.**
Those are Floyo brand fonts and must be installed on the host machine (or
served by the surrounding web app) for the browser to pick them up. The CSS
falls back to system fonts otherwise.

## License

MIT.
