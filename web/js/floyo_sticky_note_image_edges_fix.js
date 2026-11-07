/* Floyo Sticky Note — images sit flush: no backdrop box, no blank edges
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so a new file is the
 * only delivery that reliably reaches every client.
 *
 * Seen on notes that hold a single banner image:
 *   • Every image got a dark rgba(0,0,0,0.25) backdrop and a 1px border, so a
 *     transparent PNG showed a dark box and an opaque one a faint outline.
 *   • Blank lines the editor leaves around media (empty <p></p>, <p><br></p>,
 *     stray <br>) and the image's own 8px margin pushed the image down and
 *     added space under it, so the body scrolled with nothing below.
 *   • On the new frontend the display body kept 30px of bottom padding, while
 *     the edit pencil and resize grip only reach ~3px into the body.
 *
 * FIX:
 *   • Images (both modes): transparent background, no border. Video cards
 *     (.floyo-embed) keep their card.
 *   • Display mode: blank content at the very start and end of a note is
 *     hidden; blank lines between content stay exactly as written. "Blank" is
 *     decided from the real text in JS, never guessed by CSS, because
 *     <p>text<br>text</p> must keep its line break.
 *   • Display mode: when the first or last visible thing is an image or video,
 *     its outer margin is dropped so it sits right at the body padding.
 *   • Display mode on the new frontend: bottom padding 30px → 10px (= top).
 *
 * Saved content is never touched. The edge rules live in one <style> element
 * and are keyed by a data attribute on the note's wrapper, which is outside the
 * content, so the editor, copy/paste and the saved workflow see the same HTML
 * as before. One MutationObserver per note watches only that note's display
 * element and recomputes when its content changes.
 *
 * Remove only together with moving these rules into floyo_sticky_note.js.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-image-edges-fix";
const EDGE_STYLE_ID = "floyo-sticky-image-edges-rules";

/* Same new-frontend gate as floyo_sticky_note_new_frontend_chrome_fix.js. */
const G = '.floyo-sticky-node-shell.floyo-sticky-node-shell:has(.rounded-full.bg-component-node-widget-background)';

const CSS = `
/* No backdrop box and no outline behind images: a transparent PNG shows the
   note colour. Video cards (.floyo-embed and its thumbnail) are unchanged. */
.floyo-sticky-body img:not(.floyo-embed img) {
    background: transparent !important;
    border: none !important;
}

/* New frontend, display mode: bottom padding back to the top value. The doubled
   wrapper class out-specifies the 30px rule of the new-frontend chrome fix. */
${G} .floyo-sticky-wrapper.floyo-sticky-wrapper[data-mode="display"] .floyo-sticky-body {
    padding-bottom: 10px !important;
}
`;

const MEDIA = "img, video, .floyo-embed";

/* Tags that draw nothing when everything inside them is blank. Any other tag
   (li with its bullet, pre, code, hr, ...) counts as visible content. */
const BLANKABLE = new Set([
    "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "B", "STRONG", "I",
    "EM", "U", "S", "STRIKE", "FONT", "A", "SUB", "SUP", "SMALL", "BR", "UL", "OL",
]);

/* An inline style that draws a box or adds space makes even an empty element visible. */
function hasBoxStyle(el) {
    const s = el.style;
    if (!s || !s.length) return false;
    const drawn = (v) => !!v && v !== "none";
    return !!(s.height || s.minHeight || s.paddingTop || s.paddingBottom ||
        s.paddingLeft || s.paddingRight ||
        drawn(s.borderTopStyle) || drawn(s.borderBottomStyle) ||
        drawn(s.borderLeftStyle) || drawn(s.borderRightStyle) ||
        drawn(s.backgroundImage) ||
        (s.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(s.backgroundColor)));
}

function isBlank(n) {
    if (n.nodeType === 3) return !/[^\s​‌‍]/.test(n.data);
    if (n.nodeType !== 1) return true;
    if (n.matches(MEDIA) || !BLANKABLE.has(n.tagName) || hasBoxStyle(n)) return false;
    for (const c of n.childNodes) if (!isBlank(c)) return false;
    return true;
}

/* First (or last) visible text node or visible element, in document order. */
function edgeAtom(el, fromEnd) {
    const kids = [...el.childNodes];
    if (fromEnd) kids.reverse();
    for (const c of kids) {
        if (isBlank(c)) continue;
        if (c.nodeType === 1 && !c.matches(MEDIA) && BLANKABLE.has(c.tagName) && !hasBoxStyle(c)) {
            return edgeAtom(c, fromEnd) || c;
        }
        return c;
    }
    return null;
}

/* Elements before (or after) the atom at every level up to the root. All of
   them are blank, because the atom is the first (or last) visible thing. */
function edgeBlanks(root, atom, fromEnd) {
    const out = [];
    for (let n = atom; n && n !== root; n = n.parentNode) {
        for (let s = fromEnd ? n.nextSibling : n.previousSibling; s; s = fromEnd ? s.nextSibling : s.previousSibling) {
            if (s.nodeType === 1) out.push(s);
        }
    }
    return out;
}

function chainTo(root, el) {
    const out = [];
    for (let n = el; n && n !== root; n = n.parentElement) out.push(n);
    return out;
}

function pathOf(root, el) {
    const parts = [];
    for (let n = el; n !== root; n = n.parentElement) {
        let i = 1;
        for (let s = n.previousElementSibling; s; s = s.previousElementSibling) i++;
        parts.unshift(`:nth-child(${i})`);
    }
    return parts.join(" > ");
}

/* CSS that hides the blank edges of one note's display element. */
function edgeRules(key, root) {
    const first = edgeAtom(root, false);
    if (!first) return "";
    const last = edgeAtom(root, true);
    const scope = `.floyo-sticky-wrapper[data-floyo-edges="${key}"][data-mode="display"] .floyo-sticky-display`;
    const sel = (els) => els.map((e) => `${scope} > ${pathOf(root, e)}`).join(",\n");
    const hide = [...edgeBlanks(root, first, false), ...edgeBlanks(root, last, true)];
    let css = "";
    if (hide.length) css += `${sel(hide)} { display: none !important; }\n`;
    if (first.nodeType === 1 && first.matches(MEDIA)) css += `${sel(chainTo(root, first))} { margin-top: 0 !important; }\n`;
    if (last.nodeType === 1 && last.matches(MEDIA)) css += `${sel(chainTo(root, last))} { margin-bottom: 0 !important; }\n`;
    return css;
}

/* Shared across module copies: the platform can import a module twice. */
const shared = (window.__floyoStickyImageEdges ??= { seq: 0, rules: new Map(), registered: false });

function writeRules() {
    let el = document.getElementById(EDGE_STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = EDGE_STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = [...shared.rules.values()].join("");
}

function watch(node) {
    const wrapper = node?.widgets?.find?.((w) => w?.name === "floyo_sticky")?.element;
    const display = wrapper?.querySelector?.(".floyo-sticky-display");
    if (!display || wrapper.dataset.floyoEdges) return;
    const key = String(++shared.seq);
    wrapper.dataset.floyoEdges = key;
    const update = () => {
        let css = "";
        try { css = edgeRules(key, display); } catch (_) {}
        if (shared.rules.get(key) === css) return;
        shared.rules.set(key, css);
        writeRules();
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(display, { childList: true, subtree: true, characterData: true });
    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
        observer.disconnect();
        shared.rules.delete(key);
        writeRules();
        return onRemoved?.apply(this, arguments);
    };
}

function injectStyle() {
    try {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
}

if (!shared.registered) {
    shared.registered = true;
    app.registerExtension({
        name: "Floyo.StickyNote.ImageEdgesFix",
        async setup() {
            // Never let a setup error break the ComfyUI canvas.
            try {
                injectStyle();
                [200, 800, 2000].forEach((d) => setTimeout(injectStyle, d));
            } catch (_) {}
        },
        async nodeCreated(node) {
            if (node?.comfyClass !== "FloyoStickyNote" && node?.type !== "FloyoStickyNote") return;
            // nodeCreated runs inside the node constructor, before the sticky
            // note builds its DOM in onNodeCreated; one microtask later it exists.
            await Promise.resolve();
            try { watch(node); } catch (_) {}
        },
    });
}
