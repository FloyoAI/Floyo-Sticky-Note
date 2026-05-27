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
console.log("%c[Floyo Sticky Note] module loaded — build 2026-05-23-resize-debug", "color:#A78BFA;font-weight:700");

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
    justify-content: space-between;   /* spread items across the full
                                         width so the panel stops looking
                                         left-aligned with empty space on
                                         the right */
    flex-wrap: wrap;
    gap: 1px;
    padding: 5px 10px;
    background: var(--toolbar);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.22);
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-toolbar { display: flex; }
.floyo-tool-btn {
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    border-radius: 5px;
    height: 24px;
    min-width: 22px;          /* tighter so all 13 buttons fit on one line */
    padding: 0 4px;
    font: inherit;
    font-size: 11.5px;
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
    margin: 0 3px;
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

/* ── Display-mode affordances ──────────────────────────────────────── */
/* In display mode (read-only) we surface two small controls in the
   wrapper's bottom row — an Edit pencil on the left to enter editor
   mode, and a "grip" indicator on the right hinting at the LiteGraph
   resize handle. Both hide when the user enters editor mode (the full
   footer takes their place). Lives as a flex sibling of body so it
   stays pinned at the bottom even as body content scrolls. */
.floyo-display-actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px 8px;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-display-actions { display: none; }

.floyo-display-edit {
    width: 28px;
    height: 24px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    color: var(--text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
}
.floyo-display-edit:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.32);
    transform: scale(1.05);
}
.floyo-display-edit:active { transform: scale(0.96); }

.floyo-display-grip {
    color: rgba(255, 255, 255, 0.35);
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

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
.floyo-embed-play {
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
.floyo-embed-youtube .floyo-embed-play:hover {
    background: #FF0000;  /* YouTube red */
    transform: translate(-50%, -50%) scale(1.06);
}
.floyo-embed-vimeo .floyo-embed-play:hover {
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
    flex: 0 0 auto;
    display: none;
    align-items: center;
    justify-content: space-between;  /* logo left, center cluster mid,
                                        save right */
    gap: 12px;
    padding: 4px 12px;          /* reduced top/bottom — tighter to body */
    background: var(--toolbar);
    border-top: 1px solid rgba(0, 0, 0, 0.22);
    min-height: 36px;
    box-sizing: border-box;
}
.floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer { display: flex; }

/* Floyo full-wordmark logo on the bottom-left.
   Per Ashna + Matt's Slack agreement ("Full logo is better - smaller?" /
   "sure sure"), sized so it sits just slightly taller than the swatches
   — matches the Figma 902:277 bottom-right variant exactly. */
.floyo-footer-logo {
    height: 18px;
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
    flex: 0 0 auto;
}

.floyo-footer-pointer {
    color: var(--text-mute);
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex: 0 0 auto;
}
.floyo-pointer-svg { display: block; width: 28px; height: 28px; }
.floyo-pointer-arrow {
    fill: var(--text-mute);
    opacity: 0.7;
    cursor: pointer;
    transition: fill 120ms ease, opacity 120ms ease, transform 120ms ease;
    transform-origin: 12px 12px;
    /* Larger interactive padding around each arrow path so the click
       target is comfortable even though the visual is small. */
    stroke: transparent;
    stroke-width: 4;
    paint-order: stroke fill;
    pointer-events: all;
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
                this.title = "";
                this.getTitle = function () { return ""; };
            } catch (e) { console.warn("[Floyo Sticky Note] early theme failed:", e); }

            const r = onNodeCreated?.apply(this, arguments);
            try {
                console.log("[Floyo Sticky Note] onNodeCreated — setting up widget");
                setupStickyNote(this);
                console.log("[Floyo Sticky Note] setup complete");
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
    displayActions.innerHTML = `
        <button type="button" class="floyo-display-edit" title="Edit">
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none"
                 stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 14 L2 16 L4 16 L13 7 L11 5 Z"/>
                <path d="M11 5 L13 3 L15 5 L13 7"/>
            </svg>
        </button>
        <div class="floyo-display-grip" aria-hidden="true" title="Drag the node corner to resize">
            <svg viewBox="0 0 18 18" width="12" height="12" fill="currentColor" aria-hidden="true">
                <circle cx="14" cy="14" r="1"/><circle cx="14" cy="10" r="1"/><circle cx="10" cy="14" r="1"/>
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

    // Edit pencil button (display-mode only) — single click enters editor.
    displayActions.querySelector(".floyo-display-edit")
        .addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            enterEditor();
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
        // ── Play button inside a video card → swap thumbnail for iframe ──
        const playBtn = e.target.closest(".floyo-embed-play");
        if (playBtn && editor.contains(playBtn)) {
            e.preventDefault();
            e.stopPropagation();
            const embed = playBtn.closest(".floyo-embed");
            const id = embed?.dataset.videoId;
            const platform = embed?.dataset.platform;
            if (!embed || !id) return;
            const src = platform === "youtube"
                ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
                : `https://player.vimeo.com/video/${id}?autoplay=1`;
            // Replace the whole card with just the iframe (keeps the
            // outer .floyo-embed wrapper so the 16:9 aspect-ratio +
            // selection behaviour all still work).
            embed.innerHTML = `<iframe src="${src}" frameborder="0" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen"></iframe>`;
            syncContent();
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
                const afterRect = selectedMedia.getBoundingClientRect();
                console.log("%c[Floyo resize]", "color:#FBBF24;font-weight:700", {
                    tag, act,
                    before:  { w: Math.round(beforeRect.width),  h: Math.round(beforeRect.height) },
                    setWidth: newW,
                    after:   { w: Math.round(afterRect.width),   h: Math.round(afterRect.height) },
                    bodyClientW: body.clientWidth,
                    nodeSizeLocked: lockedSize ? lockedSize[1] : null,
                    nodeSizeAfter:  node.size ? node.size[1] : null,
                });
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

        // ── 1. Custom collapse/expand chevron in the title bar ──
        // The Figma K-Sampler reference uses a chunky pixel-art chevron
        // that visually matches the ArcadePixelNeue title text. Drawing
        // a smooth ctx.fill() triangle gave anti-aliased edges that
        // looked out of place; instead we render the chevron as a font
        // glyph in ArcadePixelNeue itself so it inherits the same
        // pixel-art rendering as the title.
        //   "v"  when expanded  (points at the open body below)
        //   ">"  when collapsed (points at the hidden body to the right)
        // The native LiteGraph chevron click region underneath still
        // handles the toggle — we just paint a better-looking icon over.
        ctx.save();
        ctx.font = `18px "ArcadePixelNeue", "Courier New", monospace`;
        ctx.fillStyle = "#FFFFFF";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const chevChar = node.flags?.collapsed ? ">" : "v";
        ctx.fillText(chevChar, 14, -titleH / 2 + 1);
        ctx.restore();

        // ── 2. Custom title text in Arcade font ──
        // Plain weight + 18 px — matches the Figma 945:5091 title-bar
        // text size and rhythm. Bold made the pixel font look heavier
        // than the reference; the typeface itself is already a pixel
        // hand so it doesn't need a bold modifier.
        // Letter-spacing of 2 px per Matt's Slack feedback ("a little
        // more letter spacing so the letters are a little more far
        // apart") — same wider rhythm as the Floyo wordmark itself.
        if (node.properties.title) {
            ctx.save();
            ctx.font = `18px "ArcadePixelNeue", "Courier New", monospace`;
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.textAlign = "left";
            // `letterSpacing` on Canvas2D is supported in Chrome 99+ /
            // Safari 16.4+ / Firefox 110+ — well within the ComfyUI
            // frontend's browser support window. Older browsers just
            // ignore it gracefully, so it's a safe progressive add.
            try { ctx.letterSpacing = "2px"; } catch (_) {}
            // Leave room for our custom chevron (~28 px from the left
            // edge of the title bar so it visually sits in the same
            // slot as LiteGraph's native handle).
            ctx.fillText(node.properties.title, 28, -titleH / 2 + 1);
            ctx.restore();
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
        const radius = 8;
        const x0 = 1, y0 = -titleH + 1, x1 = w - 1, y1 = h - 1;
        ctx.beginPath();
        ctx.moveTo(x0 + radius, y0);
        ctx.lineTo(x1 - radius, y0);
        ctx.quadraticCurveTo(x1, y0, x1, y0 + radius);
        ctx.lineTo(x1, y1 - radius);
        ctx.quadraticCurveTo(x1, y1, x1 - radius, y1);
        ctx.lineTo(x0 + radius, y1);
        ctx.quadraticCurveTo(x0, y1, x0, y1 - radius);
        ctx.lineTo(x0, y0 + radius);
        ctx.quadraticCurveTo(x0, y0, x0 + radius, y0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Skip drawing the notch while collapsed — the node has no body
        // to attach it to, and a notch floating around nothing looks weird.
        if (node.flags?.collapsed) return;

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
        // the node's main mass (Ritik: "node ka jo bhi colour hoga, wo
        // arrow ka colour"). A thin white-with-low-alpha stroke makes
        // the silhouette legible even when the canvas behind is also
        // dark — without it the notch can blend into a dark workspace
        // and look invisible.
        ctx.fillStyle   = t.bg;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (dir === "up") {
            const cx = w / 2;
            ctx.moveTo(cx - base / 2, -titleH + overlap);
            ctx.lineTo(cx + base / 2, -titleH + overlap);
            ctx.lineTo(cx,            -titleH - reach);
        } else if (dir === "down") {
            const cx = w / 2;
            ctx.moveTo(cx - base / 2, h - overlap);
            ctx.lineTo(cx + base / 2, h - overlap);
            ctx.lineTo(cx,            h + reach);
        } else if (dir === "left") {
            // Vertical center includes the title-bar zone visually.
            const cy = (h - titleH) / 2;
            ctx.moveTo(overlap,  cy - base / 2);
            ctx.lineTo(overlap,  cy + base / 2);
            ctx.lineTo(-reach,   cy);
        } else { // right
            const cy = (h - titleH) / 2;
            ctx.moveTo(w - overlap, cy - base / 2);
            ctx.lineTo(w - overlap, cy + base / 2);
            ctx.lineTo(w + reach,   cy);
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
            // Trigger a redraw via every available path — some ComfyUI
            // versions debounce `node.setDirtyCanvas` differently and
            // the notch then waits a full second before appearing. Hit
            // node, graph, AND canvas so SOMETHING refreshes immediately.
            node.setDirtyCanvas(true, true);
            try { app?.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
            try { app?.canvas?.draw?.(true, true); } catch (_) {}
            console.log(
                "[Floyo Sticky Note] pointerDir =",
                node.properties.pointerDir,
                "  node.size =", node.size && [...node.size]
            );
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

    // ── Debug: trace every node.size change so we can see WHO is
    // growing the node and from where. Poll every 200 ms; on every
    // change, dump the old/new values + a stack to identify the
    // caller.
    let lastSize = node.size ? [...node.size] : [0, 0];
    const sizeMon = setInterval(() => {
        if (!node.size) return;
        if (node.size[0] !== lastSize[0] || node.size[1] !== lastSize[1]) {
            console.log(
                "%c[Floyo size]",
                "color:#FBBF24;font-weight:700",
                "was", [...lastSize],
                "→ now", [...node.size],
                "  (delta", [node.size[0] - lastSize[0], node.size[1] - lastSize[1]], ")"
            );
            lastSize = [...node.size];
        }
    }, 200);
    // Clean up on removal so we don't leak.
    const _origRemovedSize = node.onRemoved;
    node.onRemoved = function () {
        clearInterval(sizeMon);
        return _origRemovedSize?.apply(this, arguments);
    };
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
        node.setSize([480, 480]);
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

    // ── Pointer-direction compass ──
    // BETWEEN center cluster and save button — gives the dropdown
    // breathing room on its right (Ritik: "default button se aur right
    // side me"). Bigger clickable area too.
    const pointer = document.createElement("div");
    pointer.className = "floyo-footer-pointer";
    pointer.title = "Pick a side for the node to point from";
    pointer.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" class="floyo-pointer-svg">
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
            console.log("[Floyo Sticky Note] pointer click:", dir);
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
 * Recognise a YouTube or Vimeo URL and return a "preview card" embed —
 * thumbnail + play overlay. The actual iframe loads only when the user
 * clicks ▶, which:
 *   • avoids YouTube's "Video unavailable" / referrer policy errors that
 *     hit on first load from localhost,
 *   • keeps the workflow snappy (no iframes loading until requested),
 *   • mirrors the Notion / Slack / Medium embed UX.
 * Returns `null` if the URL doesn't match a known pattern.
 */
function videoUrlToEmbed(url) {
    if (!url) return null;
    url = url.trim();
    const playSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
    // YouTube — youtu.be/<id>, youtube.com/watch?v=<id>, embed/<id>, shorts/<id>
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) {
        const id = escapeAttr(m[1]);
        // hqdefault is the most reliable size that exists for every video.
        return `<div class="floyo-embed floyo-embed-youtube" data-platform="youtube" data-video-id="${id}" contenteditable="false">
            <img class="floyo-embed-thumb" src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="YouTube video" onerror="this.style.display='none'" />
            <button type="button" class="floyo-embed-play" data-act="play" aria-label="Play video">${playSvg}</button>
            <div class="floyo-embed-brand">YouTube</div>
        </div>`;
    }
    // Vimeo — vimeo.com/<id>, player.vimeo.com/video/<id>
    m = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) {
        const id = escapeAttr(m[1]);
        // vumbnail.com is a free Vimeo-thumbnail proxy; if it fails the
        // onerror hides the broken img and the dark backdrop remains.
        return `<div class="floyo-embed floyo-embed-vimeo" data-platform="vimeo" data-video-id="${id}" contenteditable="false">
            <img class="floyo-embed-thumb" src="https://vumbnail.com/${id}.jpg" alt="Vimeo video" onerror="this.style.display='none'" />
            <button type="button" class="floyo-embed-play" data-act="play" aria-label="Play video">${playSvg}</button>
            <div class="floyo-embed-brand">Vimeo</div>
        </div>`;
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
