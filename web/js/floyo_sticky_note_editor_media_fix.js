/* Floyo Sticky Note — Editor media: no horizontal scrollbar / toolbar overflow
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so an in-place edit to
 * the cached main file would not reach already-loaded browsers. A new filename
 * guarantees a fresh fetch and reliably reaches every client.
 *
 * BUG: when an image/video is inserted in the editor, a horizontal scrollbar
 * appears and the floating resize mini-toolbar (the [−][+] popup) mispositions.
 * Root cause (three compounding faults):
 *   1) REGRESSION — the editor footer was given left:-13px / right:-13px to fill
 *      the bottom chrome gap; being position:absolute it then PROTRUDES 13px past
 *      the wrapper's right edge, and the wrapper can't be clipped (the notch must
 *      overflow it) → 13px of horizontal overflow.
 *   2) The selected media's outline used outline-offset:3px, which paints ~5px
 *      past the right edge of a full-width image → counted by .floyo-sticky-body
 *      (overflow:auto) as scrollable width.
 *   3) positionMediaTools double-counted body.scrollLeft, so once any horizontal
 *      overflow existed the toolbar latched further out instead of self-correcting.
 *
 * FIX (CSS only — no observers, no timers, no DOM mutation, so it can't slow
 * startup or crash the canvas; the JS double-count + clamp is also fixed in the
 * main file for fresh installs):
 *   • .floyo-sticky-body → overflow-x:hidden (vertical scroll only) + box-sizing,
 *     so nothing in the editor body can ever produce a horizontal scrollbar.
 *   • editor footer → left:0 / right:0 so it no longer protrudes past the wrapper.
 *   • selected-media ring → outline-offset:-2px (drawn INSIDE the element) so it
 *     never paints past the media edge.
 *   • the mini-toolbar → max-width so it can never exceed the content box.
 *   • all media (img/video) → max-width:100%; height:auto; box-sizing so they
 *     auto-fit the text box width.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-editor-media-fix";

const CSS = `
/* Editor body: vertical scroll only — never a horizontal scrollbar. */
.floyo-sticky-body {
    overflow-x: hidden !important;
    overflow-y: auto !important;
    box-sizing: border-box !important;
}

/* The editor footer was pushed to left/right:-13px to fill the bottom chrome;
   that protruded past the (un-clippable) wrapper and caused horizontal overflow.
   Keep its vertical fill but stop the horizontal protrusion. The main file's rule
   is also !important at equal specificity, so double the wrapper class to win
   regardless of stylesheet order. */
.floyo-sticky-wrapper.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer {
    left: 0 !important;
    right: 0 !important;
}

/* Selection ring drawn INSIDE the media so it can't paint past the right edge. */
.floyo-sticky-body img.is-selected,
.floyo-sticky-body .floyo-embed.is-selected,
.floyo-embed.is-selected {
    outline-offset: -2px !important;
}

/* The floating resize mini-toolbar can never be wider than the content box. */
.floyo-img-tools {
    max-width: calc(100% - 16px) !important;
}

/* All inserted media auto-fits the editor's text-box width (no overflow). */
.floyo-sticky-body img,
.floyo-sticky-body video,
.floyo-sticky-editor img,
.floyo-sticky-editor video {
    max-width: 100% !important;
    height: auto !important;
    box-sizing: border-box !important;
}
`;

function injectStyle() {
    try {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
}

app.registerExtension({
    name: "Floyo.StickyNote.EditorMediaFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            injectStyle();
            [200, 800, 2000].forEach((d) => setTimeout(injectStyle, d));
        } catch (_) {}
    },
});
