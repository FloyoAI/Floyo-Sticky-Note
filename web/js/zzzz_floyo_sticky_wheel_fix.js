/**
 * Floyo Sticky Note wheel fix.
 *
 * Fresh immutable-dispatch filename for the stronger wheel behavior: stop the
 * event before LiteGraph can zoom the canvas, then manually scroll the note
 * body so the visible scrollbar behaves like a normal document scrollbar.
 */

import { app } from "../../../scripts/app.js";

const WHEEL_FIX_FLAG = "__floyoStickyWheelFix";

function scrollBodyFromWheel(event, fallbackRoot) {
    const scrollBox = event.target.closest?.(".floyo-sticky-body") ||
        fallbackRoot.closest?.(".floyo-sticky-wrapper")?.querySelector(".floyo-sticky-body");
    scrollBox?.scrollBy({
        left: event.deltaX || 0,
        top: event.deltaY || 0,
        behavior: "auto",
    });
}

function installWheelFix(root = document) {
    root.querySelectorAll(".floyo-sticky-wrapper, .floyo-sticky-body").forEach((el) => {
        if (el[WHEEL_FIX_FLAG]) return;
        const guard = (event) => {
            scrollBodyFromWheel(event, el);
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        el.addEventListener("wheel", guard, { capture: true, passive: false });
        el[WHEEL_FIX_FLAG] = guard;
    });
}

function installObserver() {
    if (window.__floyoStickyWheelFixObserver) return;
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== "childList") continue;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) installWheelFix(node);
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__floyoStickyWheelFixObserver = observer;
}

app.registerExtension({
    name: "Floyo.StickyNote.WheelFix",
    async setup() {
        installWheelFix();
        installObserver();
        setTimeout(installWheelFix, 0);
        setTimeout(installWheelFix, 500);
        setTimeout(installWheelFix, 1500);
    },
});
