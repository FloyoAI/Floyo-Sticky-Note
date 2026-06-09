/* Floyo Sticky Note — Notch polish (branch feat/figma-node-bottom-design)
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): Floyo's hosted ComfyUI loads each
 * extension JS from an immutable, edge-cached URL keyed by filename, so an
 * in-place edit to the cached notch files would not reach already-loaded
 * browsers. A new filename guarantees a fresh fetch.
 *
 * Two CSS-only refinements to the directional notch (the speech-bubble arrow):
 *
 * (1) THINNER OUTLINE — all 4 directions (up/down/left/right).
 *     The notch is an outer border triangle (::before, var(--floyo-sticky-border))
 *     with a slightly smaller inner fill triangle (::after). The visible OUTLINE
 *     is the rim of the outer showing past the inner. notch_stabilize_fix derives
 *     the inner triangle as base-1 / reach-0.5, which left a heavier-than-wanted
 *     border rim. We shrink that delta to base-0.5 / reach-0.25 so the rim reads
 *     as a thin hairline matching the card's own 1px border. We override the
 *     inner CSS vars with !important (which beats the stabilize fix's INLINE
 *     writes) — we do NOT add a JS writer, so there is no multi-writer fight and
 *     no flicker. The +3px ::after seam-cover (in the main file) is untouched, so
 *     the joint where the notch meets the card stays seamless.
 *
 * (2) DOWN-NOTCH FILL is mode-aware.
 *     On this no-logo / no-bar branch the display-mode bottom is the body colour
 *     (the bottom bar was removed), so a DOWN arrow should match the body — not
 *     the header colour the stabilize fix fills up/down with. We override the
 *     down ::after BACKGROUND directly (never the --floyo-sticky-notch-fill var,
 *     so the stabilize writer is never fought) to var(--floyo-sticky-bg) when the
 *     wrapper is in DISPLAY mode. In EDITOR mode — where a footer bar still
 *     exists — the default header fill is kept, as requested. data-pointer-dir is
 *     on the OUTER .floyo-sticky-node-shell and data-mode on the INNER
 *     .floyo-sticky-wrapper, so we select across them with :has(). Four shell
 *     classes + :has() out-specifies the main file's triple-class !important rule.
 *
 * Pure CSS: one injected <style>, NO MutationObserver, NO setInterval, NO DOM
 * mutation — nothing that can slow ComfyUI startup or crash the canvas on load.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-notch-polish-fix";

const CSS = `
/* (1) Thinner notch outline — all directions. Shrinks the inner/outer delta so
   less of the border-colour rim shows. !important beats the stabilize fix's
   inline inner-var writes; we never write the vars from JS (no writer fight). */
.floyo-sticky-node-shell.floyo-sticky-node-shell.floyo-sticky-node-shell {
    --floyo-notch-inner-base: calc(var(--floyo-notch-base) - 0.5px) !important;
    --floyo-notch-inner-reach: calc(var(--floyo-notch-reach) - 0.25px) !important;
}

/* (2) DOWN notch fill = body colour in DISPLAY mode (editor keeps the header
   fill). Override the ::after background directly so the stabilize fix's
   --floyo-sticky-notch-fill writes are irrelevant for the down notch. */
.floyo-sticky-node-shell.floyo-sticky-node-shell.floyo-sticky-node-shell.floyo-sticky-node-shell[data-pointer-dir="down"]:has(.floyo-sticky-wrapper[data-mode="display"])::after {
    background: var(--floyo-sticky-bg) !important;
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
    name: "Floyo.StickyNote.NotchPolishFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            injectStyle();
            // Re-assert a few times in case another extension's stylesheet lands
            // later, then stop. No perpetual timer.
            [200, 800, 2000].forEach((d) => setTimeout(injectStyle, d));
        } catch (_) {}
    },
});
