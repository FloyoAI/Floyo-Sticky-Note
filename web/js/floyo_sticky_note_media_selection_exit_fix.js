/* Floyo Sticky Note — clear the media selection when the editor opens or closes
 * ----------------------------------------------------------------------------
 * Ships as a NEW filename (cache-bust): the hosted ComfyUI loads each extension
 * JS from an immutable, edge-cached URL keyed by filename, so a new file is the
 * only delivery that reliably reaches every client.
 *
 * BUG: clicking an image or video card in the editor gives it the `is-selected`
 * class and shows the [−] [+] Remove tools. Closing the editor (✓ or a click
 * outside) while it was still selected copied the class into the saved content
 * and left both the ring and the tools on screen in display mode. The note also
 * kept that stale selection, so after reopening, the tools stayed up once the
 * mouse left a hovered image.
 *
 * FIX:
 *   • Display mode never shows selection UI: the tools are hidden and any
 *     `is-selected` ring is neutralised, so notes already saved with the class
 *     look right without rewriting them.
 *   • Whenever a note switches mode, it drops its own selection (a plain click
 *     on the editor runs its deselect path), any `is-selected` left on media is
 *     removed (Backspace selects media too), the tools are hidden, and on close
 *     the stored content is re-synced from the cleaned editor.
 *
 * One MutationObserver per note watches only the wrapper's data-mode attribute.
 *
 * Remove only together with moving this into floyo_sticky_note.js.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-media-selection-exit-fix";

const CSS = `
/* Display mode is read-only: no media tools, no selection ring. */
.floyo-sticky-wrapper[data-mode="display"] .floyo-img-tools {
    display: none !important;
}
.floyo-sticky-wrapper[data-mode="display"] .floyo-sticky-display .is-selected {
    outline: none !important;
    box-shadow: none !important;
}
`;

function clearSelection(root) {
    for (const el of root.querySelectorAll(".is-selected")) {
        el.classList.remove("is-selected");
        if (!el.classList.length) el.removeAttribute("class");
    }
}

function watch(node) {
    const wrapper = node?.widgets?.find?.((w) => w?.name === "floyo_sticky")?.element;
    const editor = wrapper?.querySelector?.(".floyo-sticky-editor");
    const display = wrapper?.querySelector?.(".floyo-sticky-display");
    if (!editor || !display || wrapper.dataset.floyoSelectionExit) return;
    wrapper.dataset.floyoSelectionExit = "1";
    let mode = wrapper.dataset.mode;
    const reset = () => {
        if (wrapper.dataset.mode === mode) return;
        mode = wrapper.dataset.mode;
        // Not bubbling: only the editor's own click handler sees it, and it
        // deselects because the target is not media.
        editor.dispatchEvent(new MouseEvent("click", { cancelable: true }));
        clearSelection(editor);
        wrapper.querySelector(".floyo-img-tools")?.classList.remove("is-visible");
        if (mode !== "display") return;
        clearSelection(display);
        if (node.properties && node.properties.content !== editor.innerHTML) {
            node.properties.content = editor.innerHTML;
        }
    };
    const observer = new MutationObserver(reset);
    observer.observe(wrapper, { attributes: true, attributeFilter: ["data-mode"] });
    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
        observer.disconnect();
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

/* Shared across module copies: the platform can import a module twice. */
const shared = (window.__floyoStickyMediaSelectionExit ??= { registered: false });

if (!shared.registered) {
    shared.registered = true;
    app.registerExtension({
        name: "Floyo.StickyNote.MediaSelectionExitFix",
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
