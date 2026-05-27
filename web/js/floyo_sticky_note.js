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

/* ─── Asset URLs (resolved relative to this JS file) ──────────────────── */
//
// ComfyUI serves the package's `web/` folder at /extensions/<pkg>/. By
// resolving the URL from `import.meta.url` we don't have to hard-code the
// package name — it works regardless of what folder name the user clones
// the repo into.
function resolveAssetsUrl() {
    const direct = new URL("../assets/", import.meta.url).href;
    try {
        const source = new URL(import.meta.url);
        const extMatch = source.pathname.match(/\/extensions\/([^/]+)\//);
        const apiBase = app?.api?.api_base;
        if (source.hostname.startsWith("dispatch.") && extMatch && apiBase) {
            return new URL(`${apiBase}/extensions/${extMatch[1]}/assets/`, window.location.origin).href;
        }
        const proxyResource = performance.getEntriesByType("resource")
            .map((entry) => entry.name)
            .find((name) => name.includes("/api/comfyui-proxy/") && name.includes("/api/"));
        if (source.hostname.startsWith("dispatch.") && extMatch && proxyResource) {
            const proxyBase = proxyResource.replace(/\/api\/.*$/, "");
            return `${proxyBase}/extensions/${extMatch[1]}/assets/`;
        }
    } catch {}
    return direct;
}
const assetUrl = (name) => `${resolveAssetsUrl()}${name}`;
const FLOYO_LOGO = () => assetUrl("floyo-logo.png");
const YO_LOGO    = () => assetUrl("yo-circle.png");
const ARCADE_OTF = () => assetUrl("ArcadePixelNeue.otf");

// Preload the Arcade font so the title text renders with it without a
// flash of the system fallback. The CSS @font-face below is the canonical
// declaration; this `FontFace` add just guarantees a load promise.
//
// Canvas2D ignores fonts that aren't already loaded at the moment of
// fillText (no implicit wait), so on top of registering the face we
// also explicitly call `document.fonts.load("18px ArcadePixelNeue")`
// — that returns a promise we can await to be SURE the rasterised
// glyph cache is ready before the first paint. Then we fire repeated
// canvas redraws over the next ~1 s to repaint any nodes that came in
// while the font was still loading.
let __floyoFontReady = false;
async function loadArcadeFont() {
    if (__floyoFontReady) return;
    try {
        const face = new FontFace("ArcadePixelNeue", `url("${ARCADE_OTF()}")`);
        await face.load();
        document.fonts.add(face);
        // Wait until the canvas font cache actually contains this face.
        await document.fonts.load('18px "ArcadePixelNeue"');
        __floyoFontReady = true;
        // Repaint several times to catch any node added during load.
        const repaint = () => app?.graph?.setDirtyCanvas?.(true, true);
        repaint();
        setTimeout(repaint, 100);
        setTimeout(repaint, 500);
        setTimeout(repaint, 1500);
    } catch {}
}
loadArcadeFont();

/* ─── Themes ──────────────────────────────────────────────────────────── */

// Theme palette from Matt's Slack screenshot — fill is the brand
// "n-7 / n-8 / n-9" colour, outline is exactly one ramp-step lighter
// (e.g. Ube7 fill #3A206B → Ube6 outline #543294). Keys preserved
// (purple/blue/green/grey) so existing saved workflows keep loading.
const THEMES = {
    purple: {                              // Matt: Ube 7
        bg:         "#3A206B",             // fill
        bgGradient: "linear-gradient(180deg, #3A206B 0%, #351D61 100%)",
        header:     "#2C1852",
        headerHover:"#543294",
        toolbar:    "#27144F",
        text:       "#EDE9FE",
        textMuted:  "#C4B5FD",
        accent:     "#A78BFA",
        border:     "#543294",             // outline — Matt: Ube 6
        codeBg:     "#1A0F3D",
        swatch:     "#A78BFA",
    },
    blue: {                                // Matt: Blueberry 8
        bg:         "#192765",             // fill
        bgGradient: "linear-gradient(180deg, #192765 0%, #152156 100%)",
        header:     "#101844",             // Figma: Blueberry 9 title strip
        headerHover:"#2E419E",
        toolbar:    "#101844",
        text:       "#DBEAFE",
        textMuted:  "#93C5FD",
        accent:     "#60A5FA",
        border:     "#2E419E",             // outline — Matt: Blueberry 7
        codeBg:     "#0F1745",
        swatch:     "#60A5FA",
    },
    green: {                               // Matt: Mint 9
        bg:         "#002514",             // fill
        bgGradient: "linear-gradient(180deg, #002514 0%, #001D10 100%)",
        header:     "#00170D",
        headerHover:"#01341C",
        toolbar:    "#00170D",
        text:       "#D1FAE5",
        textMuted:  "#6EE7B7",
        accent:     "#34D399",
        border:     "#01341C",             // outline — Matt: Mint 8
        codeBg:     "#001A0E",
        swatch:     "#34D399",
    },
    grey: {                                // Matt: Custom Grey
        bg:         "#222222",             // fill
        bgGradient: "linear-gradient(180deg, #222222 0%, #1D1D1D 100%)",
        header:     "#1A1A1A",
        headerHover:"#404040",
        toolbar:    "#1A1A1A",
        text:       "#F4F4F5",
        textMuted:  "#A1A1AA",
        accent:     "#D4D4D8",
        border:     "#333333",             // outline — one step lighter
        codeBg:     "#171717",
        swatch:     "#737373",
    },
};

const DEFAULT_THEME = "purple";
const DEFAULT_TITLE = "Floyo Sticky Note";
const NATIVE_TITLE_SENTINEL = "\u00A0";
const TITLE_FONT = `14px "ArcadePixelNeue", "Courier New", monospace`;
const TITLE_LETTER_SPACING = 0.7;
const CHEVRON_COLOR = "#D5B8FF";
// NOTE: the title lives in the LiteGraph title bar, not in the body —
// so we don't duplicate it as an <h1> here. The default content below
// doubles as a quick demo of every formatting feature: H1 / H2 / H3
// headings, bold, italic, underline, strikethrough, inline code, code
// blocks, and bullet + numbered lists.
const DEFAULT_CONTENT = `<h1>📝 Floyo Sticky Note</h1>
<p>This is a <b>canvas-only documentation node</b> built for the <i>Floyo workflow library</i> on top of ComfyUI. Use it to <u>annotate</u> and <b>describe parts of your workflow</b> right next to the nodes they explain — no need to leave the canvas.</p>

<h2>✨ What you can do here</h2>
<p>Every common rich-text feature you'd expect from a real editor — all wired up to <code>document.execCommand</code> for that battle-tested browser support:</p>
<ul>
<li><b>Bold</b>, <i>italic</i>, <u>underline</u>, and <s>strikethrough</s> for emphasis.</li>
<li><b>Three heading levels</b> — H₁ for titles, H₂ for sections, H₃ for sub-sections.</li>
<li>Inline <code>code</code> spans and full code blocks (try the <b>&lt;/&gt;</b> button).</li>
<li>Both <b>bullet</b> and <b>numbered</b> lists, with proper nesting.</li>
<li>Drop in <b>images</b> and <b>YouTube</b> / <b>Vimeo</b> videos via URL — they render as clickable preview cards.</li>
</ul>

<h2>🎨 Theming</h2>
<p>Pick from three Floyo-branded themes via the footer swatches:</p>
<ol>
<li><b>Purple</b> — the default, calm and neutral.</li>
<li><b>Blue</b> — perfect for "info" or "reference" notes.</li>
<li><b>Green</b> — pair with completed sections or "best practice" callouts.</li>
</ol>
<p>The theme swap is <u>instant</u> and the colour syncs across the title bar, body, accent text, code blocks, and the directional notch.</p>

<h3>About the font</h3>
<p>The title bar uses the <b>ArcadePixelNeue</b> font for a bit of Floyo brand character. The body uses your system stack by default but you can pick <b>Roboto</b>, <b>Arcade</b>, or <b>Janeiro</b> from the footer dropdown.</p>

<h2>🧭 Pointing at things</h2>
<p>The 4-arrow compass in the footer projects a <b>matching-colour notch</b> out of any edge of the node — so when a sticky is sitting between a bunch of other nodes, a reader can tell exactly <i>which</i> node it's annotating. Click an arrow once to add the notch, click it again to clear.</p>

<h3>Pro tips</h3>
<ul>
<li><b>Double-click</b> the body to enter editor mode. Double-click again outside, or click the green ✓, to save and exit.</li>
<li><b>Double-click the title bar</b> to rename the note.</li>
<li>Inside a code block, <b>press Enter on an empty line</b> (or hit Arrow-Down at the bottom) to escape back to a paragraph — same UX as Slack and Notion.</li>
<li>To delete a video or image, <b>hover over it</b> and a small floating toolbar appears with <b>−</b> / <b>+</b> / <b>× Remove</b> controls.</li>
</ul>

<h2>⚙️ Under the hood</h2>
<p>The node is a custom ComfyUI extension that lives in <code>web/js/floyo_sticky_note.js</code>. It registers as a LiteGraph node with <s>no inputs</s> and <s>no outputs</s> — so it's <u>skipped by the prompt queue at run time</u> and exists purely as a documentation artifact on the canvas.</p>

<pre><code>// The Python side is just registration boilerplate
class FloyoStickyNote:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}
    RETURN_TYPES = ()
    FUNCTION = "noop"
    CATEGORY = "Floyo/Notes"
    def noop(self):
        return ()</code></pre>

<h2>📌 Final note</h2>
<p>This sticky note is built for the <b>top 50 Floyo workflows</b> conversion project — every shipped workflow should have a couple of these placed next to its key nodes to walk the user through what's happening.</p>
<p>Happy documenting! ✍️</p>`;

/* ─── Inject styles + Google Fonts (once) ─────────────────────────────── */

const STYLE_ID = "floyo-sticky-note-styles";
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

@font-face {
    font-family: 'ArcadePixelNeue';
    src: url('%%ARCADE_OTF%%') format('opentype');
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
    container-type: size;
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
    font-size: 8px;
    line-height: 1.5;
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
.floyo-sticky-wrapper[data-theme="grey"] {
    --bg:${THEMES.grey.bg}; --bg-grad:${THEMES.grey.bgGradient};
    --header:${THEMES.grey.header}; --hover:${THEMES.grey.headerHover};
    --toolbar:${THEMES.grey.toolbar}; --text:${THEMES.grey.text};
    --text-mute:${THEMES.grey.textMuted}; --accent:${THEMES.grey.accent};
    --border:${THEMES.grey.border}; --code-bg:${THEMES.grey.codeBg};
}

/* ── Toolbar (editor mode only) ── */
.floyo-sticky-toolbar {
    flex: 0 0 auto;
    display: none;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
    gap: 2px;
    padding: 5px 8px;
    background: var(--toolbar);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.22);
    overflow: hidden;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-toolbar { display: flex; }
.floyo-tool-btn {
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    border-radius: 5px;
    height: 22px;
    min-width: 18px;
    padding: 0 3px;
    font-family: "ArcadePixelNeue", "Courier New", monospace;
    font-size: 10px;
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
    height: 14px;
    background: rgba(255, 255, 255, 0.18);
    margin: 0 2px;
    flex: 0 0 auto;
}

/* ── Body (display + editor share this slot) ── */
.floyo-sticky-body {
    flex: 1 1 0;
    overflow: auto;
    padding: 12px 20px;
    min-height: 0;
    max-height: 100%;
    position: relative;
    overscroll-behavior: contain;
}
.floyo-sticky-wrapper[data-mode="display"] .floyo-sticky-body {
    padding-top: 10px;
    padding-bottom: 14px;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-body {
    padding-bottom: 46px;
}
.floyo-sticky-display, .floyo-sticky-editor {
    outline: none;
    color: var(--text);
    word-wrap: break-word;
    overflow-wrap: anywhere;
    max-width: 100%;
}
.floyo-sticky-editor {
    display: none;
    min-height: 100%;
    caret-color: var(--accent);
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-editor  { display: block; }
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-display { display: none; }

/* ── Display-mode affordances ──────────────────────────────────────── */
/* In display mode (read-only) we surface two small controls pinned over
   the bottom corners — an Edit pencil on the left and a real resize
   grip on the right. The body gets extra bottom padding in display mode
   so long content scrolls behind neither affordance. */
.floyo-display-actions {
    position: absolute;
    left: 18px;
    right: 0;
    bottom: 1px;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-display-actions { display: none; }

/* Edit button — pixel-art pencil on a black "box" background, per
   Matt's Figma 930-4896. Square card, slight rounding, black fill so
   the pencil reads on every theme colour. */
.floyo-display-edit {
    width: 20px;
    height: 20px;
    background: #000;
    border: none;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    padding: 0;
    transition: transform 120ms ease, box-shadow 120ms ease;
}
.floyo-display-edit:hover {
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.35);
    transform: scale(1.05);
}
.floyo-display-edit:active { transform: scale(0.96); }
/* The pencil SVG is rendered with fill=white inline so it shows up on
   the black background regardless of theme. */
.floyo-display-edit svg { display: block; }

/* Resize-grip — two subtle diagonal lines at the true bottom-right
   corner, exactly the SVG Matt provided. It also handles pointer-drag
   resize so the cursor + interaction match what the user sees. */
.floyo-display-grip {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: flex-end;
    justify-content: flex-end;
    pointer-events: all;
    cursor: nwse-resize;
    opacity: 0.3;
    padding: 0;
    touch-action: none;
}
.floyo-display-grip svg {
    display: block;
    width: 13px;
    height: 13px;
    transform: translate(0, 0);
}

/* Rich-text styles inside body */
.floyo-sticky-body h1 {
    font-size: 10px; font-weight: 600; margin: 0 0 8px;
    letter-spacing: 0; color: #fff; line-height: 1.5;
}
.floyo-sticky-body h2 {
    font-size: 10px; font-weight: 600; margin: 14px 0 6px;
    color: #fff; line-height: 1.5;
}
.floyo-sticky-body h3 {
    font-size: 10px; font-weight: 600; margin: 12px 0 4px;
    color: #fff; line-height: 1.5;
}
.floyo-sticky-body p { margin: 0 0 8px; color: rgba(255, 255, 255, 0.70); }
.floyo-sticky-body b, .floyo-sticky-body strong { font-weight: 700; color: #fff; }
.floyo-sticky-body i, .floyo-sticky-body em { font-style: italic; }
.floyo-sticky-body u { text-decoration: underline; text-decoration-thickness: 1.5px; }
.floyo-sticky-body s, .floyo-sticky-body strike { text-decoration: line-through; }
.floyo-sticky-body code {
    font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
    font-size: 7px;
    background: var(--code-bg);
    padding: 1px 5px;
    border-radius: 4px;
    color: var(--accent);
}
.floyo-sticky-body pre {
    font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
    font-size: 8px;
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
    cursor: pointer;
    transition: outline 120ms ease, transform 120ms ease;
}
.floyo-sticky-body img.is-selected {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    transform: scale(1);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
}

/* Floating tools next to a selected image: [−] [+] [×]. */
.floyo-img-tools {
    position: absolute;
    display: none;
    align-items: center;
    gap: 4px;
    padding: 4px;
    background: rgba(15, 8, 32, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 8px;
    backdrop-filter: blur(6px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
    z-index: 50;
    user-select: none;
    animation: floyoImgToolsIn 140ms ease-out;
}
@keyframes floyoImgToolsIn {
    from { opacity: 0; transform: translateY(-4px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
.floyo-img-tools.is-visible { display: inline-flex; }
.floyo-img-tool-btn {
    height: 26px;
    min-width: 26px;
    background: rgba(255, 255, 255, 0.10);
    border: none;
    border-radius: 5px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    padding: 0 6px;
    transition: background 120ms ease, color 120ms ease, transform 120ms ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}
.floyo-img-tool-btn:hover  { background: rgba(255, 255, 255, 0.22); }
.floyo-img-tool-btn:active { transform: scale(0.94); }
.floyo-img-tool-delete {
    background: rgba(220, 38, 38, 0.22);
    color: #FECACA;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
}
.floyo-img-tool-delete:hover {
    background: rgba(220, 38, 38, 0.7);
    color: #fff;
}
.floyo-img-tool-delete svg { flex: 0 0 auto; }
.floyo-embed {
    position: relative;
    width: 100%;
    max-width: 100%;
    /* Default 16:9 via aspect-ratio when no inline height is set.
       The resize handler in JS ALSO sets style.height explicitly
       (width * 9/16) when the user clicks the resize buttons, so we
       never depend solely on aspect-ratio (that property has bug
       history when all children are position:absolute). Belt +
       suspenders. */
    aspect-ratio: 16 / 9;
    height: auto;
    margin: 8px 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: var(--code-bg);
    cursor: pointer;
    transition: outline 120ms ease, box-shadow 120ms ease;
    box-sizing: border-box;
}
.floyo-embed.is-selected {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
}
.floyo-embed iframe {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    border: none;
}
.floyo-embed-thumb {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    border: none;
    border-radius: 0;
    margin: 0;
    background: transparent;
    pointer-events: none;
    user-select: none;
}
.floyo-embed-open {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.18);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding-left: 4px;   /* nudge the play triangle visually centred */
    transition: background 140ms ease, transform 140ms ease;
}
.floyo-embed-youtube .floyo-embed-open:hover {
    background: #FF0000;  /* YouTube red */
    transform: translate(-50%, -50%) scale(1.06);
}
.floyo-embed-vimeo .floyo-embed-open:hover {
    background: #1AB7EA;  /* Vimeo cyan */
    transform: translate(-50%, -50%) scale(1.06);
}
.floyo-embed-brand {
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    pointer-events: none;
    user-select: none;
}

/* ── Footer (editor mode only) ── */
.floyo-sticky-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4;
    display: none;
    align-items: center;
    justify-content: space-between;  /* logo left, center cluster mid,
                                        save right */
    gap: 8px;
    flex-wrap: nowrap;
    padding: 4px 10px;
    background: var(--toolbar);
    border-top: 1px solid rgba(0, 0, 0, 0.22);
    box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.04);
    min-height: 36px;
    box-sizing: border-box;
    overflow: hidden;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer { display: flex; }

/* Floyo full-wordmark logo on the bottom-left.
   Per Ashna + Matt's Slack agreement ("Full logo is better - smaller?" /
   "sure sure"), sized so it sits just slightly taller than the swatches
   — matches the Figma 902:277 bottom-right variant exactly. */
.floyo-footer-logo {
    height: 24px;
    width: auto;
    flex: 0 0 auto;
    user-select: none;
    pointer-events: none;
    opacity: 0.95;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
}

/* Center cluster — swatches + font + compass packed together.
   flex: 0 0 auto so the cluster stays its natural width; the footer's
   space-between drops it in the middle between the logo and save. */
.floyo-footer-center {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    flex: 0 0 auto;
    min-width: 0;
}

/* Compass — Matt's Figma 970-485 spec:
   - inactive wedges: outlined with white@30% stroke, no fill
   - active wedge:    filled with white@30% (#FFFFFF4D)
   - the original Figma "default state" fills one wedge with #D9D9D9
     to show the look; we treat that as the visual reference and pick
     #FFFFFF4D for the active state so it works on any theme bg. */
.floyo-footer-pointer {
    width: 32px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex: 0 0 auto;
    pointer-events: all;
}
.floyo-pointer-svg { display: block; width: 30px; height: 22px; }
.floyo-pointer-arrow {
    fill: transparent;
    stroke: rgba(255, 255, 255, 0.30);   /* #FFFFFF4D */
    stroke-width: 1;
    cursor: pointer;
    pointer-events: all;
    transition: fill 120ms ease, stroke 120ms ease, transform 120ms ease;
}
.floyo-pointer-arrow:hover {
    fill: rgba(255, 255, 255, 0.10);
    stroke: rgba(255, 255, 255, 0.30);
}
.floyo-pointer-arrow.is-active {
    fill: rgba(255, 255, 255, 0.30);     /* #FFFFFF4D */
    stroke: transparent;
}
.floyo-footer-swatches { display: flex; gap: 6px; }
.floyo-swatch {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.16);
    cursor: pointer;
    padding: 0;
    transition: transform 120ms ease, border-color 120ms ease;
}
.floyo-swatch:hover { transform: scale(1.12); border-color: rgba(255,255,255,0.6); }
.floyo-swatch.is-active { border-color: rgba(255, 255, 255, 0.85); box-shadow: 0 0 0 2px rgba(255,255,255,0.18); }
.floyo-swatch.swatch-purple { background: ${THEMES.purple.swatch}; }
.floyo-swatch.swatch-blue   { background: ${THEMES.blue.swatch}; }
.floyo-swatch.swatch-green  { background: ${THEMES.green.swatch}; }
.floyo-swatch.swatch-grey   { background: ${THEMES.grey.swatch}; }

/* Save button — Matt's Figma 970-485 spec.
   Background: Mint/Mint 4 #3CE195 (the same green as the pixel-art
   tick glyph). 26×26 box with slight rounding (matches the edit
   button's box style on the opposite end of the footer). */
.floyo-footer-save {
    background: rgba(60, 225, 149, 0.10);
    border: 1px solid rgba(60, 225, 149, 0.18);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
    padding: 0;
}
.floyo-footer-save:hover {
    transform: scale(1.08);
    background: rgba(60, 225, 149, 0.18);
    box-shadow: 0 0 0 1px rgba(60, 225, 149, 0.24);
}
.floyo-footer-save svg { display: block; }

@container (max-width: 360px) {
    .floyo-sticky-toolbar {
        gap: 1px;
        padding: 4px 6px;
    }
    .floyo-tool-btn {
        min-width: 14px;
        height: 20px;
        padding: 0 2px;
        font-size: 8px;
        border-radius: 4px;
    }
    .floyo-tool-btn svg {
        width: 10px;
        height: 10px;
    }
    .floyo-tool-sep {
        height: 12px;
        margin: 0 1px;
    }
    .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-body {
        padding-bottom: 44px;
    }
    .floyo-sticky-footer {
        gap: 3px;
        min-height: 36px;
        padding: 4px 5px;
    }
    .floyo-footer-logo { height: 12px; }
    .floyo-footer-center { gap: 2px; }
    .floyo-footer-swatches { gap: 2px; }
    .floyo-swatch { width: 10px; height: 10px; border-radius: 3px; border-width: 1px; }
    .floyo-footer-pointer { width: 22px; height: 18px; }
    .floyo-pointer-svg { width: 22px; height: 18px; }
    .floyo-footer-save { width: 20px; height: 20px; border-radius: 6px; border-color: rgba(60, 225, 149, 0.14); }
    .floyo-footer-save svg { width: 11px; height: 11px; }
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
    style.textContent = STYLES.replaceAll("%%ARCADE_OTF%%", ARCADE_OTF());
    document.head.appendChild(style);
    loadArcadeFont();
}

/* ─── Extension registration ──────────────────────────────────────────── */

app.registerExtension({
    name: "Floyo.StickyNote",
    async beforeRegisterNodeDef(nodeType, nodeData /*, app */) {
        if (nodeData.name !== "FloyoStickyNote") return;
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            // ── BULLET-PROOF: apply the purple chrome theme IMMEDIATELY,
            //    before anything else can throw. Even if setupStickyNote
            //    blows up, the node will at least look right.
            try {
                const t = THEMES.purple;
                this.color    = t.header;
                this.bgcolor  = t.bg;
                this.boxcolor = t.border;
                // Suppress LiteGraph's native title text. We draw our own
                // in Arcade font inside onDrawForeground (set up later).
                this.title = NATIVE_TITLE_SENTINEL;
                this.getTitle = function () { return NATIVE_TITLE_SENTINEL; };
                // ComfyUI v3 draws an external green package badge above
                // custom nodes via node.drawBadges(). This note already has
                // branded chrome, so suppress that badge for this node only.
                this.drawBadges = function () {};
            } catch {}

            const r = onNodeCreated?.apply(this, arguments);
            try {
                setupStickyNote(this);
            } catch (err) {
                console.error("[Floyo Sticky Note] setup failed:", err);
                // Surface the error visibly inside the node so the user
                // doesn't just see a blank box.
                try {
                    const errBox = document.createElement("div");
                    errBox.style.cssText =
                        "padding:12px;color:#FECACA;font:13px monospace;" +
                        "background:rgba(0,0,0,0.4);border-radius:8px;";
                    errBox.textContent = "Floyo Sticky Note setup error:\n" + (err?.stack || err?.message || String(err));
                    this.addDOMWidget?.("floyo_err", "div", errBox, { serialize: false });
                } catch {}
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
    // double-rendered title. Returning a non-empty blank sentinel
    // short-circuits the fallback. node.properties.title remains the
    // source of truth and is what we actually draw.
    node.title = NATIVE_TITLE_SENTINEL;
    node.getTitle = function () { return NATIVE_TITLE_SENTINEL; };
    node.drawBadges = function () {};

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

    // Floating mini-toolbar that appears inside the top-right corner of
    // a selected (or hovered) image / video card:
    //   [−] shrink, [+] enlarge, [Remove ×] delete.
    // The Remove button is wider with an explicit label so the user
    // can never miss how to get rid of a wrong embed.
    const imgTools = document.createElement("div");
    imgTools.className = "floyo-img-tools";
    imgTools.innerHTML = `
        <button type="button" class="floyo-img-tool-btn" data-act="smaller" title="Make smaller" aria-label="Make smaller">−</button>
        <button type="button" class="floyo-img-tool-btn" data-act="bigger"  title="Make bigger"  aria-label="Make bigger">+</button>
        <button type="button" class="floyo-img-tool-btn floyo-img-tool-delete" data-act="delete" title="Remove" aria-label="Remove">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                <path d="M4 4 L12 12 M12 4 L4 12"/>
            </svg>
            <span>Remove</span>
        </button>
    `;

    // Display-mode helpers: an "Edit" pencil button in the bottom-left
    // of the body and a visual resize affordance in the bottom-right.
    // Both are hidden once the user enters editor mode.
    const displayActions = document.createElement("div");
    displayActions.className = "floyo-display-actions";
    // Edit pencil + resize-grip use Matt's Figma affordances: pixel-art
    // pencil (12×12 black-fill) and a tiny three-line resize mark. The
    // pencil's `fill="#fff"` overrides the original black so it reads on
    // the new black button background.
    displayActions.innerHTML = `
        <button type="button" class="floyo-display-edit" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M4.66602 2.33301H1.16602V10.5H9.33301V7H10.5V11.666H0V1.16602H4.66602V2.33301ZM3.5 8.16602H5.83301V9.33301H2.33301V5.83301H3.5V8.16602ZM7 8.16602H5.83301V7H7V8.16602ZM9.33301 5.83301H8.16699V7H7V5.83301H8.16602V4.66602H9.33301V5.83301ZM4.66602 5.83301H3.5V4.66602H4.66602V5.83301ZM5.83301 4.66602H4.66602V3.5H5.83301V4.66602ZM10.5 4.66602H9.33301V3.5H10.5V4.66602ZM7 3.5H5.83301V2.33301H7V3.5ZM11.666 3.5H10.5V2.33301H11.666V3.5ZM9.33301 1.16602H8.16699V2.33301H7V1.16602H8.16602V0H9.33301V1.16602ZM10.5 2.33301H9.33301V1.16602H10.5V2.33301Z" fill="#FFFFFF"/>
            </svg>
        </button>
        <div class="floyo-display-grip" aria-hidden="true" title="Drag the node corner to resize">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <line x1="12" y1="3" x2="3" y2="12" stroke="white" stroke-linecap="round"/>
                <line x1="12" y1="7" x2="7" y2="12" stroke="white" stroke-linecap="round"/>
                <line x1="12" y1="11" x2="11" y2="12" stroke="white" stroke-linecap="round"/>
            </svg>
        </div>
    `;

    body.append(display, editor, imgTools);

    // Footer (visible only in editor mode)
    const footer = createFooter();

    // displayActions sits between body and footer so it always pins to
    // the bottom of the visible note (instead of scrolling with body
    // content) and is hidden when the footer takes over in editor mode.
    wrapper.append(toolbar, body, displayActions, footer);

    // ── Attach as a DOM widget that fills the entire node ──
    const widget = node.addDOMWidget("floyo_sticky", "div", wrapper, {
        serialize: false,
        hideOnZoom: false,
    });
    // Widget claims (node body width × body height) so ComfyUI sizes
    // its DOM container correctly and the wrapper inside it just fills
    // 100%. Stable because changing node.size only changes the next
    // widget.computeSize return by the same delta — no feedback loop.
    widget.computeSize = function () {
        if (!node.size) return [420, 200];
        const titleH = (window.LiteGraph?.NODE_TITLE_HEIGHT) ?? 30;
        // Body floor matches MIN_H − titleH so shrinking the node
        // doesn't get stuck on a too-tall widget body.
        return [node.size[0], Math.max(30, node.size[1] - titleH)];
    };

    // The node's OWN computeSize is what LiteGraph uses to determine
    // its MINIMUM size during resize. Returning a small floor (180×60)
    // lets the user drag the handle all the way down to a slim
    // title-bar-only-with-sliver state. Returning node.size would
    // make the current size the minimum and block shrinking entirely.
    node.computeSize = function () { return [180, 60]; };

    // No syncWrapperSize override — the wrapper's CSS `height: 100%`
    // resolves to the DOM container's height, which ComfyUI now sizes
    // correctly from widget.computeSize. Manual sizing was making the
    // wrapper a couple of px wider than the chrome's visible body,
    // which is what was overflowing on the right.

    // ── Mode helpers ──
    function enterEditor() {
        wrapper.dataset.mode = "editor";
        editor.innerHTML = display.innerHTML;
        // No auto-grow here — the user can manually resize if they need
        // more room. Auto-setSize() was being read by the user as the
        // node "growing on its own" when they entered editor mode.
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
    // Double-click anywhere on the body — even on empty whitespace —
    // enters editor mode. The display child handler was only firing
    // when the click landed on visible content; bind on body itself
    // to catch empty area too.
    body.addEventListener("dblclick", (e) => {
        if (wrapper.dataset.mode !== "display") return;
        e.stopPropagation();
        enterEditor();
    });
    display.addEventListener("click", (e) => {
        if (wrapper.dataset.mode !== "display") return;
        const embed = e.target.closest(".floyo-embed");
        if (!embed || !display.contains(embed)) return;
        const url = videoEmbedUrl(embed);
        if (!url) return;
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
    });

    // Edit pencil button (display-mode only) — single click enters editor.
    displayActions.querySelector(".floyo-display-edit")
        .addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            enterEditor();
        });
    const displayGrip = displayActions.querySelector(".floyo-display-grip");
    displayGrip.addEventListener("pointerdown", (e) => {
        if (!node.size) return;
        e.preventDefault();
        e.stopPropagation();
        displayGrip.setPointerCapture?.(e.pointerId);
        const startX = e.clientX;
        const startY = e.clientY;
        const startSize = [...node.size];
        const prevUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = "none";

        const onMove = (moveEvent) => {
            const nextW = startSize[0] + (moveEvent.clientX - startX);
            const nextH = startSize[1] + (moveEvent.clientY - startY);
            node.setSize([nextW, nextH]);
            node.setDirtyCanvas(true, true);
        };
        const onUp = (upEvent) => {
            displayGrip.releasePointerCapture?.(upEvent.pointerId);
            document.body.style.userSelect = prevUserSelect;
            window.removeEventListener("pointermove", onMove, true);
            window.removeEventListener("pointerup", onUp, true);
            window.removeEventListener("pointercancel", onUp, true);
            node.setDirtyCanvas(true, true);
        };

        window.addEventListener("pointermove", onMove, true);
        window.addEventListener("pointerup", onUp, true);
        window.addEventListener("pointercancel", onUp, true);
    });

    // ── Image + video selection / resize / delete ──
    // Click an <img> or .floyo-embed (video card) inside the editor →
    // outline it and float a mini toolbar above with [−] [+] [×] buttons.
    // Same UI for both media types.
    let selectedMedia = null;     // sticky selection (outline + toolbar)
    let hoveredMedia  = null;     // transient hover (toolbar position only)

    function positionMediaTools(el) {
        if (!el) return;
        const bRect = body.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        // INSIDE the top-right corner of the media (Notion-style), so
        // the controls always sit on top of the image / video card and
        // are easy to find.
        const PAD = 8;
        imgTools.style.left = (eRect.right - bRect.left - imgTools.offsetWidth - PAD + body.scrollLeft) + "px";
        imgTools.style.top  = (eRect.top   - bRect.top  + PAD + body.scrollTop) + "px";
    }
    // The toolbar should follow whichever media is currently most-
    // relevant: HOVER beats SELECTION, because the user is mousing
    // over a fresh element with the intent to act on it.
    function activeMedia() {
        return hoveredMedia || selectedMedia;
    }
    function refreshTools() {
        const el = activeMedia();
        if (el) {
            imgTools.classList.add("is-visible");
            requestAnimationFrame(() => positionMediaTools(el));
        } else {
            imgTools.classList.remove("is-visible");
        }
    }
    function selectMedia(el) {
        if (selectedMedia && selectedMedia !== el) selectedMedia.classList.remove("is-selected");
        selectedMedia = el;
        if (el) el.classList.add("is-selected");
        refreshTools();
    }
    function hoverMedia(el) {
        if (el === hoveredMedia) return;
        hoveredMedia = el;
        refreshTools();
    }
    function mediaTarget(target) {
        // Returns the img / .floyo-embed ancestor (the thing we treat as
        // a single selectable block), or null if click was on neither.
        if (!target) return null;
        const embed = target.closest(".floyo-embed");
        if (embed && editor.contains(embed)) return embed;
        if (target.tagName === "IMG" && !target.classList.contains("floyo-embed-thumb") && editor.contains(target)) {
            return target;
        }
        return null;
    }
    editor.addEventListener("click", (e) => {
        // ── Open button inside a selected video card → source URL in new tab ──
        const openBtn = e.target.closest(".floyo-embed-open, .floyo-embed-play");
        if (openBtn && editor.contains(openBtn)) {
            e.preventDefault();
            e.stopPropagation();
            const embed = openBtn.closest(".floyo-embed");
            if (!embed) return;
            if (selectedMedia !== embed) {
                selectMedia(embed);
                return;
            }
            const url = videoEmbedUrl(embed);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
            return;
        }

        // ── Selection (img / embed) ──
        const m = mediaTarget(e.target);
        if (m) {
            e.preventDefault();
            selectMedia(m);
        } else if (!imgTools.contains(e.target)) {
            selectMedia(null);
        }
    });
    imgTools.addEventListener("mousedown", (e) => e.preventDefault());
    imgTools.addEventListener("click", (e) => {
        const btn = e.target.closest(".floyo-img-tool-btn");
        if (!btn || !selectedMedia) return;
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === "smaller" || act === "bigger") {
            const tag = selectedMedia.classList.contains("floyo-embed") ? "embed" : "img";
            const beforeRect  = selectedMedia.getBoundingClientRect();
            // Snapshot the node size BEFORE the resize. If anything grows
            // the node as a side-effect, we'll snap it back.
            const lockedSize = node.size ? [...node.size] : null;
            const curr = selectedMedia.offsetWidth || 200;
            const next = act === "bigger" ? curr * 1.1 : curr * 0.9;
            const maxW = Math.max(160, body.clientWidth - 28);
            const newW = Math.max(120, Math.min(maxW, next));
            selectedMedia.style.width = newW + "px";
            if (selectedMedia.tagName === "IMG") {
                selectedMedia.style.height = "auto";
            } else if (selectedMedia.classList.contains("floyo-embed")) {
                selectedMedia.style.removeProperty("height");
            }
            // Forcibly preserve the node's size — defeats any ComfyUI
            // auto-grow that reacts to taller DOM content.
            const restoreNodeSize = () => {
                if (lockedSize && node.size &&
                    (node.size[0] !== lockedSize[0] || node.size[1] !== lockedSize[1])) {
                    node.setSize(lockedSize);
                    node.setDirtyCanvas(true, true);
                }
            };
            requestAnimationFrame(() => {
                restoreNodeSize();
                positionMediaTools(selectedMedia);
            });
            // One more snap-back on the NEXT frame in case ComfyUI
            // re-runs its own layout after ours.
            setTimeout(restoreNodeSize, 16);
        } else if (act === "delete") {
            const el = selectedMedia;
            selectMedia(null);
            el.remove();
        }
        syncContent();
    });
    // Reposition the mini-toolbar when the body scrolls so it sticks
    // to whatever is selected.
    body.addEventListener("scroll", () => {
        const el = activeMedia();
        if (el) positionMediaTools(el);
    });

    // Hover → toolbar follows mouse to whatever media is being hovered,
    // even if a different media is currently selected. Selection only
    // controls the OUTLINE; hover wins for toolbar position.
    editor.addEventListener("mousemove", (e) => {
        hoverMedia(mediaTarget(e.target));
    });
    editor.addEventListener("mouseleave", () => hoverMedia(null));

    // ── Title rename + enter-editor via LiteGraph-canvas double-click ──
    // pos is in the node's local coords; title-bar zone is y < 0.
    // (Some clicks land on LiteGraph's canvas BEFORE reaching the DOM
    //  widget — this catches those.)
    const titleH = (window.LiteGraph?.NODE_TITLE_HEIGHT) ?? 30;

    // Collapse / expand click handling is provided by LiteGraph's
    // NATIVE chevron region (the small clickable spot LiteGraph draws
    // at the left of the title bar — clicking it toggles
    // node.flags.collapsed). We paint our own larger, pixel-art-style
    // chevron over the top in onDrawForeground so the icon visually
    // matches the ArcadePixelNeue title; the click region underneath
    // is still LiteGraph's, so no extra mouse plumbing is needed.

    node.onDblClick = function (e, pos /*, graphCanvas */) {
        // Title-bar zone — open rename prompt.
        if (pos && pos[1] <= 0 && Math.abs(pos[1]) <= titleH + 4) {
            const next = window.prompt("Rename note:", node.properties.title || DEFAULT_TITLE);
            if (next != null) {
                node.properties.title = next.trim() || DEFAULT_TITLE;
                node.setDirtyCanvas(true, true);
            }
            return true;
        }
        // Body zone — enter editor mode (covers clicks that didn't
        // bubble through the DOM widget, e.g. on the empty bottom
        // padding area).
        if (pos && pos[1] > 0 && wrapper.dataset.mode === "display") {
            enterEditor();
            return true;
        }
        return false;
    };

    // ── Title-bar + canvas overlay rendering ──
    // Draws (a) a custom Figma-style chevron over LiteGraph's native one,
    // (b) the title text in the Arcade font in the title-bar zone,
    // (c) a triangular speech-bubble notch protruding from the selected
    // side of the node when a pointer direction is set. The ctx LiteGraph
    // passes is translated so (0,0) is the top-left of the body — the
    // title bar lives at y ∈ [-titleH, 0].
    const onDrawForeground = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        onDrawForeground?.apply(this, arguments);
        if (!node.size) return;
        const [w, h] = node.size;
        const t = THEMES[node.properties.theme] || THEMES[DEFAULT_THEME];

        // ── 0. Repaint the title bar with our theme colour ──
        // ComfyUI's frontend draws the native node title TEXT (the
        // Python class name "FloyoStickyNote") on the title-bar
        // background BEFORE onDrawForeground runs. Setting node.title
        // or overriding getTitle() suppresses our INSTANCE title but
        // in v3 the frontend can still fall back to node.type when
        // node.title is empty, so we get the raw class name baked
        // into the title-bar paint.
        //
        // We can't undo that paint, but we CAN cover it: fill the
        // entire title-bar rectangle with our header colour again,
        // wiping the native text. Then we draw our chevron and the
        // custom Arcade-font title cleanly on top.
        ctx.save();
        ctx.fillStyle = t.header;
        ctx.fillRect(0, -titleH, w, titleH);
        ctx.restore();

        // ── 1. Custom collapse/expand chevron in the title bar ──
        // Draw the Figma-style pixel chevron as hard-edged blocks so it
        // stays crisp and does not depend on font fallback glyph shapes.
        // Expanded = down chevron, collapsed = right chevron.
        ctx.save();
        drawPixelChevron(ctx, 14, -titleH / 2, Boolean(node.flags?.collapsed));
        ctx.restore();

        // ── 2. Custom title text in Arcade font ──
        // Plain weight + 18 px — matches the Figma 945:5091 title-bar
        // text size and rhythm. Bold made the pixel font look heavier
        // than the reference; the typeface itself is already a pixel
        // hand so it doesn't need a bold modifier.
        // Letter-spacing of 2 px per Matt's Slack feedback ("a little
        // more letter spacing so the letters are a little more far
        // apart") — same wider rhythm as the Floyo wordmark itself.
        // ALWAYS draws (no `if` guard) so the title can never end up
        // blank — falls back to DEFAULT_TITLE if properties.title is
        // empty for whatever reason.
        {
            const titleText = node.properties.title || DEFAULT_TITLE;
            ctx.save();
            ctx.font = TITLE_FONT;
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.textAlign = "left";
            // Leave room for our custom chevron (~28 px from the left
            // edge of the title bar so it visually sits in the same
            // slot as LiteGraph's native handle).
            ctx.beginPath();
            ctx.rect(28, -titleH, Math.max(20, w - 34), titleH);
            ctx.clip();
            drawTrackedText(ctx, titleText, 28, -titleH / 2 + 1, TITLE_LETTER_SPACING, Math.max(20, w - 34));
            ctx.restore();
        }

        // Collapsed/minimized state should look like the Figma single
        // title bar, not a tall empty node. LiteGraph keeps node.size,
        // so we must avoid drawing our full body outline here.
        if (node.flags?.collapsed) {
            ctx.save();
            ctx.strokeStyle = t.border;
            ctx.lineWidth = 2;
            drawRoundedRectPath(ctx, 1, -titleH + 1, w - 2, titleH - 2, 8);
            ctx.stroke();
            ctx.restore();
            return;
        }

        // ── 2b. Themed outline around the whole node (Matt's feedback) ──
        // "outlines around the node, just one color number higher"
        // — themes already store `border` which is exactly one step
        // up the brand ramp from `bg` (ube-6 vs ube-7), so we trace
        // the node rect with it.  2 px stroke INSIDE the node so it
        // hugs the rounded corners without bleeding into the canvas.
        ctx.save();
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        // LiteGraph rounds corners with NODE_TITLE_HEIGHT / 2 — match
        // it so our outline doesn't square off where the chrome curves.
        drawRoundedRectPath(ctx, 1, -titleH + 1, w - 2, h + titleH - 2, 8);
        ctx.stroke();
        ctx.restore();

        // ── 3. Direction notch (Matt's feedback) ──
        // Speech-bubble-style triangle attached to the selected edge so
        // the reader can tell what the floating note is pointing at.
        // The base extends slightly INTO the chrome so the notch
        // visually merges with the title bar / body — no visible seam.
        //
        // Size scales with the smaller of the node's two dimensions —
        // tiny notes get a smaller notch, big notes get a bigger one.
        // Clamped so the notch always stays in a reasonable range.
        const dir = node.properties.pointerDir;
        if (!dir) return;
        const ref   = Math.min(w, h);
        const base  = Math.max(28, Math.min(120, ref * 0.18));  // wider of the triangle
        const reach = Math.max(18, Math.min(70,  ref * 0.10));  // how far the tip protrudes
        const overlap = 2;  // px the base sinks INTO the chrome
        ctx.save();
        // Fill with the body bg colour so the notch reads as part of
        // the node's main mass. Stroke only the OUTER two edges with
        // the same outline colour as the node; do not stroke the base,
        // otherwise a visible joint line appears where the notch meets
        // the node body.
        ctx.fillStyle   = t.bg;
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.beginPath();
        let notchStroke = null;
        if (dir === "up") {
            const cx = w / 2;
            const left = [cx - base / 2, -titleH + overlap];
            const right = [cx + base / 2, -titleH + overlap];
            const tip = [cx, -titleH - reach];
            ctx.moveTo(left[0], left[1]);
            ctx.lineTo(right[0], right[1]);
            ctx.lineTo(tip[0], tip[1]);
            notchStroke = [left, tip, right];
        } else if (dir === "down") {
            const cx = w / 2;
            const left = [cx - base / 2, h - overlap];
            const right = [cx + base / 2, h - overlap];
            const tip = [cx, h + reach];
            ctx.moveTo(left[0], left[1]);
            ctx.lineTo(right[0], right[1]);
            ctx.lineTo(tip[0], tip[1]);
            notchStroke = [left, tip, right];
        } else if (dir === "left") {
            // Vertical center includes the title-bar zone visually.
            const cy = (h - titleH) / 2;
            const top = [overlap, cy - base / 2];
            const bottom = [overlap, cy + base / 2];
            const tip = [-reach, cy];
            ctx.moveTo(top[0], top[1]);
            ctx.lineTo(bottom[0], bottom[1]);
            ctx.lineTo(tip[0], tip[1]);
            notchStroke = [top, tip, bottom];
        } else { // right
            const cy = (h - titleH) / 2;
            const top = [w - overlap, cy - base / 2];
            const bottom = [w - overlap, cy + base / 2];
            const tip = [w + reach, cy];
            ctx.moveTo(top[0], top[1]);
            ctx.lineTo(bottom[0], bottom[1]);
            ctx.lineTo(tip[0], tip[1]);
            notchStroke = [top, tip, bottom];
        }
        ctx.closePath();
        ctx.fill();
        if (notchStroke) {
            ctx.beginPath();
            ctx.moveTo(notchStroke[0][0], notchStroke[0][1]);
            ctx.lineTo(notchStroke[1][0], notchStroke[1][1]);
            ctx.lineTo(notchStroke[2][0], notchStroke[2][1]);
        }
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
    wireFooter(footer, {
        onTheme: (t) => {
            node.properties.theme = t;
            wrapper.dataset.theme = t;
            footer.querySelectorAll(".floyo-swatch").forEach((s) =>
                s.classList.toggle("is-active", s.dataset.theme === t)
            );
            // Update the LiteGraph chrome colors too — chrome IS the header.
            applyChromeTheme();
        },
        onSave: exitEditor,
        onPointerDir: (dir) => {
            // Toggle: same arrow clicked again → clear
            node.properties.pointerDir =
                node.properties.pointerDir === dir ? null : dir;
            applyPointerActive();
            // Trigger a redraw via every available path — some ComfyUI
            // versions debounce `node.setDirtyCanvas` differently and
            // the notch then waits a full second before appearing. Hit
            // node, graph, AND canvas so SOMETHING refreshes immediately.
            node.setDirtyCanvas(true, true);
            try { app?.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
            try { app?.canvas?.draw?.(true, true); } catch (_) {}
        },
    });
    applyPointerActive();
    // Mark active swatch on first paint
    footer.querySelectorAll(".floyo-swatch").forEach((s) =>
        s.classList.toggle("is-active", s.dataset.theme === node.properties.theme)
    );
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

    // ── Initial sizing + continuous clamp ──
    // ComfyUI's DOM widget layout sometimes mutates node.size[] directly
    // (not via setSize), so a one-shot clamp here isn't enough. We:
    //   1. set a sane default,
    //   2. intercept setSize() and clamp inside it,
    //   3. re-clamp every paint in onDrawForeground.
    // Min: small enough that the user can drag the resize handle all
    // the way down to a slim title-only state. Earlier 240×80 floor
    // felt "stuck" — the node refused to shrink past comfortable size.
    // Max: a generous sanity cap to catch true runaways.
    const MIN_W = 180, MIN_H = 60;
    const MAX_W = 1600, MAX_H = 1200;

    function clampSize() {
        if (!node.size) return false;
        let changed = false;
        if (node.size[0] > MAX_W) { node.size[0] = MAX_W; changed = true; }
        if (node.size[1] > MAX_H) { node.size[1] = MAX_H; changed = true; }
        if (node.size[0] < MIN_W) { node.size[0] = MIN_W; changed = true; }
        if (node.size[1] < MIN_H) { node.size[1] = MIN_H; changed = true; }
        return changed;
    }
    if (!node.size || (node.size[0] < MIN_W || node.size[1] < MIN_H)) {
        node.setSize([246, 320]);
    } else {
        clampSize();
    }
    // Continuous clamp — runs on every canvas redraw (cheap; just an
    // array comparison). Catches direct mutations of node.size[] that
    // ComfyUI's auto-resize might do behind setSize's back. No need to
    // setDirtyCanvas — we're already inside a draw pass, and the next
    // frame naturally picks up the new size.
    const onDrawForegroundClamp = node.onDrawForeground;
    node.onDrawForeground = function () {
        clampSize();
        return onDrawForegroundClamp?.apply(this, arguments);
    };

    // Also intercept setSize itself — anything that explicitly calls
    // node.setSize(big) gets clamped before LiteGraph stores it.
    const origSetSize = node.setSize.bind(node);
    node.setSize = function (size) {
        const w = Math.max(MIN_W, Math.min(MAX_W, size[0]));
        const h = Math.max(MIN_H, Math.min(MAX_H, size[1]));
        return origSetSize([w, h]);
    };

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
        // Clamp legacy oversized node.size from saved workflows where
        // the node had exploded under an earlier version of this code.
        if (node.size && (node.size[0] > MAX_W || node.size[1] > MAX_H)) {
            node.setSize([
                Math.min(node.size[0], MAX_W),
                Math.min(node.size[1], MAX_H),
            ]);
        }
        const s = o.floyo_state;
        if (!s) return;
        Object.assign(node.properties, s);
        wrapper.dataset.theme = s.theme || DEFAULT_THEME;
        wrapper.dataset.font  = s.font  || "Default";
        // Keep LiteGraph's native label non-empty so it cannot fall back
        // to the Python class name; our canvas draw covers the sentinel.
        node.title = NATIVE_TITLE_SENTINEL;
        node.getTitle = function () { return NATIVE_TITLE_SENTINEL; };
        editor.innerHTML  = s.content || "";
        display.innerHTML = s.content || "";
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
    function currentBlockTag() {
        try {
            return String(document.queryCommandValue("formatBlock") || "").replace(/[<>]/g, "").toLowerCase();
        } catch {
            return "";
        }
    }

    function commandIsActive(cmd, arg) {
        try {
            if (cmd === "formatBlock" && arg) return currentBlockTag() === arg.toLowerCase();
            if (cmd && cmd !== "removeFormat") return document.queryCommandState(cmd);
        } catch { /* queryCommandState can throw on some browsers */ }
        return false;
    }

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
            // Save the caret position BEFORE opening the modal — focusing
            // the modal's <input> moves selection away from the editor,
            // and editor.focus() afterward would otherwise put the caret
            // at the start. We restore the cloned range so the inserted
            // media lands exactly where the user was typing.
            const savedRange = (() => {
                const s = window.getSelection();
                if (s?.rangeCount && editor.contains(s.anchorNode)) {
                    return s.getRangeAt(0).cloneRange();
                }
                return null;
            })();
            const restoreSelection = () => {
                editor.focus();
                if (savedRange) {
                    const s = window.getSelection();
                    s.removeAllRanges();
                    s.addRange(savedRange);
                } else {
                    placeCaretAtEnd(editor);
                }
            };

            if (cmd === "insertImageURL") {
                // URL-only for now (local file picker disabled per user request).
                const src = await openUrlModal({
                    title: "Insert Image URL",
                    placeholder: "Paste image URL",
                });
                if (src) {
                    restoreSelection();
                    insertMediaWithTrailingParagraph(editor,
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
                    const embed = videoUrlToEmbed(url);
                    if (embed) {
                        restoreSelection();
                        insertMediaWithTrailingParagraph(editor, embed);
                        onChange();
                    } else {
                        alert("That doesn't look like a YouTube or Vimeo URL.");
                    }
                }
                return;
            }

            // ── Standard execCommand path ──
            // Make every formatting button behave as a toggle:
            // H1/H2/H3/PRE click again -> paragraph, lists/inline styles
            // click again -> browser's native execCommand toggles them off.
            try {
                if (cmd === "formatBlock" && arg && commandIsActive(cmd, arg)) {
                    document.execCommand("formatBlock", false, "P");
                } else {
                    document.execCommand(cmd, false, arg);
                }
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
    logo.src = FLOYO_LOGO();
    logo.alt = "Floyo";
    logo.draggable = false;
    footer.appendChild(logo);

    // ── Center cluster: theme swatches ──
    const center = document.createElement("div");
    center.className = "floyo-footer-center";

    const swatches = document.createElement("div");
    swatches.className = "floyo-footer-swatches";
    ["purple", "blue", "green", "grey"].forEach((t) => {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = `floyo-swatch swatch-${t}`;
        sw.dataset.theme = t;
        sw.title = `${t[0].toUpperCase()}${t.slice(1)} theme`;
        swatches.appendChild(sw);
    });
    center.appendChild(swatches);

    footer.appendChild(center);

    // ── Pointer-direction compass — Matt's Figma 970-485 design ──
    // Four polygons arranged like a compass rose, drawn at 26×18 (the
    // Figma natural size) and scaled up via CSS. Each arrow is a
    // proper triangle wedge (not an arrow-with-stem). Inactive = the
    // top "Up" wedge filled with #D9D9D9 in the reference; the others
    // are outlined with white@30%. We swap the FILL based on which
    // direction is currently active so the selected wedge stands out.
    const pointer = document.createElement("div");
    pointer.className = "floyo-footer-pointer";
    pointer.title = "Pick a side for the node to point from";
    // Up / Down / Left / Right wedges in a roomier viewBox. Left/right
    // are intentionally redrawn as full-size triangles so they don't look
    // smaller than the top/bottom wedges when rasterized in the compact footer.
    pointer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 22" width="30" height="22" fill="none" aria-hidden="true" class="floyo-pointer-svg">
        <path class="floyo-pointer-arrow" data-dir="up"
              d="M14.134 1.5C14.519 0.833 15.481 0.833 15.866 1.5L18.25 5.63C18.635 6.297 18.154 7.13 17.384 7.13H12.616C11.846 7.13 11.365 6.297 11.75 5.63L14.134 1.5Z"/>
        <path class="floyo-pointer-arrow" data-dir="down"
              d="M15.866 20.5C15.481 21.167 14.519 21.167 14.134 20.5L11.75 16.37C11.365 15.703 11.846 14.87 12.616 14.87H17.384C18.154 14.87 18.635 15.703 18.25 16.37L15.866 20.5Z"/>
        <path class="floyo-pointer-arrow" data-dir="left"
              d="M1.5 11.866C0.833 11.481 0.833 10.519 1.5 10.134L5.63 7.75C6.297 7.365 7.13 7.846 7.13 8.616V13.384C7.13 14.154 6.297 14.635 5.63 14.25L1.5 11.866Z"/>
        <path class="floyo-pointer-arrow" data-dir="right"
              d="M28.5 10.134C29.167 10.519 29.167 11.481 28.5 11.866L24.37 14.25C23.703 14.635 22.87 14.154 22.87 13.384V8.616C22.87 7.846 23.703 7.365 24.37 7.75L28.5 10.134Z"/>
    </svg>`;
    footer.appendChild(pointer);

    // ── Save button (far right) ──
    const save = document.createElement("button");
    save.type = "button";
    save.className = "floyo-footer-save";
    save.title = "Save & close editor";
    // Pixel-art check from Matt's Figma 970-485 — Mint/Mint 4 #3CE195
    save.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M9.33301 14L4.66699 14V12.833L9.33301 12.833V14ZM4.66699 12.833H2.33301L2.33301 11.667H4.66699V12.833ZM11.667 12.833H9.33301V11.667H11.667V12.833ZM2.33301 11.667H1.16699L1.16699 9.33301H2.33301V11.667ZM12.833 11.667H11.667V9.33301H12.833V11.667ZM6.41699 10.5H5.25V9.33301H6.41699V10.5ZM1.16699 9.33301H0L0 4.66699H1.16699L1.16699 9.33301ZM5.25 9.33301H4.08301V8.16699H5.25V9.33301ZM7.58301 9.33301L6.41699 9.33301V8.16699L7.58301 8.16699V9.33301ZM14 9.33301H12.833L12.833 4.66699H14L14 9.33301ZM4.08301 8.16699H2.91699V7L4.08301 7V8.16699ZM8.75 8.16699H7.58301V7H8.75L8.75 8.16699ZM9.91699 7H8.75V5.83301H9.91699V7ZM11.083 5.83301L9.91699 5.83301V4.66699L11.083 4.66699V5.83301ZM2.33301 4.66699H1.16699L1.16699 2.33301L2.33301 2.33301V4.66699ZM12.833 4.66699H11.083V3.5H11.667V2.33301L12.833 2.33301V4.66699ZM4.66699 2.33301H2.33301L2.33301 1.16699L4.66699 1.16699V2.33301ZM11.667 2.33301H9.33301V1.16699L11.667 1.16699V2.33301ZM9.33301 0V1.16699L4.66699 1.16699V0L9.33301 0Z" fill="#3CE195"/>
    </svg>`;
    footer.appendChild(save);

    return footer;
}

function wireFooter(footer, { onTheme, onSave, onPointerDir }) {
    // Pointer-direction arrows (4-way compass in the footer).
    // Listen on the OUTER `.floyo-footer-pointer` container with event
    // delegation — clicks anywhere inside (SVG, path, padding) bubble up
    // and `closest('.floyo-pointer-arrow')` finds which arrow was hit.
    // This is more robust than wiring each `<path>` individually, because
    // some browsers/versions don't reliably fire `click` on SVG `<path>`
    // children inside a Shadow-DOM-style nested structure.
    const compass = footer.querySelector(".floyo-footer-pointer");
    if (compass) {
        compass.addEventListener("mousedown", (e) => {
            // Block LiteGraph from also handling this click — keep focus.
            e.preventDefault();
            e.stopPropagation();
        });
        compass.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const arrow = e.target.closest(".floyo-pointer-arrow");
            if (!arrow) return;
            const dir = arrow.dataset.dir;
            if (!dir) return;
            onPointerDir?.(dir);
        });
    }
    // Keep the original per-path listeners as a belt-and-braces backup
    // for any browser where the delegated handler somehow misses.
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
    const save = footer.querySelector(".floyo-footer-save");
    save.addEventListener("mousedown", (e) => e.preventDefault());
    save.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSave();
    });
}

/* ─── Tiny helpers ────────────────────────────────────────────────────── */

function drawTrackedText(ctx, text, x, y, spacing, maxWidth = Infinity) {
    let cursor = x;
    for (const ch of Array.from(text)) {
        const w = ctx.measureText(ch).width;
        if (cursor + w > x + maxWidth) break;
        ctx.fillText(ch, cursor, y);
        cursor += w + spacing;
    }
}

function drawPixelChevron(ctx, cx, cy, collapsed) {
    const scale = 1.25;
    const blocks = [
        [6.4165, 8.75, 1.1667, 1.1667],
        [5.2498, 7.5833, 1.1667, 1.1667],
        [7.5832, 7.5833, 1.1667, 1.1667],
        [4.0832, 6.4167, 1.1667, 1.1667],
        [8.7498, 6.4167, 1.1667, 1.1667],
        [2.9165, 5.25, 1.1667, 1.1667],
        [9.9165, 5.25, 1.1667, 1.1667],
    ];
    ctx.translate(cx, cy);
    if (collapsed) ctx.rotate(-Math.PI / 2);
    ctx.scale(scale, scale);
    ctx.translate(-7, -7);
    ctx.fillStyle = CHEVRON_COLOR;
    for (const [x, y, w, h] of blocks) {
        ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
    }
}

function drawRoundedRectPath(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    const x1 = x + w;
    const y1 = y + h;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x1 - r, y);
    ctx.quadraticCurveTo(x1, y, x1, y + r);
    ctx.lineTo(x1, y1 - r);
    ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
    ctx.lineTo(x + r, y1);
    ctx.quadraticCurveTo(x, y1, x, y1 - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

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
 * Insert a media block (img / .floyo-embed) at the current caret, then
 * append an empty <p> below and put the caret INSIDE it. Lets the user
 * keep typing on the next line — the Word / Google-Docs flow of
 * "paragraph, image, paragraph, image, paragraph".
 */
function insertMediaWithTrailingParagraph(editor, mediaHtml) {
    const fullHtml = mediaHtml + '<p class="floyo-after-media"><br></p>';
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
        editor.insertAdjacentHTML("beforeend", fullHtml);
        // Place caret inside the trailing <p> we just appended.
        const trailing = editor.querySelector("p.floyo-after-media:last-child");
        if (trailing) {
            const r = document.createRange();
            r.setStart(trailing, 0);
            r.collapse(true);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
        }
        return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tmpl = document.createElement("template");
    tmpl.innerHTML = fullHtml;
    const frag = tmpl.content;
    // Grab the trailing <p> BEFORE the fragment is moved into the DOM —
    // otherwise frag.lastChild is null after insertNode(frag).
    const trailingP = frag.lastChild;
    range.insertNode(frag);
    if (trailingP) {
        const r = document.createRange();
        r.setStart(trailingP, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
    }
}

/**
 * Recognise a YouTube or Vimeo URL and return a "preview card" embed.
 * We store the original URL and open it in a new browser tab instead of
 * loading an iframe inside the note; this keeps sticky notes lightweight
 * and leaves editor clicks free for resize/delete selection.
 * Returns `null` if the URL doesn't match a known pattern.
 */
function videoUrlToEmbed(url) {
    if (!url) return null;
    url = url.trim();
    const originalUrl = escapeAttr(url);
    const openSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
    // YouTube — youtu.be/<id>, youtube.com/watch?v=<id>, embed/<id>, shorts/<id>
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) {
        const id = escapeAttr(m[1]);
        // hqdefault is the most reliable size that exists for every video.
        return `<div class="floyo-embed floyo-embed-youtube" data-platform="youtube" data-video-id="${id}" data-url="${originalUrl}" contenteditable="false">
            <img class="floyo-embed-thumb" src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="YouTube video" onerror="this.style.display='none'" />
            <button type="button" class="floyo-embed-open" data-act="open" aria-label="Open video in new tab">${openSvg}</button>
            <div class="floyo-embed-brand">YouTube</div>
        </div>`;
    }
    // Vimeo — vimeo.com/<id>, player.vimeo.com/video/<id>
    m = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) {
        const id = escapeAttr(m[1]);
        // vumbnail.com is a free Vimeo-thumbnail proxy; if it fails the
        // onerror hides the broken img and the dark backdrop remains.
        return `<div class="floyo-embed floyo-embed-vimeo" data-platform="vimeo" data-video-id="${id}" data-url="${originalUrl}" contenteditable="false">
            <img class="floyo-embed-thumb" src="https://vumbnail.com/${id}.jpg" alt="Vimeo video" onerror="this.style.display='none'" />
            <button type="button" class="floyo-embed-open" data-act="open" aria-label="Open video in new tab">${openSvg}</button>
            <div class="floyo-embed-brand">Vimeo</div>
        </div>`;
    }
    return null;
}

function videoEmbedUrl(embed) {
    if (!embed) return "";
    const stored = embed.dataset.url;
    if (stored) return stored;
    const id = embed.dataset.videoId;
    if (!id) return "";
    if (embed.dataset.platform === "youtube") return `https://www.youtube.com/watch?v=${id}`;
    if (embed.dataset.platform === "vimeo") return `https://vimeo.com/${id}`;
    return "";
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
