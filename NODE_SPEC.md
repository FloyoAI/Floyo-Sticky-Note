# Floyo Sticky Note — Custom ComfyUI Node Spec

## Purpose

A stylized, **canvas-only** sticky note for ComfyUI workflows. Used to annotate
and document workflows on the Floyo platform. Does **not** participate in
workflow execution — it carries no inputs or outputs and is purely a visual /
documentation artifact on the canvas.

This is the canvas-side companion to the Floyo "workflow conversion" project:
the top 50 Floyo workflows are being updated with structured on-canvas
instructions, and this node is the primary way those instructions live on the
canvas.

## Node identity

| Field | Value |
|---|---|
| Internal name | `FloyoStickyNote` |
| Display name | `📝 Floyo Sticky Note` |
| Category | `Floyo/Notes` |
| Inputs | _none_ |
| Outputs | _none_ |
| Executes | no (skipped by the prompt queue) |

## States

The node has three visual states (matching the Figma reference):

1. **Default (display)** — Title bar + rendered content. Body shows the
   rich-text content with all formatting applied. Double-click anywhere on the
   body to enter Editor mode.
2. **Minimized** — Only the title bar is visible. Chevron in the header points
   up. Click the header to expand back to display state. Useful when many
   notes are on a canvas.
3. **Editor** — Title bar + formatting toolbar + editable body + footer
   (theme swatches + save). Entered via double-click. Exited via the green
   ✓ save button in the footer, or by clicking outside the note.

## Visual design

### Themes (3 presets, selectable from footer)

| Theme | Header | Body bg | Accent | Text |
|---|---|---|---|---|
| **Purple** _(default)_ | `#7C3AED` | `#2D1B69` | `#A78BFA` | `#EDE9FE` |
| **Blue** | `#3B82F6` | `#1E3A8A` | `#60A5FA` | `#DBEAFE` |
| **Green** | `#10B981` | `#064E3B` | `#34D399` | `#D1FAE5` |

Each theme uses a subtle vertical gradient on the body and a translucent
toolbar that picks up the header tint.

### Typography

- **Default** — ComfyUI / system font stack.
- **Roboto** — loaded from Google Fonts on first node mount.
- **Arcade** — Floyo brand font; declared in CSS, falls back to system if not
  installed locally.
- **Janeiro** — Floyo brand font; declared in CSS, falls back to system if not
  installed locally.

Headings scale: H1 22px / H2 18px / H3 15px / body 13px. Heading weight 700,
body 400.

## Editor toolbar

In order, left to right:

| Button | Action | execCommand |
|---|---|---|
| H₁ | Heading 1 | `formatBlock` → `H1` |
| H₂ | Heading 2 | `formatBlock` → `H2` |
| H₃ | Heading 3 | `formatBlock` → `H3` |
| **B** | Bold | `bold` |
| *I* | Italic | `italic` |
| <u>U</u> | Underline | `underline` |
| ~~S~~ | Strikethrough | `strikeThrough` |
| Tₓ | Clear formatting | `removeFormat` |
| `</>` | Code block | `formatBlock` → `PRE` |
| • ≡ | Bullet list | `insertUnorderedList` |
| 1 ≡ | Numbered list | `insertOrderedList` |

Toolbar uses `mousedown` `preventDefault()` to avoid stealing focus from the
contenteditable body when a button is clicked.

## Interactions

| Trigger | Result |
|---|---|
| Click header chevron / header bar | Toggle minimize ↔ display |
| Double-click body (display mode) | Enter editor mode |
| Double-click title text | Edit title inline |
| Click footer color swatch | Change theme |
| Click footer ✓ save button | Persist content + exit to display mode |
| Click outside the note (editor mode) | Persist + exit to display mode |
| Drag node header | Move node (LiteGraph default) |
| Drag bottom-right corner | Resize (LiteGraph default) |

## Persistence

Saved into the workflow JSON via `node.onSerialize` under the key
`floyo_state`:

```jsonc
{
  "floyo_state": {
    "theme": "purple",
    "font": "Default",
    "minimized": false,
    "title": "K Sampler",
    "content": "<h1>...</h1><p>...</p>"
  }
}
```

Restored on workflow load via `node.onConfigure`.

## Out of scope (v1)

- Images / file embeds inside notes
- Markdown source mode (only WYSIWYG)
- Custom hex color picker (only the 3 preset themes)
- Per-note font size override (only theme-driven scale)
- Linking notes to other nodes

## Files

```
Floyo-customnode-notes/
├── __init__.py            # Node registration + WEB_DIRECTORY
├── nodes.py               # Python class (no-op backend)
├── pyproject.toml         # Package metadata
├── README.md              # User-facing docs
├── NODE_SPEC.md           # This file
└── web/
    └── js/
        └── floyo_sticky_note.js   # Full frontend widget
```
