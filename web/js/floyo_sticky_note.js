/**
 * Floyo Sticky Note — frontend widget.
 *
 * The LiteGraph node chrome is themed to look like the purple/blue/green
 * sticky note — title bar is the header, body is the dark gradient. A
 * DOM widget inside renders the rich-text content, with a formatting
 * toolbar + theme/font footer that appear when the user enters editor
 * mode (double-click the body). Native LiteGraph collapse handles the
 * "minimized" state. Persistence via onSerialize / onConfigure under
 * the `floyo_state` key.
 *
 * The node carries no inputs and no outputs, so the ComfyUI prompt queue
 * skips it entirely — this node is purely a LiteGraph canvas artifact.
 */

import { app } from "../../../scripts/app.js";

// Top-level marker — if you don't see this in the browser console then the
// JS file is not being loaded by ComfyUI at all.
console.log("[Floyo Sticky Note] module loaded");

/* ─── Asset URLs (resolved relative to this JS file) ──────────────────── */
//
// ComfyUI serves the package's `web/` folder at /extensions/<pkg>/. By
// resolving the URL from `import.meta.url` we don't have to hard-code the
// package name — it works regardless of what folder name the user clones
// the repo into.
const ASSETS_URL = new URL("../assets/", import.meta.url).href;
const FLOYO_LOGO = `${ASSETS_URL}floyo-logo.png`;
const YO_LOGO    = `${ASSETS_URL}yo-circle.png`;
const ARCADE_OTF = `${ASSETS_URL}ArcadePixelNeue.otf`;

// Preload the Arcade font so the title text renders with it without a
// flash of the system fallback. The CSS @font-face below is the canonical
// declaration; this `FontFace` add just guarantees a load promise.
(async function loadArcadeFont() {
    try {
        const face = new FontFace("ArcadePixelNeue", `url("${ARCADE_OTF}")`);
        await face.load();
        document.fonts.add(face);
        // Force any node currently on the canvas to repaint with the new font.
        app?.graph?.setDirtyCanvas?.(true, true);
        console.log("[Floyo Sticky Note] Arcade font loaded");
    } catch (e) {
        console.warn("[Floyo Sticky Note] Arcade font load failed:", e);
    }
})();

/* ─── Themes ──────────────────────────────────────────────────────────── */

const THEMES = {
    purple: {
        bg:         "#2D1B69",
        bgGradient: "linear-gradient(180deg, #3D2876 0%, #241354 100%)",
        header:     "#7C3AED",
        headerHover:"#8B5CF6",
        toolbar:    "rgba(20, 8, 56, 0.55)",
        text:       "#EDE9FE",
        textMuted:  "#C4B5FD",
        accent:     "#A78BFA",
        border:     "#5B21B6",
        codeBg:     "#1A0F3D",
        swatch:     "#A78BFA",
    },
    blue: {
        bg:         "#1E3A8A",
        bgGradient: "linear-gradient(180deg, #2B4FC9 0%, #17307A 100%)",
        header:     "#3B82F6",
        headerHover:"#60A5FA",
        toolbar:    "rgba(7, 21, 70, 0.55)",
        text:       "#DBEAFE",
        textMuted:  "#93C5FD",
        accent:     "#60A5FA",
        border:     "#1D4ED8",
        codeBg:     "#0F1E5C",
        swatch:     "#60A5FA",
    },
    green: {
        bg:         "#064E3B",
        bgGradient: "linear-gradient(180deg, #0A6849 0%, #04382A 100%)",
        header:     "#10B981",
        headerHover:"#34D399",
        toolbar:    "rgba(2, 32, 22, 0.55)",
        text:       "#D1FAE5",
        textMuted:  "#6EE7B7",
        accent:     "#34D399",
        border:     "#047857",
        codeBg:     "#022C20",
        swatch:     "#34D399",
    },
};

const DEFAULT_THEME = "purple";
const FONT_OPTIONS = ["Default", "Arcade", "Janeiro", "Roboto"];
const DEFAULT_TITLE = "Floyo Sticky Note";
// NOTE: the title lives in the LiteGraph title bar, not in the body —
// so we don't duplicate it as an <h1> here.
const DEFAULT_CONTENT = `<p>Use this sticky note to document and annotate your workflow on the canvas.</p>
<p><b>Double-click</b> anywhere in this body to enter the editor and start writing.</p>
<p>Double-click the <b>title bar</b> above to rename this note.</p>`;

/* ─── Inject styles + Google Fonts (once) ─────────────────────────────── */

const STYLE_ID = "floyo-sticky-note-styles";
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

@font-face {
    font-family: 'ArcadePixelNeue';
    src: url('${ARCADE_OTF}') format('opentype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}

.floyo-sticky-wrapper {
    --bg:        ${THEMES.purple.bg};
    --bg-grad:   ${THEMES.purple.bgGradient};
    --header:    ${THEMES.purple.header};
    --hover:     ${THEMES.purple.headerHover};
    --toolbar:   ${THEMES.purple.toolbar};
    --text:      ${THEMES.purple.text};
    --text-mute: ${THEMES.purple.textMuted};
    --accent:    ${THEMES.purple.accent};
    --border:    ${THEMES.purple.border};
    --code-bg:   ${THEMES.purple.codeBg};

    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    /* Transparent — the themed LiteGraph chrome provides the background.
       Avoids a "frame inside a frame" look. */
    background: transparent;
    border: none;
    border-radius: 0;
    overflow: hidden;
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 13px;
    line-height: 1.55;
}

/* Theme overrides */
.floyo-sticky-wrapper[data-theme="blue"] {
    --bg:${THEMES.blue.bg}; --bg-grad:${THEMES.blue.bgGradient};
    --header:${THEMES.blue.header}; --hover:${THEMES.blue.headerHover};
    --toolbar:${THEMES.blue.toolbar}; --text:${THEMES.blue.text};
    --text-mute:${THEMES.blue.textMuted}; --accent:${THEMES.blue.accent};
    --border:${THEMES.blue.border}; --code-bg:${THEMES.blue.codeBg};
}
.floyo-sticky-wrapper[data-theme="green"] {
    --bg:${THEMES.green.bg}; --bg-grad:${THEMES.green.bgGradient};
    --header:${THEMES.green.header}; --hover:${THEMES.green.headerHover};
    --toolbar:${THEMES.green.toolbar}; --text:${THEMES.green.text};
    --text-mute:${THEMES.green.textMuted}; --accent:${THEMES.green.accent};
    --border:${THEMES.green.border}; --code-bg:${THEMES.green.codeBg};
}

/* ── Toolbar (editor mode only) ── */
.floyo-sticky-toolbar {
    flex: 0 0 auto;
    display: none;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: 6px 8px;
    background: var(--toolbar);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.22);
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-toolbar { display: flex; }
.floyo-tool-btn {
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    border-radius: 6px;
    height: 26px;
    min-width: 28px;
    padding: 0 6px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, border-color 120ms ease;
}
.floyo-tool-btn:hover {
    background: rgba(255, 255, 255, 0.10);
    border-color: rgba(255, 255, 255, 0.15);
}
.floyo-tool-btn:active { background: rgba(255, 255, 255, 0.18); }
.floyo-tool-btn.is-active {
    background: var(--accent);
    color: #0F0820;
}
.floyo-tool-btn.tool-bold      { font-weight: 800; }
.floyo-tool-btn.tool-italic    { font-style: italic; }
.floyo-tool-btn.tool-underline { text-decoration: underline; }
.floyo-tool-btn.tool-strike    { text-decoration: line-through; }
.floyo-tool-sep {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.18);
    margin: 0 4px;
}

/* ── Body (display + editor share this slot) ── */
.floyo-sticky-body {
    flex: 1 1 auto;
    overflow: auto;
    padding: 12px 14px;
    min-height: 0;
    position: relative;
}
.floyo-sticky-display, .floyo-sticky-editor {
    outline: none;
    color: var(--text);
    word-wrap: break-word;
}
.floyo-sticky-editor {
    display: none;
    min-height: 100%;
    caret-color: var(--accent);
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-editor  { display: block; }
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-display { display: none; }

/* Rich-text styles inside body */
.floyo-sticky-body h1 {
    font-size: 22px; font-weight: 700; margin: 4px 0 8px;
    letter-spacing: -0.2px; color: var(--text);
}
.floyo-sticky-body h2 {
    font-size: 18px; font-weight: 700; margin: 14px 0 6px;
    color: var(--text);
}
.floyo-sticky-body h3 {
    font-size: 15px; font-weight: 700; margin: 12px 0 4px;
    color: var(--text);
}
.floyo-sticky-body p { margin: 6px 0; }
.floyo-sticky-body b, .floyo-sticky-body strong { font-weight: 700; color: #fff; }
.floyo-sticky-body i, .floyo-sticky-body em { font-style: italic; }
.floyo-sticky-body u { text-decoration: underline; text-decoration-thickness: 1.5px; }
.floyo-sticky-body s, .floyo-sticky-body strike { text-decoration: line-through; }
.floyo-sticky-body code {
    font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
    font-size: 12px;
    background: var(--code-bg);
    padding: 1px 5px;
    border-radius: 4px;
    color: var(--accent);
}
.floyo-sticky-body pre {
    font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
    font-size: 12px;
    background: var(--code-bg);
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    overflow-x: auto;
    color: var(--accent);
    margin: 8px 0;
    white-space: pre-wrap;
}
.floyo-sticky-body ul, .floyo-sticky-body ol { margin: 6px 0; padding-left: 22px; }
.floyo-sticky-body li { margin: 2px 0; }
.floyo-sticky-body a { color: var(--accent); text-decoration: underline; }
.floyo-sticky-body ::selection { background: var(--accent); color: #0F0820; }

/* ── Embedded media (image-by-URL + video-by-URL) ── */
.floyo-sticky-body img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: block;
    margin: 8px 0;
    background: rgba(0, 0, 0, 0.25);
}
.floyo-embed {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%;   /* 16:9 aspect ratio */
    margin: 8px 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: var(--code-bg);
}
.floyo-embed iframe {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    border: none;
}

/* ── Footer (editor mode only) ── */
.floyo-sticky-footer {
    flex: 0 0 auto;
    display: none;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--toolbar);
    border-top: 1px solid rgba(0, 0, 0, 0.22);
    min-height: 42px;
    box-sizing: border-box;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer { display: flex; }

/* Floyo full-wordmark logo on the bottom-left. */
.floyo-footer-logo {
    height: 22px;
    width: auto;
    flex: 0 0 auto;
    user-select: none;
    pointer-events: none;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
}

/* Center cluster — swatches + font dropdown — fills the available
   space so the logo sits left and the compass + save sit right. */
.floyo-footer-center {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1 1 auto;
    justify-content: center;
}

.floyo-footer-pointer {
    color: var(--text-mute);
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex: 0 0 auto;
}
.floyo-pointer-svg { display: block; width: 24px; height: 24px; }
.floyo-pointer-arrow {
    fill: var(--text-mute);
    opacity: 0.65;
    cursor: pointer;
    transition: fill 120ms ease, opacity 120ms ease, transform 120ms ease;
    transform-origin: 12px 12px;
}
.floyo-pointer-arrow:hover {
    fill: var(--accent);
    opacity: 1;
}
.floyo-pointer-arrow.is-active {
    fill: #fff;
    opacity: 1;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.55));
}
.floyo-footer-swatches { display: flex; gap: 6px; }
.floyo-swatch {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    padding: 0;
    transition: transform 120ms ease, border-color 120ms ease;
}
.floyo-swatch:hover { transform: scale(1.12); border-color: rgba(255,255,255,0.6); }
.floyo-swatch.is-active { border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.18); }
.floyo-swatch.swatch-purple { background: ${THEMES.purple.swatch}; }
.floyo-swatch.swatch-blue   { background: ${THEMES.blue.swatch}; }
.floyo-swatch.swatch-green  { background: ${THEMES.green.swatch}; }

.floyo-footer-font {
    background: rgba(255,255,255,0.08);
    color: var(--text);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    font: inherit;
    font-size: 11px;
    height: 22px;
    padding: 0 6px;
    cursor: pointer;
    outline: none;
}
.floyo-footer-font:hover { border-color: rgba(255,255,255,0.3); }

.floyo-footer-save {
    background: var(--accent);
    color: #0F0820;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease;
    padding: 0;
}
.floyo-footer-save:hover {
    transform: scale(1.08);
    box-shadow: 0 0 0 3px rgba(255,255,255,0.15);
}

/* Font choices */
.floyo-sticky-wrapper[data-font="Roboto"]  { font-family: "Roboto", sans-serif; }
.floyo-sticky-wrapper[data-font="Arcade"]  { font-family: "ArcadePixelNeue", "Arcade", "Courier New", monospace; }
.floyo-sticky-wrapper[data-font="Janeiro"] { font-family: "Janeiro", "Helvetica Neue", sans-serif; }

/* ── URL-insert modal (matches Figma "Insert Image URL" / "Insert YouTube
      URL or Vimeo URL" popups: title, input, Cancel + OK buttons) ── */
.floyo-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    backdrop-filter: blur(2px);
}
.floyo-modal {
    background: #FFFFFF;
    color: #111;
    border-radius: 14px;
    padding: 20px 22px 18px;
    width: min(420px, calc(100% - 40px));
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
}
.floyo-modal-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
    color: #1F1F1F;
}
.floyo-modal-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 13px;
    border: 1px solid #D6D6D6;
    border-radius: 8px;
    outline: none;
    box-sizing: border-box;
    background: #fff;
    color: #111;
    transition: border-color 120ms ease, box-shadow 120ms ease;
}
.floyo-modal-input:focus {
    border-color: ${THEMES.purple.header};
    box-shadow: 0 0 0 3px ${THEMES.purple.header}22;
}
.floyo-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    justify-content: stretch;
}
.floyo-modal-btn {
    flex: 1 1 0;
    height: 38px;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 120ms ease, transform 120ms ease;
}
.floyo-modal-btn:hover  { filter: brightness(0.95); }
.floyo-modal-btn:active { transform: translateY(1px); }
.floyo-modal-cancel { background: #F5C518; color: #2A1F00; }
.floyo-modal-ok     { background: #22C55E; color: #052E17; }

/* — Image-modal extras: "or" divider + "Choose from disk" button — */
.floyo-modal-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 10px;
    font-size: 11px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.floyo-modal-divider::before,
.floyo-modal-divider::after {
    content: "";
    flex: 1 1 0;
    height: 1px;
    background: #E5E5E5;
}
.floyo-modal-file {
    width: 100%;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    color: ${THEMES.purple.header};
    background: #F3EEFD;
    border: 1.5px dashed ${THEMES.purple.header}80;
    border-radius: 8px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
}
.floyo-modal-file:hover {
    background: #EBE3FB;
    border-color: ${THEMES.purple.header};
}

/* Scrollbar polish */
.floyo-sticky-body::-webkit-scrollbar { width: 8px; height: 8px; }
.floyo-sticky-body::-webkit-scrollbar-track { background: transparent; }
.floyo-sticky-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.12);
    border-radius: 4px;
}
.floyo-sticky-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.22);
}
`;

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLES;
    document.head.appendChild(style);
}

/* ─── Extension registration ──────────────────────────────────────────── */

app.registerExtension({
    name: "Floyo.StickyNote",
    async beforeRegisterNodeDef(nodeType, nodeData /*, app */) {
        if (nodeData.name !== "FloyoStickyNote") return;
        console.log("[Floyo Sticky Note] patching node class FloyoStickyNote");

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments);
            try {
                console.log("[Floyo Sticky Note] onNodeCreated — setting up widget");
                setupStickyNote(this);
                console.log("[Floyo Sticky Note] setup complete");
            } catch (err) {
                console.error("[Floyo Sticky Note] setup failed:", err);
            }
            return r;
        };
    },
});

/* ─── Per-node setup ─────────────────────────────────────────────────── */

function setupStickyNote(node) {
    injectStyles();

    // ── State (persisted to workflow JSON) ──
    node.properties = node.properties || {};
    node.properties.theme      ??= DEFAULT_THEME;
    node.properties.font       ??= "Default";
    node.properties.title      ??= DEFAULT_TITLE;
    node.properties.content    ??= DEFAULT_CONTENT;
    node.properties.pointerDir ??= null;   // null | "up" | "down" | "left" | "right"

    // ── Theme the LiteGraph node chrome so the title bar + body
    //    become the sticky-note design. The chrome IS the header — no
    //    separate in-DOM header, so there's no "outer box" feel anymore.
    function applyChromeTheme() {
        const t = THEMES[node.properties.theme] || THEMES[DEFAULT_THEME];
        node.color    = t.header;   // title-bar background
        node.bgcolor  = t.bg;       // node body background
        node.boxcolor = t.border;   // selection outline tint
        node.setDirtyCanvas(true, true);
    }
    applyChromeTheme();

    // Hide LiteGraph's built-in title text — we draw our own in the
    // title-bar zone using the Arcade font (see onDrawForeground below).
    // Setting `node.title = ""` is not enough because LiteGraph's
    // `getTitle()` falls back to `node.constructor.title` (the registered
    // display name) when title is falsy — that's what was producing the
    // double-rendered title. Overriding `getTitle()` to always return ""
    // short-circuits the fallback. node.properties.title remains the
    // source of truth and is what we actually draw.
    node.title = "";
    node.getTitle = function () { return ""; };

    // ── DOM ──
    const wrapper = document.createElement("div");
    wrapper.className = "floyo-sticky-wrapper";
    wrapper.dataset.theme = node.properties.theme;
    wrapper.dataset.font = node.properties.font;
    wrapper.dataset.mode = "display";

    // Toolbar (visible only in editor mode)
    const toolbar = createToolbar();

    // Body
    const body = document.createElement("div");
    body.className = "floyo-sticky-body";
    const display = document.createElement("div");
    display.className = "floyo-sticky-display";
    display.innerHTML = node.properties.content;
    const editor = document.createElement("div");
    editor.className = "floyo-sticky-editor";
    editor.contentEditable = "true";
    editor.spellcheck = false;
    editor.innerHTML = node.properties.content;
    body.append(display, editor);

    // Footer (visible only in editor mode)
    const footer = createFooter();

    wrapper.append(toolbar, body, footer);

    // ── Attach as a DOM widget that fills the entire node ──
    const widget = node.addDOMWidget("floyo_sticky", "div", wrapper, {
        serialize: false,
        hideOnZoom: false,
    });
    // Report a fixed minimum size — don't echo back `node.size[1]` which
    // creates a feedback loop where the node enlarges on every layout
    // pass. ComfyUI will stretch the DOM widget to fill whatever the user
    // has manually resized the node to.
    widget.computeSize = function () { return [0, 0]; };

    // ── Mode helpers ──
    function enterEditor() {
        wrapper.dataset.mode = "editor";
        editor.innerHTML = display.innerHTML;
        // Ensure enough height for toolbar + footer
        if (node.size[1] < 320) node.setSize([Math.max(node.size[0], 360), 480]);
        node.setDirtyCanvas(true, true);
        setTimeout(() => {
            editor.focus();
            placeCaretAtEnd(editor);
            refreshToolbarState();
        }, 0);
    }

    function exitEditor() {
        node.properties.content = editor.innerHTML;
        display.innerHTML = editor.innerHTML;
        wrapper.dataset.mode = "display";
        node.setDirtyCanvas(true, true);
    }

    // ── Body interactions ──
    display.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        enterEditor();
    });

    // ── Title rename via double-click on the title-bar zone ──
    // pos is in the node's local coords; title-bar zone is y < 0
    // (LiteGraph passes the body-relative ctx, so the title bar is above 0).
    const titleH = (window.LiteGraph?.NODE_TITLE_HEIGHT) ?? 30;
    node.onDblClick = function (e, pos /*, graphCanvas */) {
        if (pos && pos[1] <= 0 && Math.abs(pos[1]) <= titleH + 4) {
            const next = window.prompt("Rename note:", node.properties.title || DEFAULT_TITLE);
            if (next != null) {
                node.properties.title = next.trim() || DEFAULT_TITLE;
                // node.title stays "" so LiteGraph doesn't double-render.
                node.setDirtyCanvas(true, true);
            }
            return true; // consume — don't let LiteGraph open subgraph etc.
        }
        return false;
    };

    // ── Pointer-arrow rendering on the LiteGraph canvas ──
    // Draws (a) the title text in the Arcade font in the title-bar zone,
    // (b) a triangular speech-bubble notch protruding from the selected
    // side of the node when a pointer direction is set. The ctx LiteGraph
    // passes is translated so (0,0) is the top-left of the body — the
    // title bar lives at y ∈ [-titleH, 0].
    const onDrawForeground = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        onDrawForeground?.apply(this, arguments);
        if (!node.size) return;
        const [w, h] = node.size;
        const t = THEMES[node.properties.theme] || THEMES[DEFAULT_THEME];

        // ── 1. Custom title text in Arcade font ──
        if (node.properties.title) {
            ctx.save();
            ctx.font = `bold 16px "ArcadePixelNeue", "Courier New", monospace`;
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.textAlign = "left";
            // Leave room for LiteGraph's collapse dot (~22px from the left).
            ctx.fillText(node.properties.title, 26, -titleH / 2 + 1);
            ctx.restore();
        }

        // ── 2. Direction notch (Matt's feedback) ──
        // Speech-bubble-style triangle attached to the selected edge so
        // the reader can tell what the floating note is pointing at.
        const dir = node.properties.pointerDir;
        if (!dir) return;
        const base = 22;   // width of the notch base
        const reach = 14;  // how far it protrudes
        ctx.save();
        ctx.fillStyle   = t.header;
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (dir === "up") {
            const cx = w / 2;
            ctx.moveTo(cx - base / 2, -titleH);
            ctx.lineTo(cx + base / 2, -titleH);
            ctx.lineTo(cx,            -titleH - reach);
        } else if (dir === "down") {
            const cx = w / 2;
            ctx.moveTo(cx - base / 2, h);
            ctx.lineTo(cx + base / 2, h);
            ctx.lineTo(cx,            h + reach);
        } else if (dir === "left") {
            // Vertical center includes the title-bar zone visually.
            const cy = (h - titleH) / 2;
            ctx.moveTo(0,      cy - base / 2);
            ctx.lineTo(0,      cy + base / 2);
            ctx.lineTo(-reach, cy);
        } else { // right
            const cy = (h - titleH) / 2;
            ctx.moveTo(w,         cy - base / 2);
            ctx.lineTo(w,         cy + base / 2);
            ctx.lineTo(w + reach, cy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };

    // Clean paste (strip styles but keep structure)
    editor.addEventListener("paste", (e) => {
        const text = e.clipboardData?.getData("text/plain");
        if (text != null) {
            e.preventDefault();
            document.execCommand("insertText", false, text);
        }
    });

    // ── Slack-style code-block exit ──
    // Inside <pre> code blocks the user otherwise has no way out. We allow:
    //   • Double-Enter on an empty line  → exit to a new paragraph after.
    //   • Arrow-Down at end of pre block → exit to a new paragraph after.
    //   • Arrow-Up at start of pre block → exit to a new paragraph before.
    editor.addEventListener("keydown", (e) => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const pre = findAncestor(sel.anchorNode, "PRE");
        if (!pre) return;

        if (e.key === "Enter" && !e.shiftKey) {
            // Double-Enter: previous keystroke also Enter and current line empty
            const text = pre.textContent || "";
            const trailingEmpty = /\n\s*$/.test(text);
            if (trailingEmpty || text.trim() === "") {
                e.preventDefault();
                exitCodeBlock(pre, "after");
                return;
            }
        }
        if (e.key === "ArrowDown" && atEndOf(pre, sel)) {
            e.preventDefault();
            exitCodeBlock(pre, "after");
            return;
        }
        if (e.key === "ArrowUp" && atStartOf(pre, sel)) {
            e.preventDefault();
            exitCodeBlock(pre, "before");
            return;
        }
    });

    // Single sync helper used by every input/toolbar-action path. Mirrors
    // editor.innerHTML into properties.content AND into display.innerHTML
    // so the display view never lags behind even if exitEditor doesn't
    // fire (e.g. when an insert happens via the URL/file modal).
    function syncContent() {
        const html = editor.innerHTML;
        node.properties.content = html;
        display.innerHTML = html;
    }

    editor.addEventListener("input", () => {
        syncContent();
        refreshToolbarState();
    });
    editor.addEventListener("keyup", refreshToolbarState);
    editor.addEventListener("mouseup", refreshToolbarState);

    // ── Toolbar wiring ──
    wireToolbar(toolbar, editor, () => {
        syncContent();
        refreshToolbarState();
    });

    function refreshToolbarState() {
        toolbar.querySelectorAll(".floyo-tool-btn").forEach((btn) => {
            const cmd = btn.dataset.cmd;
            const arg = btn.dataset.arg;
            let active = false;
            try {
                if (cmd === "formatBlock" && arg) {
                    const block = document.queryCommandValue("formatBlock");
                    active = (block || "").toLowerCase() === arg.toLowerCase();
                } else if (cmd && cmd !== "removeFormat") {
                    active = document.queryCommandState(cmd);
                }
            } catch { /* queryCommandState can throw on some browsers */ }
            btn.classList.toggle("is-active", active);
        });
    }

    // ── Footer wiring (theme swatches, font, save, pointer direction) ──
    function applyPointerActive() {
        footer.querySelectorAll(".floyo-pointer-arrow").forEach((a) =>
            a.classList.toggle("is-active", a.dataset.dir === node.properties.pointerDir)
        );
    }
    wireFooter(footer, wrapper, node, {
        onTheme: (t) => {
            node.properties.theme = t;
            wrapper.dataset.theme = t;
            footer.querySelectorAll(".floyo-swatch").forEach((s) =>
                s.classList.toggle("is-active", s.dataset.theme === t)
            );
            // Update the LiteGraph chrome colors too — chrome IS the header.
            applyChromeTheme();
        },
        onFont: (f) => {
            node.properties.font = f;
            wrapper.dataset.font = f;
            node.setDirtyCanvas(true, true);
        },
        onSave: exitEditor,
        onPointerDir: (dir) => {
            // Toggle: same arrow clicked again → clear
            node.properties.pointerDir =
                node.properties.pointerDir === dir ? null : dir;
            applyPointerActive();
            node.setDirtyCanvas(true, true);
        },
    });
    applyPointerActive();
    // Mark active swatch on first paint
    footer.querySelectorAll(".floyo-swatch").forEach((s) =>
        s.classList.toggle("is-active", s.dataset.theme === node.properties.theme)
    );
    footer.querySelector(".floyo-footer-font").value = node.properties.font;

    // ── Click-outside-to-save ──
    const outsideHandler = (e) => {
        if (wrapper.dataset.mode !== "editor") return;
        if (wrapper.contains(e.target)) return;
        // The URL / image-insert modal is appended to document.body, so
        // its clicks are technically "outside the wrapper". Skip them —
        // otherwise the mousedown on any modal button (Choose file, OK,
        // Cancel, the text field…) fires exitEditor BEFORE the modal can
        // finish its work, and the inserted image is lost because display
        // div was already synced to the pre-insert content.
        if (e.target.closest && e.target.closest(".floyo-modal-overlay")) return;
        // LiteGraph dispatches mousedown on its own canvas — when the user
        // clicks on a different node or empty canvas, the target won't be
        // inside our wrapper.
        exitEditor();
    };
    document.addEventListener("mousedown", outsideHandler);

    // ── Initial sizing ──
    if (!node.size || (node.size[0] < 220 || node.size[1] < 80)) {
        node.setSize([320, 300]);
    }

    // ── Persistence: onSerialize / onConfigure ──
    // Keep node.title in sync with our stored title (the user can rename
    // via LiteGraph's native title-edit which mutates node.title directly).
    const onSerialize = node.onSerialize;
    node.onSerialize = function (o) {
        onSerialize?.apply(this, arguments);
        o.floyo_state = {
            theme:      node.properties.theme,
            font:       node.properties.font,
            title:      node.properties.title,
            content:    editor.innerHTML || node.properties.content,
            pointerDir: node.properties.pointerDir ?? null,
        };
    };
    const onConfigure = node.onConfigure;
    node.onConfigure = function (o) {
        onConfigure?.apply(this, arguments);
        const s = o.floyo_state;
        if (!s) return;
        Object.assign(node.properties, s);
        wrapper.dataset.theme = s.theme || DEFAULT_THEME;
        wrapper.dataset.font  = s.font  || "Default";
        // node.title stays "" — we draw our own with Arcade font from properties.title.
        node.title = "";
        editor.innerHTML  = s.content || "";
        display.innerHTML = s.content || "";
        const fontSel = footer.querySelector(".floyo-footer-font");
        if (fontSel) fontSel.value = s.font || "Default";
        footer.querySelectorAll(".floyo-swatch").forEach((sw) =>
            sw.classList.toggle("is-active", sw.dataset.theme === node.properties.theme)
        );
        applyPointerActive();
        applyChromeTheme();
    };

    // Cleanup when the node is removed
    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
        document.removeEventListener("mousedown", outsideHandler);
        onRemoved?.apply(this, arguments);
    };
}

/* ─── Toolbar / Footer builders ──────────────────────────────────────── */

function createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "floyo-sticky-toolbar";
    const tools = [
        { cmd: "formatBlock", arg: "H1", label: "H₁",   title: "Heading 1" },
        { cmd: "formatBlock", arg: "H2", label: "H₂",   title: "Heading 2" },
        { cmd: "formatBlock", arg: "H3", label: "H₃",   title: "Heading 3" },
        { sep: true },
        { cmd: "bold",         label: "B",  title: "Bold",          className: "tool-bold" },
        { cmd: "italic",       label: "I",  title: "Italic",        className: "tool-italic" },
        { cmd: "underline",    label: "U",  title: "Underline",     className: "tool-underline" },
        { cmd: "strikeThrough",label: "S",  title: "Strikethrough", className: "tool-strike" },
        { cmd: "removeFormat", label: "Tₓ", title: "Clear formatting" },
        { sep: true },
        { cmd: "formatBlock", arg: "PRE", label: `<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 5 L2 9 L6 13 M12 5 L16 9 L12 13"/>
        </svg>`, title: "Code block" },
        { cmd: "insertUnorderedList", label: `<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">
            <circle cx="3" cy="5"  r="1.4" fill="currentColor"/>
            <circle cx="3" cy="9"  r="1.4" fill="currentColor"/>
            <circle cx="3" cy="13" r="1.4" fill="currentColor"/>
            <line x1="7" y1="5"  x2="16" y2="5"  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="7" y1="9"  x2="16" y2="9"  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="7" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`, title: "Bullet list" },
        { cmd: "insertOrderedList", label: `<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">
            <text x="0.4" y="6.3"  font-size="5" font-weight="700" font-family="-apple-system, sans-serif" fill="currentColor">1</text>
            <text x="0.4" y="10.5" font-size="5" font-weight="700" font-family="-apple-system, sans-serif" fill="currentColor">2</text>
            <text x="0.4" y="14.7" font-size="5" font-weight="700" font-family="-apple-system, sans-serif" fill="currentColor">3</text>
            <line x1="7" y1="5"  x2="16" y2="5"  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="7" y1="9"  x2="16" y2="9"  stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="7" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`, title: "Numbered list" },
        { sep: true },
        // Image-URL insert (Matt's feedback: reuse page-builder UX of asking
        // for an image URL rather than a file upload — keeps workflow JSON
        // small and the asset hosted externally).
        { cmd: "insertImageURL", label: `<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">
            <rect x="2" y="3" width="14" height="12" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <circle cx="6" cy="7.5" r="1.4" fill="currentColor"/>
            <path d="M2.6 13.5 L7 9.2 L10 12.2 L13 9.2 L15.4 11.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`, title: "Insert image URL" },
        // YouTube / Vimeo embed
        { cmd: "insertVideoURL", label: `<svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">
            <rect x="2" y="4" width="14" height="10" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <path d="M7.4 6.6 L7.4 11.4 L11.6 9 Z" fill="currentColor"/>
        </svg>`, title: "Insert YouTube or Vimeo URL" },
    ];
    tools.forEach((t) => {
        if (t.sep) {
            const s = document.createElement("div");
            s.className = "floyo-tool-sep";
            toolbar.appendChild(s);
            return;
        }
        const b = document.createElement("button");
        b.type = "button";
        b.className = "floyo-tool-btn" + (t.className ? " " + t.className : "");
        b.title = t.title;
        b.dataset.cmd = t.cmd;
        if (t.arg) b.dataset.arg = t.arg;
        b.innerHTML = t.label;
        toolbar.appendChild(b);
    });
    return toolbar;
}

function wireToolbar(toolbar, editor, onChange) {
    toolbar.querySelectorAll(".floyo-tool-btn").forEach((btn) => {
        // Don't steal focus from the editor when toolbar is clicked.
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.focus();
            const cmd = btn.dataset.cmd;
            const arg = btn.dataset.arg || null;

            // ── Custom commands (image / video URL inserts) ──
            if (cmd === "insertImageURL") {
                // Image modal supports BOTH paste-URL and pick-local-file.
                // For local files we read as base64 so the image travels
                // with the workflow JSON (same approach as page builder).
                const src = await openUrlModal({
                    title: "Insert Image",
                    placeholder: "Paste image URL",
                    allowFile: true,
                    fileAccept: "image/*",
                });
                if (src) {
                    editor.focus();
                    insertHtmlAtSelection(editor,
                        `<img src="${escapeAttr(src)}" alt="" />`
                    );
                    onChange();
                }
                return;
            }
            if (cmd === "insertVideoURL") {
                const url = await openUrlModal({
                    title: "Insert YouTube URL or Vimeo URL",
                    placeholder: "Example: https://youtu.be/dQw4w9WgXcQ or https://vimeo.com/123",
                });
                if (url) {
                    editor.focus();
                    const embed = videoUrlToEmbed(url);
                    if (embed) {
                        insertHtmlAtSelection(editor, embed);
                        onChange();
                    } else {
                        alert("That doesn't look like a YouTube or Vimeo URL.");
                    }
                }
                return;
            }

            // ── Standard execCommand path ──
            try {
                document.execCommand(cmd, false, arg);
            } catch (err) {
                console.warn("[Floyo Sticky Note] execCommand failed:", cmd, err);
            }
            onChange();
        });
    });
}

function createFooter() {
    const footer = document.createElement("div");
    footer.className = "floyo-sticky-footer";

    // ── Floyo logo (bottom-left) — full wordmark per senior preference ──
    const logo = document.createElement("img");
    logo.className = "floyo-footer-logo";
    logo.src = FLOYO_LOGO;
    logo.alt = "Floyo";
    logo.draggable = false;
    footer.appendChild(logo);

    // ── Center cluster: swatches + font dropdown ──
    const center = document.createElement("div");
    center.className = "floyo-footer-center";

    const swatches = document.createElement("div");
    swatches.className = "floyo-footer-swatches";
    ["purple", "blue", "green"].forEach((t) => {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = `floyo-swatch swatch-${t}`;
        sw.dataset.theme = t;
        sw.title = `${t[0].toUpperCase()}${t.slice(1)} theme`;
        swatches.appendChild(sw);
    });
    center.appendChild(swatches);

    const fontSel = document.createElement("select");
    fontSel.className = "floyo-footer-font";
    fontSel.title = "Font";
    FONT_OPTIONS.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        fontSel.appendChild(opt);
    });
    center.appendChild(fontSel);

    footer.appendChild(center);

    // ── Pointer-direction compass (right of center, left of save) ──
    // Click an arrow → a triangular notch appears on that edge of the
    // node, indicating what the note is correlating to on the canvas.
    const pointer = document.createElement("div");
    pointer.className = "floyo-footer-pointer";
    pointer.title = "Pick a side for the node to point from";
    pointer.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" class="floyo-pointer-svg">
        <path class="floyo-pointer-arrow" data-dir="up"    d="M12 2 L8.5 6 L10.8 6 L10.8 10.8 L13.2 10.8 L13.2 6 L15.5 6 Z"/>
        <path class="floyo-pointer-arrow" data-dir="down"  d="M12 22 L15.5 18 L13.2 18 L13.2 13.2 L10.8 13.2 L10.8 18 L8.5 18 Z"/>
        <path class="floyo-pointer-arrow" data-dir="left"  d="M2 12 L6 8.5 L6 10.8 L10.8 10.8 L10.8 13.2 L6 13.2 L6 15.5 Z"/>
        <path class="floyo-pointer-arrow" data-dir="right" d="M22 12 L18 15.5 L18 13.2 L13.2 13.2 L13.2 10.8 L18 10.8 L18 8.5 Z"/>
    </svg>`;
    footer.appendChild(pointer);

    // ── Save button (far right) ──
    const save = document.createElement("button");
    save.type = "button";
    save.className = "floyo-footer-save";
    save.title = "Save & close editor";
    save.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M3 8.2 L6.6 11.8 L13 4.6"/>
    </svg>`;
    footer.appendChild(save);

    return footer;
}

function wireFooter(footer, wrapper, node, { onTheme, onFont, onSave, onPointerDir }) {
    // Pointer-direction arrows (4-way compass in the footer)
    footer.querySelectorAll(".floyo-pointer-arrow").forEach((arrow) => {
        arrow.addEventListener("mousedown", (e) => e.preventDefault());
        arrow.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            onPointerDir?.(arrow.dataset.dir);
        });
    });
    footer.querySelectorAll(".floyo-swatch").forEach((sw) => {
        sw.addEventListener("mousedown", (e) => e.preventDefault());
        sw.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            onTheme(sw.dataset.theme);
        });
    });
    const fontSel = footer.querySelector(".floyo-footer-font");
    fontSel.addEventListener("mousedown", (e) => e.stopPropagation());
    fontSel.addEventListener("change", (e) => {
        e.stopPropagation();
        onFont(fontSel.value);
    });
    const save = footer.querySelector(".floyo-footer-save");
    save.addEventListener("mousedown", (e) => e.preventDefault());
    save.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSave();
    });
}

/* ─── Tiny helpers ────────────────────────────────────────────────────── */

function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

/** Walk up the DOM until we hit a node whose tagName matches, or null. */
function findAncestor(node, tagName) {
    let el = node;
    while (el && el !== document.body) {
        if (el.nodeType === 1 && el.tagName === tagName) return el;
        el = el.parentNode;
    }
    return null;
}

/** Is the caret at the very end of `el`'s text content? */
function atEndOf(el, sel) {
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setStart(sel.anchorNode, sel.anchorOffset);
    return range.toString().length === 0;
}

/** Is the caret at the very start of `el`'s text content? */
function atStartOf(el, sel) {
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.anchorNode, sel.anchorOffset);
    return range.toString().length === 0;
}

/**
 * Pop the caret out of a `<pre>` code block to a fresh paragraph
 * positioned before or after it. Cleans up any trailing/leading blank
 * lines left over from the Enter that triggered the exit.
 */
function exitCodeBlock(pre, where /* "before" | "after" */) {
    // Trim a trailing/leading newline so the user doesn't end up with an
    // empty line inside the code block after escaping.
    if (where === "after") {
        pre.textContent = (pre.textContent || "").replace(/\n+\s*$/, "");
    } else {
        pre.textContent = (pre.textContent || "").replace(/^\s*\n+/, "");
    }
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    if (where === "after") {
        pre.after(p);
    } else {
        pre.before(p);
    }
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

/* ─── URL-insert helpers ─────────────────────────────────────────────── */

function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
                    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Insert raw HTML at the current caret position inside `editor`. */
function insertHtmlAtSelection(editor, html) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
        // No selection — append at end.
        editor.insertAdjacentHTML("beforeend", html);
        return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    const lastNode = frag.lastChild;
    range.insertNode(frag);
    if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

/**
 * Recognise a YouTube or Vimeo URL and return an iframe-embed snippet.
 * Returns `null` if the URL doesn't match a known pattern.
 */
function videoUrlToEmbed(url) {
    if (!url) return null;
    url = url.trim();
    // YouTube — youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>, shorts/<id>
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) {
        const id = m[1];
        return `<div class="floyo-embed floyo-embed-youtube"><iframe src="https://www.youtube.com/embed/${escapeAttr(id)}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe></div>`;
    }
    // Vimeo — vimeo.com/<id>, player.vimeo.com/video/<id>
    m = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) {
        const id = m[1];
        return `<div class="floyo-embed floyo-embed-vimeo"><iframe src="https://player.vimeo.com/video/${escapeAttr(id)}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe></div>`;
    }
    return null;
}

/**
 * Open a small modal asking for a URL. Resolves to the trimmed string the
 * user typed (or null if cancelled). When `allowFile` is true, also shows
 * a "Choose file from disk" button — picking a file reads it as a base64
 * data URL and resolves with that, so the asset travels with the workflow
 * (same approach as Floyo's page builder).
 */
function openUrlModal({ title, placeholder, allowFile = false, fileAccept = "*/*" }) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "floyo-modal-overlay";
        const fileBlock = allowFile ? `
            <div class="floyo-modal-divider"><span>or</span></div>
            <button type="button" class="floyo-modal-file">Choose file from disk…</button>
            <input type="file" class="floyo-modal-file-input" accept="${escapeAttr(fileAccept)}" hidden />
        ` : "";
        overlay.innerHTML = `
            <div class="floyo-modal" role="dialog" aria-modal="true">
                <div class="floyo-modal-title">${escapeAttr(title)}</div>
                <input type="text" class="floyo-modal-input" placeholder="${escapeAttr(placeholder || "")}" />
                ${fileBlock}
                <div class="floyo-modal-actions">
                    <button type="button" class="floyo-modal-btn floyo-modal-cancel">Cancel</button>
                    <button type="button" class="floyo-modal-btn floyo-modal-ok">OK</button>
                </div>
            </div>
        `;
        const close = (value) => {
            overlay.remove();
            document.removeEventListener("keydown", keyHandler, true);
            resolve(value);
        };
        const keyHandler = (e) => {
            if (e.key === "Escape") { e.preventDefault(); close(null); }
            if (e.key === "Enter")  { e.preventDefault(); close(input.value.trim() || null); }
        };
        document.body.appendChild(overlay);
        const input  = overlay.querySelector(".floyo-modal-input");
        const cancel = overlay.querySelector(".floyo-modal-cancel");
        const ok     = overlay.querySelector(".floyo-modal-ok");
        cancel.addEventListener("click", () => close(null));
        ok.addEventListener("click", () => close(input.value.trim() || null));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close(null); // click backdrop to dismiss
        });
        if (allowFile) {
            const fileBtn   = overlay.querySelector(".floyo-modal-file");
            const fileInput = overlay.querySelector(".floyo-modal-file-input");
            fileBtn.addEventListener("click", () => fileInput.click());
            fileInput.addEventListener("change", (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Sanity: warn at very large files but still proceed.
                if (file.size > 5 * 1024 * 1024) {
                    if (!confirm(`This file is ${(file.size/1024/1024).toFixed(1)} MB.\nLarge files bloat the workflow JSON. Continue?`)) {
                        e.target.value = "";
                        return;
                    }
                }
                const reader = new FileReader();
                reader.onload  = () => close(reader.result);   // data:image/...;base64,...
                reader.onerror = () => { alert("Could not read that file."); };
                reader.readAsDataURL(file);
            });
        }
        document.addEventListener("keydown", keyHandler, true);
        setTimeout(() => input.focus(), 0);
    });
}
