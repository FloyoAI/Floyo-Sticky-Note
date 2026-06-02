/**
 * Floyo Sticky Note element wheel guard.
 * Role: meaningful implementation for element-level scroll containment.
 *
 * Hosted Floyo loads extension modules from immutable dispatch URLs, so fixes
 * that must affect already-used browsers need a fresh filename. This patch
 * keeps wheel/trackpad input inside the sticky note DOM so the note content
 * scrolls instead of the LiteGraph canvas zooming.
 *
 * Superseded by later wheel guards, but kept so older cached sessions still
 * receive at least element-level wheel containment.
 */

import { app } from "../../../scripts/app.js";

const WHEEL_PATCH_FLAG = "__floyoStickyWheelPatch";

function installWheelGuard(root = document) {
    root.querySelectorAll(".floyo-sticky-wrapper, .floyo-sticky-body").forEach((el) => {
        if (el[WHEEL_PATCH_FLAG]) return;
        const guard = (event) => {
            const scrollBox = event.target.closest?.(".floyo-sticky-body") ||
                el.closest?.(".floyo-sticky-wrapper")?.querySelector(".floyo-sticky-body");
            scrollBox?.scrollBy({
                left: event.deltaX || 0,
                top: event.deltaY || 0,
                behavior: "auto",
            });
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        el.addEventListener("wheel", guard, { capture: true, passive: false });
        el[WHEEL_PATCH_FLAG] = guard;
    });
}

function installObserver() {
    if (window.__floyoStickyWheelPatchObserver) return;
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== "childList") continue;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) installWheelGuard(node);
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__floyoStickyWheelPatchObserver = observer;
}

app.registerExtension({
    name: "Floyo.StickyNote.WheelPatch",
    async setup() {
        installWheelGuard();
        installObserver();
        setTimeout(installWheelGuard, 0);
        setTimeout(installWheelGuard, 500);
        setTimeout(installWheelGuard, 1500);
    },
});
