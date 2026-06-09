/* Floyo Sticky Note — Display-mode bottom redesign (Figma 902-277)
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): Floyo's hosted ComfyUI loads each
 * extension JS from an immutable, edge-cached URL keyed by filename, so editing
 * floyo_sticky_note.js in place does NOT reach already-loaded browsers (they keep
 * running the cached old module). A new filename = a new immutable URL = a
 * guaranteed fresh fetch, so this is how design changes are shipped here.
 *
 * WHAT IT DOES — matches the Figma 902-277 spec for the display-mode bottom:
 *   • NO Floyo logo (the design has none).
 *   • NO coloured bottom bar — the wrapper over the node's footer chrome is made
 *     TRANSPARENT, so the node's own background colour shows through and the body
 *     reads as one seamless panel down to the rounded bottom corners (just like
 *     the top title bar has no bottom border).
 *   • Edit pencil pinned bottom-LEFT as a bare muted icon (no black box).
 *   • Resize grip stays bottom-RIGHT, a touch more visible.
 *
 * Implemented as pure CSS overrides (one injected <style>): it both restyles the
 * OLD cached DOM (logo + .floyo-display-right wrapper + black-box edit) into the
 * new look AND is a harmless no-op against the new main-file DOM. No DOM
 * mutation, no MutationObserver, no timer — nothing that could storm the canvas
 * on load. Theme colours are untouched (each fill/outline already matches Figma).
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-figma-bottom-fix";

const CSS = `
/* No logo in the Figma 902-277 design. */
.floyo-display-logo { display: none !important; }

/* If the cached DOM still wraps edit+grip in .floyo-display-right, let it span
   the full width so the edit pencil sits left and the resize grip sits right. */
.floyo-display-actions .floyo-display-right {
    flex: 1 1 auto !important;
    width: 100% !important;
    justify-content: space-between !important;
}

/* Display-mode bottom: no bar. Transparent wrapper over the footer chrome so the
   node's background shows through; affordances pinned to the bottom corners. */
.floyo-sticky-wrapper[data-mode="display"] .floyo-display-actions {
    left: -13px !important;
    right: -13px !important;
    bottom: -37px !important;
    min-height: 37px !important;
    padding: 0 12px 9px !important;
    box-sizing: border-box !important;
    align-items: flex-end !important;
    background: transparent !important;
    border-top: none !important;
    border-radius: 0 !important;
}

/* Edit pencil — bare muted icon, no black box. The inline white pencil reads on
   every theme at low opacity, and brightens on hover. */
.floyo-display-edit {
    width: 16px !important;
    height: 16px !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    opacity: 0.5 !important;
    transition: opacity 120ms ease !important;
}
.floyo-display-edit:hover { opacity: 0.85 !important; transform: none !important; box-shadow: none !important; }
.floyo-display-edit:active { opacity: 1 !important; transform: none !important; }
.floyo-display-edit svg { width: 13px !important; height: 13px !important; display: block !important; }

/* Resize grip — a touch more visible to match the design. */
.floyo-display-grip { opacity: 0.45 !important; }
`;

function injectStyle() {
    try {
        const doc = document;
        if (doc.getElementById(STYLE_ID)) return;
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        (doc.head || doc.documentElement).appendChild(style);
    } catch (_) {}
}

app.registerExtension({
    name: "Floyo.StickyNote.FigmaBottomFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            injectStyle();
            // The style lives in <head> for the page's lifetime; re-assert a few
            // times in case another extension's stylesheet lands later, then stop.
            [200, 800, 2000].forEach((d) => setTimeout(injectStyle, d));
        } catch (_) {}
    },
});
