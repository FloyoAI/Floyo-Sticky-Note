/**
 * Floyo Sticky Note visual unified notch fix.
 * Role: hosted compatibility module for seamless, thin arrow notches.
 *
 * This final override keeps the outline on the outer node shell, uses a thin
 * outside-only triangle notch, and overlaps the fill by 1px so the shell border
 * does not show as a line behind the arrow.
 */

const STYLE_ID = "floyo-sticky-visual-unified-notch-style";

function injectUnifiedNotchStyles() {
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
            transform: none !important;
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::before {
            z-index: 1 !important;
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::after {
            z-index: 2 !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::before {
            display: block !important;
            left: 50% !important;
            top: -12px !important;
            transform: translateX(-50%) !important;
            border-left: 13px solid transparent !important;
            border-right: 13px solid transparent !important;
            border-bottom: 12px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::after {
            display: block !important;
            left: 50% !important;
            top: -10px !important;
            transform: translateX(-50%) !important;
            border-left: 12px solid transparent !important;
            border-right: 12px solid transparent !important;
            border-bottom: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::before {
            display: block !important;
            left: 50% !important;
            bottom: -12px !important;
            transform: translateX(-50%) !important;
            border-left: 13px solid transparent !important;
            border-right: 13px solid transparent !important;
            border-top: 12px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::after {
            display: block !important;
            left: 50% !important;
            bottom: -10px !important;
            transform: translateX(-50%) !important;
            border-left: 12px solid transparent !important;
            border-right: 12px solid transparent !important;
            border-top: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::before {
            display: block !important;
            left: -12px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 13px solid transparent !important;
            border-bottom: 13px solid transparent !important;
            border-right: 12px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::after {
            display: block !important;
            left: -10px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 12px solid transparent !important;
            border-bottom: 12px solid transparent !important;
            border-right: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::before {
            display: block !important;
            right: -12px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 13px solid transparent !important;
            border-bottom: 13px solid transparent !important;
            border-left: 12px solid var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::after {
            display: block !important;
            right: -10px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border-top: 12px solid transparent !important;
            border-bottom: 12px solid transparent !important;
            border-left: 11px solid var(--floyo-sticky-bg, var(--bg)) !important;
        }
    `;
    document.head.appendChild(style);
}

function syncUnifiedNotchChrome(root = document) {
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

function installUnifiedNotchFix() {
    injectUnifiedNotchStyles();
    syncUnifiedNotchChrome();
    if (!window.__floyoStickyUnifiedNotchObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target?.classList?.contains("floyo-sticky-wrapper")) {
                        syncUnifiedNotchChrome(target.parentElement || document);
                    }
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncUnifiedNotchChrome(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-pointer-dir", "data-theme", "class"],
        });
        window.__floyoStickyUnifiedNotchObserver = observer;
    }
    if (!window.__floyoStickyUnifiedNotchTimer) {
        window.__floyoStickyUnifiedNotchTimer = setInterval(syncUnifiedNotchChrome, 500);
    }
}

installUnifiedNotchFix();
