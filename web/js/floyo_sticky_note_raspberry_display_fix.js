/* Floyo Sticky Note — Raspberry theme + display-mode logo/edit layout
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached dispatch URL keyed by filename, so editing
 * floyo_sticky_note.js in place does NOT reach already-loaded browsers (they keep
 * running the cached old module). A new filename = a new immutable URL = a
 * guaranteed fresh fetch — the only reliable delivery in this repo.
 *
 * WHAT IT DOES (mirrors the same changes now baked into the main file):
 *   1. RASPBERRY THEME — a 5th colour. Injects the `[data-theme="raspberry"]`
 *      CSS vars + the `.swatch-raspberry` swatch colour, appends a 5th swatch
 *      button to any footer that only has 4, and wires its click to apply +
 *      persist the raspberry theme (the cached main file knows nothing about it).
 *   2. DISPLAY-MODE BOTTOM — brings the Floyo wordmark back to the bottom-LEFT
 *      (the cached "no-logo" design hid it) and moves the Edit pencil to the
 *      bottom-RIGHT next to the resize grip. The save/check + colour palette stay
 *      editor-only. The wordmark sits directly on the body (no bar behind it).
 *
 * SAFETY (this codebase has crashed the canvas before from heavy global
 * observers): NO MutationObserver, NO perpetual interval. Upgrades run from a few
 * bounded timed passes at setup + the per-node `nodeCreated` hook, each pass is a
 * cheap class-scoped querySelectorAll that skips already-upgraded nodes, and every
 * entry point is wrapped in try/catch so an error can never break ComfyUI.
 *
 * IDEMPOTENT / NO-OP against the new main-file DOM: when the fresh main file is
 * loaded it already renders the raspberry swatch + the logo/edit layout, so every
 * "inject if missing" check short-circuits and nothing is duplicated.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-raspberry-display-fix";
const FLOYO_URL = "https://www.floyo.ai";

/* Raspberry palette — kept byte-identical to THEMES.raspberry in the main file. */
const RB = {
    bg:        "#4A1234",
    bgGrad:    "linear-gradient(180deg, #4A1234 0%, #43102E 100%)",
    header:    "#3A0E28",
    hover:     "#8C1F57",
    toolbar:   "#3A0E28",
    text:      "#FCE7F3",
    textMute:  "#F9A8D4",
    accent:    "#F472B6",
    border:    "#8C1F57",
    codeBg:    "#2E0A1F",
    swatch:    "#EC4899",
};

const CSS = `
/* ── Raspberry theme (5th colour) ── */
.floyo-sticky-wrapper[data-theme="raspberry"] {
    --bg:${RB.bg}; --bg-grad:${RB.bgGrad};
    --header:${RB.header}; --hover:${RB.hover};
    --toolbar:${RB.toolbar}; --text:${RB.text};
    --text-mute:${RB.textMute}; --accent:${RB.accent};
    --border:${RB.border}; --code-bg:${RB.codeBg};
}
.floyo-swatch.swatch-raspberry { background: ${RB.swatch}; }

/* ── Display-mode bottom: Floyo wordmark left, edit + grip right ── */
/* Override the older figma-bottom-fix that hid the display logo (it targeted
   .floyo-display-logo; we use a fresh class so it never matches). */
.floyo-display-brand {
    height: 16px;
    width: auto;
    flex: 0 0 auto;
    align-self: flex-end;
    user-select: none;
    pointer-events: all;
    cursor: pointer;
    opacity: 0.95;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
}
.floyo-display-tools {
    display: inline-flex;
    align-items: flex-end;
    gap: 8px;
    flex: 0 0 auto;
    pointer-events: none;
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

/* The Floyo wordmark data-URL lives only in the main file. Rather than duplicate
   the long base64, reuse the src already on this node's editor-footer logo. */
function logoSrcFor(wrapper) {
    try {
        const existing = wrapper && wrapper.querySelector(".floyo-footer-logo");
        return existing && existing.src ? existing.src : null;
    } catch (_) { return null; }
}

/* Find the LiteGraph node that owns a given wrapper, so a raspberry click can
   re-tint the node chrome (title bar / body) and persist the choice — exactly
   what the cached main file's applyChromeTheme/onTheme would do for the built-in
   swatches, which it can't do for our injected one. */
function nodeForWrapper(wrapper) {
    try {
        const nodes = (app && app.graph && app.graph._nodes) || [];
        for (const n of nodes) {
            const ws = (n && n.widgets) || [];
            for (const w of ws) {
                const el = w && w.element;
                if (el && (el === wrapper || el.contains(wrapper))) return n;
            }
        }
    } catch (_) {}
    return null;
}

function applyRaspberryToNode(wrapper) {
    try {
        const n = nodeForWrapper(wrapper);
        if (!n) return;
        n.properties = n.properties || {};
        n.properties.theme = "raspberry";   // serialized under floyo_state.theme
        n.color   = RB.header;               // title-bar background
        n.bgcolor = RB.bg;                   // node body background
        n.boxcolor = RB.border;              // selection outline tint
        try { n.setDirtyCanvas(true, true); } catch (_) {}
    } catch (_) {}
}

function onRaspberryClick(e) {
    try {
        const sw = e.currentTarget;
        const wrapper = sw.closest(".floyo-sticky-wrapper");
        if (!wrapper) return;
        e.preventDefault();
        e.stopPropagation();
        wrapper.dataset.theme = "raspberry";
        wrapper.querySelectorAll(".floyo-swatch").forEach((s) =>
            s.classList.toggle("is-active", s === sw)
        );
        applyRaspberryToNode(wrapper);
    } catch (_) {}
}

/* Append the raspberry swatch to a footer that only has the original four, and
   wire its click here (the cached main file's wireFooter never saw it). */
function upgradeSwatches(swatches) {
    try {
        if (!swatches || swatches.querySelector(".swatch-raspberry")) return;
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "floyo-swatch swatch-raspberry";
        sw.dataset.theme = "raspberry";
        sw.title = "Raspberry theme";
        sw.addEventListener("mousedown", (ev) => { ev.preventDefault(); ev.stopPropagation(); });
        sw.addEventListener("click", onRaspberryClick);
        swatches.appendChild(sw);
    } catch (_) {}
}

/* Upgrade a cached display-actions ([edit, grip], no logo) into the new layout:
   Floyo wordmark on the left, edit + grip clustered on the right. */
function upgradeDisplayActions(actions) {
    try {
        if (!actions || actions.querySelector(".floyo-display-brand")) return; // already new
        const edit = actions.querySelector(".floyo-display-edit");
        const grip = actions.querySelector(".floyo-display-grip");
        if (!edit && !grip) return; // not the structure we expect

        const wrapper = actions.closest(".floyo-sticky-wrapper");
        const src = logoSrcFor(wrapper);
        if (!src) return; // no logo source yet — try again on the next pass

        // Wordmark (bottom-left). Swallow mousedown so a click never starts a
        // LiteGraph node-drag / marquee-select; click opens Floyo.
        const brand = document.createElement("img");
        brand.className = "floyo-display-brand";
        brand.src = src;
        brand.alt = "Floyo";
        brand.draggable = false;
        brand.title = "Open Floyo";
        brand.addEventListener("mousedown", (ev) => { ev.preventDefault(); ev.stopPropagation(); });
        brand.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            window.open(FLOYO_URL, "_blank", "noopener,noreferrer");
        });

        // Right cluster — move the existing edit + grip into it (moving a node
        // keeps its event listeners, so resize-drag + edit-click still work).
        const tools = document.createElement("div");
        tools.className = "floyo-display-tools";
        if (edit) tools.appendChild(edit);
        if (grip) tools.appendChild(grip);

        actions.insertBefore(brand, actions.firstChild);
        actions.appendChild(tools);
    } catch (_) {}
}

function pass() {
    try {
        document.querySelectorAll(".floyo-footer-swatches").forEach(upgradeSwatches);
        document.querySelectorAll(".floyo-display-actions").forEach(upgradeDisplayActions);
    } catch (_) {}
}

app.registerExtension({
    name: "Floyo.StickyNote.RaspberryDisplayFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            injectStyle();
            window.__floyoStickyRaspberryFix = true;
            // Bounded initial salvo — catches every sticky present on load as it
            // mounts. No perpetual interval (load-cost / crash risk in this repo).
            [0, 250, 700, 1500, 3000].forEach((d) => setTimeout(pass, d));
        } catch (_) {}
    },
    // Catches sticky notes the user drops later in the session.
    async nodeCreated() {
        try {
            [60, 300, 900].forEach((d) => setTimeout(pass, d));
        } catch (_) {}
    },
});
