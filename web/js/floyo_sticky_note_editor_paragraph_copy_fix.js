/* Floyo Sticky Note — Editor: Paragraph button + copy-keeps-color fix
 * --------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): Floyo's hosted ComfyUI loads each
 * extension JS from an immutable, edge-cached URL keyed by filename, so an
 * in-place edit to floyo_sticky_note.js would not reach already-loaded
 * browsers. This module is self-sufficient and patches the live DOM.
 *
 * FIX 1 — Paragraph (P) button:
 *   The editor toolbar has H₁/H₂/H₃ but no way to turn a heading back into a
 *   normal paragraph from a dedicated control. We inject a "P" button right
 *   after H₃ that runs formatBlock→P on the selection. We reuse the main
 *   file's button class/data attributes, so its refreshToolbarState() picks our
 *   button up automatically for the H₁/H₂/H₃/P active-state highlight.
 *
 * FIX 2 — copy keeps the note's text colour:
 *   The note's text colour comes from `color: var(--text)` on an ANCESTOR
 *   (.floyo-sticky-editor / -body), not inline on the spans. When you copy a
 *   selection, the clipboard HTML fragment is just the inner nodes — it loses
 *   that ancestor colour, so it pastes BLACK into other rich-text apps. We add a
 *   capture-phase `copy` handler that, for selections inside a sticky note,
 *   re-emits the HTML wrapped with the note's computed text colour (and font)
 *   inline, so it stays white/branded when pasted out.
 *
 * Touches only the DOM/clipboard. Never writes node title or properties.
 */

import { app } from "../../../scripts/app.js";

const TOOLBAR_SEL = ".floyo-sticky-toolbar";
const BTN_SEL = ".floyo-tool-btn";
const EDITOR_SEL = ".floyo-sticky-editor";
const TEXT_SCOPES = ".floyo-sticky-editor, .floyo-sticky-display, .floyo-sticky-body";
const COPY_SCOPES = ".floyo-sticky-editor, .floyo-sticky-display, .floyo-sticky-body, .floyo-sticky-wrapper";

/* ── FIX 1: Paragraph button ─────────────────────────────────────────────── */

function injectParagraphButton(toolbar) {
    if (!toolbar || toolbar.querySelector('[data-cmd="formatBlock"][data-arg="P"]')) return;
    const h3 = toolbar.querySelector('[data-cmd="formatBlock"][data-arg="H3"]');
    if (!h3) return; // not the heading toolbar / not ready yet

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "floyo-tool-btn";
    btn.title = "Paragraph";
    btn.dataset.cmd = "formatBlock";
    btn.dataset.arg = "P";
    btn.textContent = "P";

    // Don't steal focus/selection from the editor (mirrors wireToolbar()).
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const editor = toolbar.closest(".floyo-sticky-wrapper")?.querySelector(EDITOR_SEL);
        if (!editor) return;
        editor.focus();
        try { document.execCommand("formatBlock", false, "P"); } catch (_) {}
        // Trigger the main file's input listener → rememberUndoState + syncContent
        // (save) + refreshToolbarState (active-state highlight).
        editor.dispatchEvent(new Event("input", { bubbles: true }));
    });

    h3.insertAdjacentElement("afterend", btn);
}

function injectAllParagraphButtons() {
    try {
        document.querySelectorAll(TOOLBAR_SEL).forEach(injectParagraphButton);
    } catch (_) {}
}

/* ── FIX 2: copy keeps the note's text colour ────────────────────────────── */

function elementOf(node) {
    return node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
}

function handleCopy(e) {
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const anchorEl = elementOf(sel.anchorNode);
    const focusEl = elementOf(sel.focusNode);
    const scope = anchorEl?.closest?.(COPY_SCOPES) || focusEl?.closest?.(COPY_SCOPES);
    if (!scope) return; // selection isn't inside a sticky note → leave native copy alone

    const cd = e.clipboardData;
    if (!cd) return;

    // Resolve the note's live text colour (and font) so they survive paste-out.
    const colorSrc = anchorEl?.closest?.(TEXT_SCOPES) || scope;
    let color = "";
    let font = "";
    try {
        const cs = getComputedStyle(colorSrc);
        color = cs.color;
        font = cs.fontFamily;
    } catch (_) {}
    if (!color || color === "rgba(0, 0, 0, 0)") color = "#FFFFFF";

    // Wrap the selected HTML with the colour/font inline.
    const span = document.createElement("span");
    span.style.color = color;
    if (font) span.style.fontFamily = font;
    span.style.whiteSpace = "pre-wrap";
    for (let i = 0; i < sel.rangeCount; i++) {
        span.appendChild(sel.getRangeAt(i).cloneContents());
    }
    // Links inside lose their CSS accent colour after cloning; force them to
    // inherit so they don't fall back to default blue/black either.
    span.querySelectorAll("a").forEach((a) => { a.style.color = "inherit"; });

    try {
        cd.setData("text/html", span.outerHTML);
        cd.setData("text/plain", sel.toString());
        e.preventDefault();
    } catch (_) {
        // If the clipboard rejects our data, fall back to the browser default.
    }
}

/* ── Install ─────────────────────────────────────────────────────────────── */

function installCopyHandler() {
    if (window.__floyoStickyCopyColorFix) return;
    window.__floyoStickyCopyColorFix = true;
    document.addEventListener("copy", handleCopy, true); // capture phase
}

function install() {
    installCopyHandler();
    injectAllParagraphButtons();
    // NO global MutationObserver: a childList+subtree observer on the whole
    // document fired on EVERY ComfyUI DOM insertion and contributed to a
    // canvas-load slowdown. Toolbars are created once per node at setup, so a
    // light poll + an initial salvo inject the P button reliably and cheaply.
    [0, 250, 700].forEach((d) => setTimeout(injectAllParagraphButtons, d));
    if (!window.__floyoStickyParagraphBtnTimer) {
        window.__floyoStickyParagraphBtnTimer = setInterval(injectAllParagraphButtons, 1200);
    }
}

app.registerExtension({
    name: "Floyo.StickyNote.EditorParagraphCopyFix",
    async setup() {
        // Never let a setup error break the ComfyUI canvas.
        try { install(); } catch (_) {}
    },
});
