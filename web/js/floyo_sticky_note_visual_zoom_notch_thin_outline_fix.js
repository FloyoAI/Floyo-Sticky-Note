/**
 * Floyo Sticky Note visual zoom notch thin outline fix.
 * Role: hosted compatibility module for thinner, color-matched notches.
 *
 * Keeps the responsive clipped-polygon notch, but makes the outline read closer
 * to 1px and fills the top notch with the title-strip color.
 */

const STYLE_ID = "floyo-sticky-visual-zoom-notch-thin-outline-style";

function injectThinNotchStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-sticky-node-shell {
            --floyo-notch-inner-base: calc(var(--floyo-notch-base, 30px) - 1px);
            --floyo-notch-inner-reach: calc(var(--floyo-notch-reach, 17px) - 0.5px);
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::before {
            background: var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::after {
            background: var(--floyo-sticky-notch-fill, var(--floyo-sticky-bg, var(--bg))) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::after {
            top: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::after {
            bottom: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::after {
            left: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::after {
            right: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
        }
    `;
    document.head.appendChild(style);
}

function syncThinNotchChrome(root = document) {
    root.querySelectorAll(".floyo-sticky-wrapper").forEach((wrapper) => {
        const shell = wrapper.closest(".lg-node");
        if (!shell) return;
        const styles = getComputedStyle(wrapper);
        const bg = styles.getPropertyValue("--bg").trim();
        const header = styles.getPropertyValue("--header").trim();
        const dir = wrapper.dataset.pointerDir || "";

        shell.classList.add("floyo-sticky-node-shell");
        shell.dataset.pointerDir = dir;
        if (dir === "up" && header) {
            shell.style.setProperty("--floyo-sticky-notch-fill", header);
        } else if (bg) {
            shell.style.setProperty("--floyo-sticky-notch-fill", bg);
        }

        const base = parseFloat(shell.style.getPropertyValue("--floyo-notch-base"));
        const reach = parseFloat(shell.style.getPropertyValue("--floyo-notch-reach"));
        if (Number.isFinite(base)) {
            shell.style.setProperty("--floyo-notch-inner-base", `${Math.max(1, base - 1)}px`);
        }
        if (Number.isFinite(reach)) {
            shell.style.setProperty("--floyo-notch-inner-reach", `${Math.max(1, reach - 0.5)}px`);
        }
    });
}

function installThinNotchFix() {
    injectThinNotchStyles();
    syncThinNotchChrome();
    if (!window.__floyoStickyThinNotchObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target?.classList?.contains("floyo-sticky-wrapper")) {
                        syncThinNotchChrome(target.parentElement || document);
                    }
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncThinNotchChrome(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-pointer-dir", "data-theme", "class", "style"],
        });
        window.__floyoStickyThinNotchObserver = observer;
    }
    if (!window.__floyoStickyThinNotchTimer) {
        window.__floyoStickyThinNotchTimer = setInterval(syncThinNotchChrome, 250);
    }
}

installThinNotchFix();
