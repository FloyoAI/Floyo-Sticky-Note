# Changes — branch `feat/figma-node-bottom-design`

Branched from `feat/display-footer-logo` (`dcc2d04`). Date: **2026-06-09**.

> This branch implements the **no-logo** node design (Figma 902-277). The old
> design with the Floyo logo at the bottom lives on `feat/display-footer-logo`.

---

## 🎨 Bottom design (no logo)
- Removed the Floyo logo and the coloured bottom bar from display mode — the node's own background shows through, so the body reads as one seamless panel to the rounded bottom corners. — `1bc6fda`
- Edit pencil moved to **bottom-left** (bare, muted icon — no box); resize grip stays **bottom-right**.
- Shipped reliably via a cache-bust file (`floyo_sticky_note_figma_bottom_fix.js`) so already-loaded browsers get it. — `8a0c5b1`

## 🔻 Directional notch (arrow) polish
- **Thinner outline** on the notch in all 4 directions (less border colour showing). — `2e82d5e`
- **Down arrow** now matches the **body colour** in display mode (since the bottom bar was removed), and keeps the header colour in editor mode.

## 🖊️ Editor — media (image / video)
- Fixed the **horizontal scrollbar** when inserting an image/video (`overflow-x:hidden` on the body); the resize `[−][+]` toolbar now stays inside the content box. — `f2e1dc0`, `78b1962`
- Fixed the **video embed**: removed the black bar at the top of the thumbnail, and the resize toolbar no longer clips (anchored from the right edge). — `3b66084`
- All inserted media auto-fits the text box (max-width 100%, height auto).

## 📐 Editor — toolbar & footer
- Editor **toolbar and footer are full-width** again (to the node edges, like the title bar) — removed the side gap; the toolbar now fits on one row. — `32e3d8e`

## 🔗 Editor — link insert
- Inserting a **link** (or image/video) no longer jumps the note to the **top** — the cursor/scroll stays exactly where the text was selected. Re-focus uses `preventScroll` + pins the scroll. — `9627f57`
- Plus a cache-bust safety net (`floyo_sticky_note_editor_modal_scroll_fix.js`).

---

### Safety
All fixes are CSS-only or small JS — **no new MutationObservers / timers**, so ComfyUI startup is not slowed and the canvas does not crash on node load.

### Commits (newest → oldest)
| Commit | Summary |
| --- | --- |
| `9627f57` | Keep editor scroll position when inserting a link from the modal |
| `32e3d8e` | Make editor toolbar and footer full-width again (no side gap) |
| `3b66084` | Fix video embed: thumbnail black bar + resize toolbar clipped |
| `78b1962` | Make editor footer un-protrude rule win the cascade |
| `f2e1dc0` | Fix editor media: no horizontal scrollbar, toolbar stays in bounds |
| `2e82d5e` | Polish notch: thinner outline + mode-aware down fill |
| `8a0c5b1` | Ship no-logo bottom design as a cache-bust file |
| `1bc6fda` | Add no-logo bottom design (Figma 902-277) |
