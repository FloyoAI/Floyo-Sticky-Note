/**
 * Floyo Sticky Note visual outer chrome fix.
 * Role: hosted compatibility module for the outer border and notch.
 *
 * This file intentionally has a fresh descriptive name so hosted browsers with
 * immutable cached visual modules fetch the latest outer-border fix. Keep it
 * after the visual compatibility module so its rules win in the cascade.
 */

const STYLE_ID = "floyo-sticky-visual-outer-chrome-style";

function injectOuterChromeStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-sticky-wrapper {
            overflow: visible !important;
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
            position: relative !important;
            z-index: 1 !important;
            overflow: visible !important;
            border: 0 !important;
            background-color: transparent !important;
            box-shadow: none !important;
        }
        .floyo-sticky-node-shell::before {
            content: "";
            position: absolute;
            display: none;
            width: 20px;
            height: 20px;
            box-sizing: border-box;
            background: var(--floyo-sticky-bg, var(--bg));
            border: 1px solid var(--floyo-sticky-border, var(--border));
            pointer-events: none;
            z-index: 0;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::before {
            display: block;
            left: 50%;
            top: -10px;
            transform: translateX(-50%) rotate(45deg);
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::before {
            display: block;
            left: 50%;
            bottom: -10px;
            transform: translateX(-50%) rotate(45deg);
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::before {
            display: block;
            left: -10px;
            top: 50%;
            transform: translateY(-50%) rotate(45deg);
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::before {
            display: block;
            right: -9px;
            top: 50%;
            transform: translateY(-50%) rotate(45deg);
        }
    `;
    document.head.appendChild(style);
}

function syncOuterChrome(root = document) {
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

function installOuterChromeFix() {
    injectOuterChromeStyles();
    syncOuterChrome();
    if (!window.__floyoStickyVisualOuterChromeObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target?.classList?.contains("floyo-sticky-wrapper")) {
                        syncOuterChrome(target.parentElement || document);
                    }
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncOuterChrome(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-pointer-dir", "data-theme", "class"],
        });
        window.__floyoStickyVisualOuterChromeObserver = observer;
    }
    if (!window.__floyoStickyVisualOuterChromeTimer) {
        window.__floyoStickyVisualOuterChromeTimer = setInterval(syncOuterChrome, 500);
    }
}

installOuterChromeFix();
