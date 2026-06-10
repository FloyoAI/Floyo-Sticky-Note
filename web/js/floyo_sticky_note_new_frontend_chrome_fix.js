/* Floyo Sticky Note — adapt to the NEW platform frontend's node chrome
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so a new file is the
 * only delivery that reliably reaches every client.
 *
 * The updated Floyo platform frontend changed the node chrome:
 *   • Every node's footer now renders a dark rounded "package badge" pill
 *     (.rounded-full.bg-component-node-widget-background, shows the package
 *     name). On the sticky note our edit pencil sits on top of it, so it reads
 *     as a black box behind the pencil — and in editor mode the pill shows as a
 *     stray dark blob under the footer.
 *   • The chrome geometry changed: the DOM widget is inset 6px per side (was
 *     13px) and the bottom chrome strip is 21px (was 37px). Our bars positioned
 *     with the old numbers either overshoot or leave a visible gap.
 *
 * FIX (CSS only — no observers, no timers, no DOM mutation):
 *   • Hide the package badge pill inside sticky notes only (other nodes keep
 *     theirs; a sticky note never needs a package badge).
 *   • Re-pin the display icons / editor footer / editor toolbar with the new
 *     frontend's measured geometry (inset 6px, bottom gap 21px — measured live).
 *
 * Every geometry rule is GATED on the badge pill existing inside the node shell
 * (:has(...)): the pill only exists on the NEW frontend, so on the old frontend
 * these rules never match and the existing -13px/-37px rules keep working.
 * The doubled shell class + :has() argument also out-specifies the older
 * !important rules, so the new values win where the gate matches.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-new-frontend-chrome-fix";

/* Gate: a sticky-note shell rendered by the NEW frontend (badge pill present). */
const G = '.floyo-sticky-node-shell.floyo-sticky-node-shell:has(.rounded-full.bg-component-node-widget-background)';

const CSS = `
/* The package-name badge pill: never useful on a sticky note, and it renders as
   a black box behind the bottom-left edit pencil. Sticky notes only. */
.floyo-sticky-node-shell .rounded-full.bg-component-node-widget-background {
    display: none !important;
}

/* ── Display mode: pencil + grip pinned to the node's bottom corners ── */
${G} .floyo-sticky-wrapper[data-mode="display"] .floyo-display-actions {
    left: -6px !important;
    right: -6px !important;
    bottom: -21px !important;
    min-height: 24px !important;
    padding: 0 10px 6px !important;
}
${G} .floyo-sticky-wrapper[data-mode="display"] .floyo-sticky-body {
    padding-bottom: 30px !important;
}

/* ── Editor mode: full-width toolbar + footer, footer flush with the node ── */
${G} .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer {
    left: -6px !important;
    right: -6px !important;
    bottom: -21px !important;
    min-height: 34px !important;
    border-radius: 0 0 14px 14px !important;
}
${G} .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-toolbar {
    margin-left: -6px !important;
    margin-right: -6px !important;
}
${G} .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-body {
    padding-bottom: 34px !important;
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
    name: "Floyo.StickyNote.NewFrontendChromeFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            injectStyle();
            [200, 800, 2000].forEach((d) => setTimeout(injectStyle, d));
        } catch (_) {}
    },
});
