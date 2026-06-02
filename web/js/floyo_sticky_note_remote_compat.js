/**
 * Floyo Sticky Note remote compatibility patch.
 * Role: meaningful implementation for hosted-cache compatibility.
 *
 * Floyo's hosted ComfyUI imports extension files from an immutable dispatch
 * URL. When the original floyo_sticky_note.js path is already cached in a
 * user's browser, backend pulls/restarts do not force that module to re-run.
 *
 * This file intentionally has a new filename so the browser must fetch it.
 * It patches the already-registered Sticky Note node in place.
 *
 * Keep this file until hosted browsers are no longer likely to have the stale
 * main module cached. Do not add new behavior here unless cache-busting is
 * specifically required.
 */

import { app } from "../../../scripts/app.js";

const NOTE_TYPE = "FloyoStickyNote";
const DEFAULT_TITLE = "Floyo Sticky Note";
const SENTINEL_TITLE = "\u00A0";
const PATCH_STYLE_ID = "floyo-sticky-live-patch-style";

function syncTitle(node) {
    if (!node || node.type !== NOTE_TYPE) return;

    node.properties = node.properties || {};
    const currentTitle = typeof node.title === "string" ? node.title.trim() : "";
    const storedTitle = typeof node.properties.title === "string" ? node.properties.title.trim() : "";
    const nextTitle =
        storedTitle ||
        (currentTitle && currentTitle !== SENTINEL_TITLE && currentTitle !== NOTE_TYPE ? currentTitle : "") ||
        DEFAULT_TITLE;

    node.properties.title = nextTitle;
    node.title = nextTitle;
    node.drawBadges = function () {};
}

function hidePackageBadges(root = document) {
    root.querySelectorAll("*").forEach((el) => {
        if (el.children.length) return;
        const text = (el.textContent || "").trim();
        if (text === "Floyo-Sticky-Note") {
            const badge = el.closest("[class*='badge'], [class*='Badge'], [class*='pill'], [class*='Pill']") || el;
            badge.style.display = "none";
            badge.setAttribute("aria-hidden", "true");
        }
    });
}

function styleVueTitles(root = document) {
    const titles = new Set(
        (app.graph?._nodes || [])
            .filter((node) => node.type === NOTE_TYPE)
            .map((node) => (node.properties?.title || node.title || "").trim())
            .filter(Boolean)
    );
    titles.add(DEFAULT_TITLE);
    titles.add(NOTE_TYPE);

    root.querySelectorAll(".editable-text span").forEach((el) => {
        const text = (el.textContent || "").trim();
        if (!titles.has(text)) return;
        el.classList.add("floyo-sticky-vue-title");
        if (text === NOTE_TYPE) el.textContent = DEFAULT_TITLE;
    });
}

function installWheelGuard(root = document) {
    root.querySelectorAll(".floyo-sticky-wrapper, .floyo-sticky-body").forEach((el) => {
        if (el.__floyoStickyWheelGuard) return;
        const guard = (event) => {
            // Keep wheel input inside the sticky note DOM. Otherwise the
            // LiteGraph canvas receives the same wheel event and zooms the
            // whole workflow instead of letting the note content scroll.
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
        el.__floyoStickyWheelGuard = guard;
    });
}

function injectPatchStyles() {
    if (document.getElementById(PATCH_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PATCH_STYLE_ID;
    style.textContent = `
        .floyo-sticky-vue-title {
            font-family: "ArcadePixelNeue", "Courier New", monospace !important;
            font-size: 14px !important;
            font-weight: 400 !important;
            letter-spacing: 0.7px !important;
            color: #F1E7FF !important;
            text-transform: none !important;
        }
    `;
    document.head.appendChild(style);
}

function patchExistingNodes() {
    (app.graph?._nodes || []).forEach(syncTitle);
    styleVueTitles();
    hidePackageBadges();
    installWheelGuard();
    app.graph?.setDirtyCanvas?.(true, true);
}

function installDomObserver() {
    if (window.__floyoStickyLivePatchObserver) return;
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== "childList") continue;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                styleVueTitles(node);
                hidePackageBadges(node);
                installWheelGuard(node);
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__floyoStickyLivePatchObserver = observer;
}

function installPeriodicSync() {
    if (window.__floyoStickyLivePatchTimer) return;
    window.__floyoStickyLivePatchTimer = setInterval(patchExistingNodes, 1000);
}

app.registerExtension({
    name: "Floyo.StickyNote.LivePatch",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NOTE_TYPE) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);
            syncTitle(this);
            setTimeout(() => syncTitle(this), 0);
            setTimeout(() => syncTitle(this), 250);
            setTimeout(patchExistingNodes, 500);
            return result;
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            const result = onConfigure?.apply(this, arguments);
            const saved = data?.floyo_state?.title || this.properties?.title;
            if (saved) {
                this.properties = this.properties || {};
                this.properties.title = saved;
            }
            syncTitle(this);
            setTimeout(patchExistingNodes, 250);
            return result;
        };

        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (data) {
            syncTitle(this);
            const result = onSerialize?.apply(this, arguments);
            data.floyo_state = data.floyo_state || {};
            data.floyo_state.title = this.properties?.title || this.title || DEFAULT_TITLE;
            return result;
        };
    },
    async setup() {
        injectPatchStyles();
        installDomObserver();
        installPeriodicSync();
        setTimeout(patchExistingNodes, 0);
        setTimeout(patchExistingNodes, 500);
        setTimeout(patchExistingNodes, 1500);
    },
});
