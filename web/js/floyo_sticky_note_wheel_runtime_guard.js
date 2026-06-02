/**
 * Floyo Sticky Note runtime wheel guard.
 * Role: meaningful implementation for immediate wheel containment.
 *
 * This fresh filename installs immediately on import. It is intentionally not
 * limited to registerExtension.setup(), because hosted Floyo sessions can keep
 * an existing app lifecycle alive while fetching new extension files.
 *
 * Keep for old hosted sessions. Avoid adding unrelated behavior here; put
 * durable wheel fixes in `floyo_sticky_note.js`.
 */

import { app } from "../../../scripts/app.js";

function stickyBodyFromEvent(event) {
    const target = event.target;
    if (!target?.closest) return null;
    const directBody = target.closest(".floyo-sticky-body");
    if (directBody) return directBody;
    return target.closest(".floyo-sticky-wrapper")?.querySelector(".floyo-sticky-body") || null;
}

function installRuntimeWheelFix() {
    if (window.__floyoStickyWheelRuntimeFix) return;

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
    window.__floyoStickyWheelRuntimeFix = guard;
}

installRuntimeWheelFix();

app.registerExtension({
    name: "Floyo.StickyNote.WheelRuntimeFix",
    async setup() {
        installRuntimeWheelFix();
    },
});
