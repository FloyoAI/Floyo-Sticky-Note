/**
 * Floyo Sticky Note wheel capture guard.
 * Role: meaningful implementation for document-level wheel containment.
 *
 * LiteGraph can receive wheel input through the canvas before element-level
 * sticky handlers get a chance to contain it. A document capture listener runs
 * earlier in the event path: if the wheel originated inside a sticky note, it
 * scrolls the note body and prevents the canvas zoom handler from seeing it.
 *
 * This remains in `web/js` for immutable-cache compatibility. New wheel logic
 * should be consolidated into the canonical Sticky Note file.
 */

import { app } from "../../../scripts/app.js";

function stickyBodyFromEvent(event) {
    const target = event.target;
    if (!target?.closest) return null;
    const directBody = target.closest(".floyo-sticky-body");
    if (directBody) return directBody;
    return target.closest(".floyo-sticky-wrapper")?.querySelector(".floyo-sticky-body") || null;
}

function installDocumentWheelCapture() {
    if (window.__floyoStickyWheelCaptureFix) return;

    const guard = (event) => {
        const body = stickyBodyFromEvent(event);
        if (!body) return;

        body.scrollBy({
            left: event.deltaX || 0,
            top: event.deltaY || 0,
            behavior: "auto",
        });
        event.preventDefault();
        event.stopImmediatePropagation();
    };

    document.addEventListener("wheel", guard, { capture: true, passive: false });
    window.__floyoStickyWheelCaptureFix = guard;
}

app.registerExtension({
    name: "Floyo.StickyNote.WheelCaptureFix",
    async setup() {
        installDocumentWheelCapture();
    },
});

// Also install immediately. Floyo can import extension modules after the
// normal app setup phase during hot/reloaded iframe sessions.
installDocumentWheelCapture();
