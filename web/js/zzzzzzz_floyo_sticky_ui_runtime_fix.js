/**
 * Floyo Sticky Note UI runtime fix.
 *
 * Fresh immutable-dispatch filename for hosted Floyo sessions. It patches
 * cached sticky-note modules by improving paragraph readability, adding a DOM
 * directional notch fallback, and injecting A-/A+ text-size controls into
 * already-rendered toolbars.
 */

import { app } from "../../../scripts/app.js";

const NOTE_TYPE = "FloyoStickyNote";
const STYLE_ID = "floyo-sticky-ui-runtime-fix-style";

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-sticky-wrapper {
            overflow: visible !important;
        }
        .floyo-sticky-body p {
            color: rgba(255, 255, 255, 0.84) !important;
        }
        .floyo-sticky-body li {
            color: rgba(255, 255, 255, 0.86) !important;
        }
        .floyo-tool-btn.tool-size {
            min-width: 22px;
            font-weight: 800;
        }
        .floyo-sticky-wrapper::before,
        .floyo-sticky-wrapper::after {
            content: "";
            position: absolute;
            display: none;
            width: 0;
            height: 0;
            pointer-events: none;
            z-index: 4;
        }
        .floyo-sticky-wrapper[data-pointer-dir="up"]::before {
            display: block; left: 50%; top: -22px; transform: translateX(-50%);
            border-left: 26px solid transparent; border-right: 26px solid transparent; border-bottom: 22px solid var(--border);
        }
        .floyo-sticky-wrapper[data-pointer-dir="up"]::after {
            display: block; left: 50%; top: -18px; transform: translateX(-50%);
            border-left: 22px solid transparent; border-right: 22px solid transparent; border-bottom: 19px solid var(--bg);
        }
        .floyo-sticky-wrapper[data-pointer-dir="down"]::before {
            display: block; left: 50%; bottom: -22px; transform: translateX(-50%);
            border-left: 26px solid transparent; border-right: 26px solid transparent; border-top: 22px solid var(--border);
        }
        .floyo-sticky-wrapper[data-pointer-dir="down"]::after {
            display: block; left: 50%; bottom: -18px; transform: translateX(-50%);
            border-left: 22px solid transparent; border-right: 22px solid transparent; border-top: 19px solid var(--bg);
        }
        .floyo-sticky-wrapper[data-pointer-dir="left"]::before {
            display: block; left: -22px; top: 50%; transform: translateY(-50%);
            border-top: 26px solid transparent; border-bottom: 26px solid transparent; border-right: 22px solid var(--border);
        }
        .floyo-sticky-wrapper[data-pointer-dir="left"]::after {
            display: block; left: -18px; top: 50%; transform: translateY(-50%);
            border-top: 22px solid transparent; border-bottom: 22px solid transparent; border-right: 19px solid var(--bg);
        }
        .floyo-sticky-wrapper[data-pointer-dir="right"]::before {
            display: block; right: -22px; top: 50%; transform: translateY(-50%);
            border-top: 26px solid transparent; border-bottom: 26px solid transparent; border-left: 22px solid var(--border);
        }
        .floyo-sticky-wrapper[data-pointer-dir="right"]::after {
            display: block; right: -18px; top: 50%; transform: translateY(-50%);
            border-top: 22px solid transparent; border-bottom: 22px solid transparent; border-left: 19px solid var(--bg);
        }
    `;
    document.head.appendChild(style);
}

function stickyNodes() {
    return (app.graph?._nodes || []).filter((node) => node.type === NOTE_TYPE);
}

function syncPointerDatasets() {
    const nodes = stickyNodes();
    document.querySelectorAll(".floyo-sticky-wrapper").forEach((wrapper, index) => {
        wrapper.dataset.pointerDir = nodes[index]?.properties?.pointerDir || "";
    });
}

function clampTextSize(px) {
    return Math.max(6, Math.min(36, px));
}

function nearestEditableElement(node, editor) {
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return el?.closest?.("span, b, strong, i, em, u, s, strike, code, h1, h2, h3, p, li, pre") ||
        editor.querySelector("p, h1, h2, h3, li, pre, code, span") ||
        editor;
}

function adjustSelectedTextSize(editor, delta) {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editor.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    const baseEl = nearestEditableElement(range.startContainer, editor);
    const base = parseFloat(window.getComputedStyle(baseEl).fontSize) || 8;
    const next = `${clampTextSize(base + delta)}px`;

    if (range.collapsed) {
        baseEl.style.fontSize = next;
        return true;
    }

    const span = document.createElement("span");
    span.style.fontSize = next;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    sel.addRange(nextRange);
    return true;
}

function addTextSizeButtons(toolbar) {
    if (toolbar.querySelector('[data-cmd="increaseTextSize"]')) return;
    const firstSep = toolbar.querySelector(".floyo-tool-sep");
    const sep = document.createElement("div");
    sep.className = "floyo-tool-sep";

    const makeButton = (cmd, label, title) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "floyo-tool-btn tool-size";
        button.dataset.cmd = cmd;
        button.title = title;
        button.textContent = label;
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const wrapper = toolbar.closest(".floyo-sticky-wrapper");
            const editor = wrapper?.querySelector(".floyo-sticky-editor");
            if (!editor) return;
            editor.focus();
            if (adjustSelectedTextSize(editor, cmd === "increaseTextSize" ? 2 : -2)) {
                editor.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });
        return button;
    };

    const smaller = makeButton("decreaseTextSize", "A-", "Decrease selected text size");
    const bigger = makeButton("increaseTextSize", "A+", "Increase selected text size");
    toolbar.insertBefore(sep, firstSep);
    toolbar.insertBefore(smaller, firstSep);
    toolbar.insertBefore(bigger, firstSep);
}

function patchToolbars(root = document) {
    root.querySelectorAll(".floyo-sticky-toolbar").forEach(addTextSizeButtons);
}

function installObserver() {
    if (window.__floyoStickyUiRuntimeFixObserver) return;
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== "childList") continue;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                patchToolbars(node);
                syncPointerDatasets();
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__floyoStickyUiRuntimeFixObserver = observer;
}

function installRuntimeUiFix() {
    injectStyles();
    patchToolbars();
    syncPointerDatasets();
    installObserver();
    if (!window.__floyoStickyUiRuntimeFixTimer) {
        window.__floyoStickyUiRuntimeFixTimer = setInterval(syncPointerDatasets, 300);
    }
}

installRuntimeUiFix();

app.registerExtension({
    name: "Floyo.StickyNote.UiRuntimeFix",
    async setup() {
        installRuntimeUiFix();
    },
});
