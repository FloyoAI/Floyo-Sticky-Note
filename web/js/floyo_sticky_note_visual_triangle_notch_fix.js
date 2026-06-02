/**
 * Floyo Sticky Note visual triangle notch fix.
 * Role: hosted compatibility module for outside-only arrow notches.
 *
 * The previous outer-chrome patch used a rotated square, which showed as a
 * diamond. This file uses real CSS triangles so only the outside arrow is
 * visible and the note body stays clean.
 */

const STYLE_ID = "floyo-sticky-visual-triangle-notch-style";

function injectTriangleNotchStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-sticky-wrapper {
            box-shadow: none !important;
        }
        .floyo-sticky-wrapper[data-pointer-dir]::before,
        .floyo-sticky-wrapper[data-pointer-dir]::after {
            display: none !important;
        }
        .floyo-sticky-node-shell {
            border-radius: 16px !important;
            overflow: visible !important;
            box-shadow: 0 0 0 1px var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell > :first-child {
            border: 0 !important;
            background-color: transparent !important;
            box-shadow: none !important;
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::before,
        .floyo-sticky-node-shell.floyo-sticky-node-shell::after {
            content: "" !important;
            position: absolute !important;
            display: none;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
            border: 0 solid transparent !important;
            pointer-events: none !important;
            z-index: 0 !important;
            transform: none !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::before {
            display: block !important;
            left: 50% !important;
            top: -14px !important;
            transform: translateX(-50%) !important;
            border-left: 15px solid transparent !important;
            border-right: 15px solid transparent !important;
            border-bottom: 14px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::after {
            display: block !important;
            left: 50% !important;
            top: -11px !important;
            transform: translateX(-50%) !important;
            border-left: 12px solid transparent !important;
            border-right: 12px solid transparent !important;
            border-bottom: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::before {
            display: block !important;
            left: 50% !important;
            bottom: -14px !important;
            transform: translateX(-50%) !important;
            border-left: 15px solid transparent !important;
            border-right: 15px solid transparent !important;
            border-top: 14px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::after {
            display: block !important;
            left: 50% !important;
            bottom: -11px !important;
            transform: translateX(-50%) !important;
            border-left: 12px solid transparent !important;
            border-right: 12px solid transparent !important;
            border-top: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::before {
            display: block !important;
            left: -14px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 15px solid transparent !important;
            border-bottom: 15px solid transparent !important;
            border-right: 14px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::after {
            display: block !important;
            left: -11px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 12px solid transparent !important;
            border-bottom: 12px solid transparent !important;
            border-right: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::before {
            display: block !important;
            right: -14px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 15px solid transparent !important;
            border-bottom: 15px solid transparent !important;
            border-left: 14px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::after {
            display: block !important;
            right: -11px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 12px solid transparent !important;
            border-bottom: 12px solid transparent !important;
            border-left: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
    `;
    document.head.appendChild(style);
}

function syncTriangleNotchChrome(root = document) {
    root.querySelectorAll(".floyo-sticky-wrapper").forEach((wrapper) => {
        const shell = wrapper.closest(".lg-node");
        if (!shell) return;
        const styles = getComputedStyle(wrapper);
        const border = styles.getPropertyValue("--border").trim();
        const bg = styles.getPropertyValue("--bg").trim();
        shell.classList.add("floyo-sticky-node-shell");
        shell.dataset.pointerDir = wrapper.dataset.pointerDir || "";
        if (border) shell.style.setProperty("--floyo-sticky-border", border);
        if (bg) shell.style.setProperty("--floyo-sticky-bg", bg);
    });
}

function installTriangleNotchFix() {
    injectTriangleNotchStyles();
    syncTriangleNotchChrome();
    if (!window.__floyoStickyTriangleNotchObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target?.classList?.contains("floyo-sticky-wrapper")) {
                        syncTriangleNotchChrome(target.parentElement || document);
                    }
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncTriangleNotchChrome(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-pointer-dir", "data-theme", "class"],
        });
        window.__floyoStickyTriangleNotchObserver = observer;
    }
    if (!window.__floyoStickyTriangleNotchTimer) {
        window.__floyoStickyTriangleNotchTimer = setInterval(syncTriangleNotchChrome, 500);
    }
}

installTriangleNotchFix();
