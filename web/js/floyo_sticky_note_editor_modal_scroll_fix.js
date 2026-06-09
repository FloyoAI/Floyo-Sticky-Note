/* Floyo Sticky Note — keep the editor scroll position when returning from a URL
 * modal (link / image / video / divider insert).
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so the in-place fix in
 * floyo_sticky_note.js may not reach already-loaded browsers. This new file does.
 *
 * BUG: inserting a link (or image/video) opens a URL modal; on OK the editor is
 * re-focused, and a plain element.focus() scrolls the note to the now-collapsed
 * selection — i.e. the TOP — so the view jumps up away from where the user was.
 * The main file now uses focus({preventScroll}) + pins the scroll; this file is
 * the safety net for cached clients.
 *
 * APPROACH: two capture-phase focus listeners (NO MutationObserver, NO timer — so
 * it cannot storm the canvas on load). They do cheap work and only act when a
 * sticky-note editor loses focus WHILE a URL modal is open: remember the scroll,
 * then restore it when the editor regains focus. Harmless no-op once the main
 * file's preventScroll fix is in place (there is no jump left to undo).
 */

import { app } from "../../../scripts/app.js";

function scrollerOf(editor) {
    return editor && editor.closest ? editor.closest(".floyo-sticky-body") : null;
}

function onFocusOut(e) {
    try {
        const editor = e.target && e.target.closest && e.target.closest(".floyo-sticky-editor");
        if (!editor) return;
        // Only arm when focus is leaving the editor for the URL modal dialog.
        const toModal = (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".floyo-modal-overlay"))
            || document.querySelector(".floyo-modal-overlay");
        if (!toModal) return;
        const scroller = scrollerOf(editor);
        if (scroller) editor.__floyoModalScroll = scroller.scrollTop;
    } catch (_) {}
}

function onFocusIn(e) {
    try {
        const editor = e.target && e.target.closest && e.target.closest(".floyo-sticky-editor");
        if (!editor || editor.__floyoModalScroll == null) return;
        const want = editor.__floyoModalScroll;
        editor.__floyoModalScroll = null;
        const scroller = scrollerOf(editor);
        if (!scroller) return;
        // The focus may have already scrolled the note; restore on the next frame.
        requestAnimationFrame(() => {
            try { if (Math.abs(scroller.scrollTop - want) > 6) scroller.scrollTop = want; } catch (_) {}
        });
    } catch (_) {}
}

app.registerExtension({
    name: "Floyo.StickyNote.EditorModalScrollFix",
    async setup() {
        try {
            if (window.__floyoStickyModalScrollFix) return;
            window.__floyoStickyModalScrollFix = true;
            document.addEventListener("focusout", onFocusOut, true);
            document.addEventListener("focusin", onFocusIn, true);
        } catch (_) {}
    },
});
