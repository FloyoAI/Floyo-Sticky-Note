/* Floyo Sticky Note — A−/A+ text-size buttons work on HEADINGS
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so a new file is the
 * only delivery that reliably reaches every client.
 *
 * BUG: the toolbar's A−/A+ buttons did nothing on headings. The legacy handler
 * wrapped the selection in <span style="font-size:..">, but when the selection
 * covers a BLOCK element (h1/h2/h3), the heading's own stylesheet font-size
 * (e.g. ".floyo-sticky-body h1{font-size:14px}") beats the span's inherited
 * size — so nothing visibly changes. Worse, the base size was computed from the
 * wrong element for whole-line selections, so A+ could even shrink a heading.
 *
 * FIX: take over the two buttons with a capture-phase click handler (it runs
 * before the legacy bubble handler and stops propagation, so there is exactly
 * one behavior owner):
 *   • Whole block(s) selected, or caret in a block → bump the BLOCK's inline
 *     font-size (inline style beats the stylesheet — this is what headings
 *     need). Multi-block selections bump each block relative to its own size.
 *   • Partial text inside one block → keep the original span-wrap behavior,
 *     with the base size read from that block.
 *   • Nested sized spans inside a bumped block shift by the same delta so the
 *     whole block scales together.
 * Afterwards a bubbling "input" event runs the main file's pipeline
 * (undo snapshot + save + toolbar refresh) — same pattern as the P-button fix.
 *
 * One capture listener only — NO MutationObserver, NO timers, no load impact.
 */

import { app } from "../../../scripts/app.js";

const MIN = 6, MAX = 36;
const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
const BLOCKS = "h1,h2,h3,p,li,pre,blockquote";

function nearestBlock(node, editor) {
    let el = node && (node.nodeType === 1 ? node : node.parentElement);
    while (el && el !== editor) {
        if (el.matches && el.matches(BLOCKS)) return el;
        el = el.parentElement;
    }
    return null;
}

function bump(el, delta) {
    const cur = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize) || 8;
    el.style.fontSize = clamp(cur + delta) + "px";
    // Nested sized spans keep their inline size and would ignore the block bump —
    // shift them by the same delta so the whole block scales together.
    el.querySelectorAll("span[style*='font-size']").forEach((s) => {
        const c = parseFloat(s.style.fontSize);
        if (!isNaN(c)) s.style.fontSize = clamp(c + delta) + "px";
    });
}

function handleClick(e) {
    try {
        const btn = e.target && e.target.closest &&
            e.target.closest('.floyo-tool-btn[data-cmd="increaseTextSize"], .floyo-tool-btn[data-cmd="decreaseTextSize"]');
        if (!btn) return;
        // The platform can evaluate this module more than once (proxy URL and
        // dispatch URL are distinct module instances), and window-level guards
        // proved unreliable across those instances. Mark the EVENT itself so a
        // given click is resized exactly once no matter how many copies run.
        if (e.__floyoTextSizeHandled) return;
        e.__floyoTextSizeHandled = true;
        const wrapper = btn.closest(".floyo-sticky-wrapper");
        const editor = wrapper && wrapper.querySelector(".floyo-sticky-editor");
        if (!editor) return;

        // Take over: stop the legacy bubble handler from also acting.
        e.preventDefault();
        e.stopPropagation();

        const delta = btn.dataset.cmd === "increaseTextSize" ? 2 : -2;
        editor.focus({ preventScroll: true });
        const sel = window.getSelection();

        if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
            const first = editor.querySelector(BLOCKS);
            if (first) bump(first, delta);
        } else {
            const range = sel.getRangeAt(0);
            if (range.collapsed) {
                const blk = nearestBlock(range.startContainer, editor) || editor.querySelector(BLOCKS);
                if (blk) bump(blk, delta);
            } else {
                const sBlk = nearestBlock(range.startContainer, editor);
                const eBlk = nearestBlock(range.endContainer, editor);
                if (sBlk && sBlk === eBlk && range.toString().trim() !== sBlk.textContent.trim()) {
                    // Partial text inside ONE block → span-wrap just that text.
                    const base = parseFloat(getComputedStyle(sBlk).fontSize) || 8;
                    const span = document.createElement("span");
                    span.style.fontSize = clamp(base + delta) + "px";
                    span.appendChild(range.extractContents());
                    range.insertNode(span);
                    sel.removeAllRanges();
                    const nr = document.createRange();
                    nr.selectNodeContents(span);
                    sel.addRange(nr);
                } else {
                    // Whole block(s) → inline size per block (fixes headings).
                    const blocks = [...editor.querySelectorAll(BLOCKS)].filter((b) => {
                        try { return range.intersectsNode(b); } catch (_) { return false; }
                    });
                    (blocks.length ? blocks : [sBlk || eBlk].filter(Boolean)).forEach((b) => bump(b, delta));
                }
            }
        }
        // Persist via the canonical pipeline (undo snapshot + save + refresh).
        editor.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) {}
}

app.registerExtension({
    name: "Floyo.StickyNote.TextSizeFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            // The module can be evaluated twice (the platform can import it via
            // its proxy URL and via the dispatch URL — two module instances), so
            // a boolean guard isn't enough: store the live handler on window and
            // swap it, so exactly ONE listener is ever active.
            if (window.__floyoStickyTextSizeHandler) {
                document.removeEventListener("click", window.__floyoStickyTextSizeHandler, true);
            }
            window.__floyoStickyTextSizeHandler = handleClick;
            window.__floyoStickyTextSizeFix = true;
            document.addEventListener("click", handleClick, true); // capture phase
        } catch (_) {}
    },
});
