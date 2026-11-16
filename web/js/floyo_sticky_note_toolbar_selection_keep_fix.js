/* Floyo Sticky Note — toolbar buttons format the selected text again
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so a new file is the
 * only delivery that reliably reaches every client.
 *
 * BUG: select a word or a line in the editor, click H1 (or B, I, U, S, Tx, A−,
 * A+, P, code block, a list or link) and nothing happens to the selection.
 * Headings land on the FIRST line of the note instead, and bold does nothing.
 * Only a bare caret works, which is why "it changes only when the cursor is in
 * that line".
 *
 * CAUSE: ComfyUI frontend 1.57 (upstream "fix: copy/paste beside the agent
 * panel", #18062) added collapseOutsideSelectionOnPrimaryPointerDown(). On every
 * primary pointerdown inside the graph it removes the page's text selection
 * unless the selection lies wholly inside the clicked element. A toolbar button
 * never contains the editor's text, so the selection is wiped on pointerdown,
 * before the button's own mousedown preventDefault() (the standard way to keep a
 * selection) can help. The click handler then focuses the editor with no
 * selection, the caret falls to the start, and formatBlock formats line 1.
 * A collapsed caret is never wiped, so caret-only edits kept working.
 *
 * FIX: remember the editor's selection when a sticky toolbar button gets a
 * primary pointerdown (window capture, which runs before the frontend's
 * listener), then put it back on that button's mousedown and again on its
 * click (window capture, which runs before every toolbar handler). Nothing
 * else changes: other clicks, carets, the canvas and the frontend's copy/paste
 * fix behave exactly as before.
 *
 * Window capture listeners only. NO MutationObserver, NO per-node state.
 *
 * Remove only together with moving this into floyo_sticky_note.js.
 */

const WRAPPER_SEL = ".floyo-sticky-wrapper";
const EDITOR_SEL = ".floyo-sticky-editor";
const BUTTON_SEL = ".floyo-sticky-toolbar .floyo-tool-btn";
const KEEP_MS = 5000;

const elementOf = (node) => node && (node.nodeType === 1 ? node : node.parentElement);

function toolbarButtonOf(target) {
    const el = elementOf(target);
    return el && el.closest ? el.closest(BUTTON_SEL) : null;
}

function editorFor(button) {
    const wrapper = button.closest(WRAPPER_SEL);
    if (!wrapper || wrapper.dataset.mode !== "editor") return null;
    return wrapper.querySelector(EDITOR_SEL);
}

function inside(editor, node, offset) {
    if (!node || !editor.contains(node)) return false;
    const max = node.nodeType === 3 ? node.length : node.childNodes.length;
    return offset >= 0 && offset <= max;
}

/* A non-collapsed selection that lies wholly inside the editor, or null. */
function selectionIn(editor) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount !== 1) return null;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
    return {
        anchorNode: sel.anchorNode,
        anchorOffset: sel.anchorOffset,
        focusNode: sel.focusNode,
        focusOffset: sel.focusOffset,
        range: range.cloneRange(),
    };
}

const shared = (window.__floyoStickyToolbarSelectionKeep ??= { installed: false, pending: null });

function remember(e) {
    shared.pending = null;
    try {
        if (e.button !== 0) return;
        const button = toolbarButtonOf(e.target);
        if (!button) return;
        const editor = editorFor(button);
        const saved = editor && selectionIn(editor);
        if (saved) shared.pending = { button, editor, saved, at: Date.now() };
    } catch (_) {}
}

function restore(e) {
    try {
        if (e.button !== 0) return;
        const p = shared.pending;
        if (!p || Date.now() - p.at > KEEP_MS) return;
        if (toolbarButtonOf(e.target) !== p.button) return;
        const { editor, saved } = p;
        if (!editor.isConnected ||
            !inside(editor, saved.anchorNode, saved.anchorOffset) ||
            !inside(editor, saved.focusNode, saved.focusOffset)) {
            shared.pending = null;
            return;
        }
        const sel = window.getSelection();
        if (!sel) return;
        if (sel.anchorNode === saved.anchorNode && sel.anchorOffset === saved.anchorOffset &&
            sel.focusNode === saved.focusNode && sel.focusOffset === saved.focusOffset) return;
        if (document.activeElement !== editor) editor.focus({ preventScroll: true });
        try {
            sel.setBaseAndExtent(saved.anchorNode, saved.anchorOffset, saved.focusNode, saved.focusOffset);
        } catch (_) {
            sel.removeAllRanges();
            sel.addRange(saved.range.cloneRange());
        }
    } catch (_) {}
}

function restoreOnClick(e) {
    restore(e);
    const p = shared.pending;
    // Every toolbar handler runs during this click; forget the selection after.
    if (p) setTimeout(() => { if (shared.pending === p) shared.pending = null; }, 0);
}

if (!shared.installed) {
    shared.installed = true;
    window.addEventListener("pointerdown", remember, true);
    window.addEventListener("mousedown", restore, true);
    window.addEventListener("click", restoreOnClick, true);
}
