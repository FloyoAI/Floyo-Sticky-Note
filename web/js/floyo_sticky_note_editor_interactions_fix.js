/* Floyo Sticky Note — editor interactions: clipboard guard, heading-size reset,
 * media backspace, and smarter A−/A+ on lists.
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so a new file is the
 * only delivery that reliably reaches every client.
 *
 * FIX 1 — clipboard guard (the "paste creates a node on the canvas" bug).
 *   The editor's paste handler preventDefaults but never stopPropagation, so the
 *   paste event continues to ComfyUI's document-level handler, which can paste a
 *   node onto the canvas; copy similarly lets ComfyUI copy the selected NODE.
 *   Guard at document CAPTURE: clipboard keydowns and copy/cut/paste that happen
 *   inside a sticky note stop propagating to the canvas. Paste into the editor is
 *   replicated here (plain-text insert — identical to the main file's handler,
 *   which can no longer fire) so behavior is unchanged for the user.
 *
 * FIX 2 — switching H1/H2/H3/P now really changes the size.
 *   The A−/A+ fix sets an inline font-size on the block; formatBlock carries that
 *   inline style to the new heading element, so switching levels appeared dead.
 *   On a heading/paragraph toolbar click, clear the block's inline font-size so
 *   the new level's stylesheet size applies.
 *
 * FIX 3 — Backspace at the start of a line no longer nukes the media above.
 *   Media blocks (image / video card / divider) sit unwrapped at block level;
 *   native contenteditable deletes the whole element (and merges paragraphs) in
 *   ONE keystroke, which reads as "backspace deleted my upper line". Standard
 *   editor UX instead: first press SELECTS the media, second press deletes it.
 *   Plain text lines keep native behavior (caret merges into the previous line).
 *
 * FIX 4 — A−/A+ improvements on lists (replaces the text_size_fix handler):
 *   • only the OUTERMOST selected blocks are bumped (a nested li / li>p used to
 *     get +4 from one click because parent and child were both bumped);
 *   • blocks the selection merely TOUCHES at a boundary (triple-click overhang)
 *     are no longer resized;
 *   • selecting a list item's own line (with a nested sub-list below) bumps the
 *     LI itself so the bullet marker scales with the text.
 *   The older text-size handler is removed/skipped via the shared window slot
 *   and the per-event marker, so exactly one handler ever acts.
 *
 * Document/window CAPTURE listeners only — NO MutationObserver, NO perpetual
 * timer; cannot slow canvas load or crash it. Every handler is try/catch-safe.
 */

import { app } from "../../../scripts/app.js";

const EDITOR_SEL = ".floyo-sticky-editor";
const WRAPPER_SEL = ".floyo-sticky-wrapper";
const MEDIA_SEL = "img, hr.floyo-divider, .floyo-embed";
const BLOCKS = "h1,h2,h3,p,li,pre,blockquote";
const MIN = 6, MAX = 36;
const clamp = (v) => Math.min(MAX, Math.max(MIN, v));

const elOf = (n) => n && (n.nodeType === 1 ? n : n.parentElement);

function editorOf(target) {
    const e = elOf(target);
    return e && e.closest ? e.closest(EDITOR_SEL) : null;
}

function selectionEditor() {
    try {
        const sel = window.getSelection();
        return editorOf(sel && sel.anchorNode);
    } catch (_) { return null; }
}

/* ── FIX 1: clipboard guard ──────────────────────────────────────────────── */

function inSticky(e) {
    const t = elOf(e.target);
    if (t && t.closest && t.closest(WRAPPER_SEL)) return true;
    return !!selectionEditor();
}

function onKeydownGuard(e) {
    try {
        if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
        const k = (e.key || "").toLowerCase();
        if (k !== "c" && k !== "v" && k !== "x" && k !== "a") return;
        if (!inSticky(e)) return;
        // Hide the combo from canvas keybinding handlers; never preventDefault —
        // the native clipboard/select action must still happen in the editor.
        e.stopPropagation();
    } catch (_) {}
}

function onCopyCutGuard(e) {
    try {
        if (!inSticky(e)) return;
        // Plain stopPropagation (NOT immediate): the copy-keeps-colour handler is
        // a co-listener on this same node+phase and must still run.
        e.stopPropagation();
    } catch (_) {}
}

function onPasteGuard(e) {
    try {
        const t = elOf(e.target);
        const wrap = t && t.closest && t.closest(WRAPPER_SEL);
        if (!wrap) return;
        e.stopPropagation(); // the canvas never sees pastes aimed at a sticky note
        // Inputs (e.g. modal fields) keep their native paste.
        if (t.closest("input, textarea")) return;
        const editor = t.closest(EDITOR_SEL);
        if (!editor) return;
        // Replicate the main file's clean paste (its own listener is downstream
        // of this capture stop and can no longer fire).
        const text = e.clipboardData ? e.clipboardData.getData("text/plain") : null;
        if (text != null) {
            e.preventDefault();
            editor.focus({ preventScroll: true });
            document.execCommand("insertText", false, text);
        }
    } catch (_) {}
}

/* ── FIX 2: heading switch clears the inline size ────────────────────────── */

function onFormatBlockClick(e) {
    try {
        const btn = elOf(e.target) && elOf(e.target).closest &&
            elOf(e.target).closest('.floyo-tool-btn[data-cmd="formatBlock"]');
        if (!btn) return;
        const arg = (btn.dataset.arg || "").toUpperCase();
        if (!["H1", "H2", "H3", "P"].includes(arg)) return;
        const wrapper = btn.closest(WRAPPER_SEL);
        const editor = wrapper && wrapper.querySelector(EDITOR_SEL);
        if (!editor) return;
        // Clear inline sizes on the selection's block(s) BEFORE the legacy
        // handler runs formatBlock, so the new level's stylesheet size applies.
        // Do NOT stop the event — the legacy handler must still do the format.
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) return;
        const range = sel.getRangeAt(0);
        const blocks = [...editor.querySelectorAll(BLOCKS)].filter((b) => rangeReallyIntersects(range, b));
        const targets = blocks.length ? blocks : [nearestBlock(sel.anchorNode, editor)].filter(Boolean);
        targets.forEach((b) => { if (b.style && b.style.fontSize) b.style.fontSize = ""; });
    } catch (_) {}
}

/* ── FIX 3: media-aware Backspace ────────────────────────────────────────── */

function nearestBlock(node, editor) {
    let el = elOf(node);
    while (el && el !== editor) {
        if (el.matches && el.matches(BLOCKS)) return el;
        el = el.parentElement;
    }
    return null;
}

function caretAtStartOf(block, range) {
    try {
        const probe = document.createRange();
        probe.selectNodeContents(block);
        probe.setEnd(range.startContainer, range.startOffset);
        return probe.toString().trim() === "";
    } catch (_) { return false; }
}

function onBackspace(e) {
    try {
        if (e.key !== "Backspace" || e.metaKey || e.ctrlKey || e.altKey) return;
        const editor = editorOf(e.target);
        if (!editor) return;
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        const block = nearestBlock(range.startContainer, editor);
        // The caret's line: a known block, or a bare top-level element.
        const line = block || (elOf(range.startContainer) === editor ? null : elOf(range.startContainer));
        if (!line || !editor.contains(line) || !caretAtStartOf(line, range)) return;
        // Find the previous meaningful sibling of the caret's top-level line.
        let top = line;
        while (top.parentElement && top.parentElement !== editor) top = top.parentElement;
        let prev = top.previousSibling;
        while (prev && prev.nodeType === 3 && !prev.textContent.trim()) prev = prev.previousSibling;
        if (!prev || prev.nodeType !== 1 || !prev.matches(MEDIA_SEL)) return;
        // Media above: select on first press, delete on second.
        e.preventDefault();
        e.stopPropagation();
        if (prev.classList.contains("is-selected")) {
            prev.remove();
            editor.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
            editor.querySelectorAll(".is-selected").forEach((m) => m.classList.remove("is-selected"));
            prev.classList.add("is-selected");
        }
    } catch (_) {}
}

/* ── FIX 4: improved A−/A+ (replaces the text_size_fix handler) ──────────── */

function rangeReallyIntersects(range, node) {
    try {
        if (!range.intersectsNode(node)) return false;
        const r = document.createRange();
        r.selectNodeContents(node);
        // Strict overlap: boundary-only touches (triple-click overhang) excluded.
        return range.compareBoundaryPoints(Range.END_TO_START, r) < 0 &&
               range.compareBoundaryPoints(Range.START_TO_END, r) > 0;
    } catch (_) { return false; }
}

function ownText(block) {
    // A list item's own line, excluding nested sub-lists.
    const c = block.cloneNode(true);
    c.querySelectorAll("ul, ol").forEach((l) => l.remove());
    return (c.textContent || "").trim();
}

function bump(el, delta) {
    const cur = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize) || 8;
    el.style.fontSize = clamp(cur + delta) + "px";
    el.querySelectorAll("span[style*='font-size']").forEach((s) => {
        const c = parseFloat(s.style.fontSize);
        if (!isNaN(c)) s.style.fontSize = clamp(c + delta) + "px";
    });
}

function outermost(blocks) {
    // Drop any block contained in another selected block (li>p, nested li):
    // bumping the outer one is enough — inner content inherits the size.
    return blocks.filter((b) => !blocks.some((o) => o !== b && o.contains(b)));
}

function onTextSizeClick(e) {
    try {
        const btn = elOf(e.target) && elOf(e.target).closest &&
            elOf(e.target).closest('.floyo-tool-btn[data-cmd="increaseTextSize"], .floyo-tool-btn[data-cmd="decreaseTextSize"]');
        if (!btn) return;
        if (e.__floyoTextSizeHandled) return; // another instance already acted
        e.__floyoTextSizeHandled = true;
        const wrapper = btn.closest(WRAPPER_SEL);
        const editor = wrapper && wrapper.querySelector(EDITOR_SEL);
        if (!editor) return;
        e.preventDefault();
        e.stopPropagation(); // silence the legacy handler and older fix copies
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
                const selText = range.toString().trim();
                if (sBlk && sBlk === eBlk && selText !== ownText(sBlk) && selText !== (sBlk.textContent || "").trim()) {
                    // Partial text inside ONE block → wrap just that text.
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
                    // Whole block(s): outermost only, real overlaps only.
                    let blocks = [...editor.querySelectorAll(BLOCKS)].filter((b) => rangeReallyIntersects(range, b));
                    blocks = outermost(blocks.length ? blocks : [sBlk || eBlk].filter(Boolean));
                    blocks.forEach((b) => bump(b, delta));
                }
            }
        }
        editor.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) {}
}

/* ── Install ─────────────────────────────────────────────────────────────── */

function install() {
    // Replace the older text-size handler (it stores itself on this slot) so
    // exactly one resize implementation is live.
    try {
        if (window.__floyoStickyTextSizeHandler && window.__floyoStickyTextSizeHandler !== onTextSizeClick) {
            window.removeEventListener("click", window.__floyoStickyTextSizeHandler, true);
            document.removeEventListener("click", window.__floyoStickyTextSizeHandler, true);
        }
        window.__floyoStickyTextSizeHandler = onTextSizeClick;
    } catch (_) {}

    if (window.__floyoStickyEditorInteractionsFix) return;
    window.__floyoStickyEditorInteractionsFix = true;

    window.addEventListener("click", onTextSizeClick, true);   // FIX 4 (before stale copies)
    document.addEventListener("click", onFormatBlockClick, true); // FIX 2
    document.addEventListener("keydown", onKeydownGuard, true);   // FIX 1
    document.addEventListener("keydown", onBackspace, true);      // FIX 3
    document.addEventListener("copy", onCopyCutGuard, true);      // FIX 1
    document.addEventListener("cut", onCopyCutGuard, true);       // FIX 1
    document.addEventListener("paste", onPasteGuard, true);       // FIX 1
}

app.registerExtension({
    name: "Floyo.StickyNote.EditorInteractionsFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try {
            install();
            // The older text-size file may install after us — re-assert the swap
            // a few times, then stop. No perpetual timer.
            [300, 1000, 2500].forEach((d) => setTimeout(() => { try { install2(); } catch (_) {} }, d));
        } catch (_) {}
    },
});

// Late re-assert: keep ONE text-size handler (ours) even if the older module's
// setup ran after install(); idempotent and cheap.
function install2() {
    if (window.__floyoStickyTextSizeHandler && window.__floyoStickyTextSizeHandler !== onTextSizeClick) {
        window.removeEventListener("click", window.__floyoStickyTextSizeHandler, true);
        document.removeEventListener("click", window.__floyoStickyTextSizeHandler, true);
        window.__floyoStickyTextSizeHandler = onTextSizeClick;
        window.addEventListener("click", onTextSizeClick, true);
    }
}
