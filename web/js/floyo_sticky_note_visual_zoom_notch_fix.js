/**
 * Floyo Sticky Note visual zoom notch fix.
 * Role: hosted compatibility module for responsive, unified arrow notches.
 *
 * Replaces border-triangle notches with clipped polygons. The notch scales with
 * node dimensions, uses the same theme fill/outline as the node, and overlaps
 * the fill into the shell edge so it reads as one continuous shape.
 */

const STYLE_ID = "floyo-sticky-visual-zoom-notch-style";

function injectZoomNotchStyles() {
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
            --floyo-notch-base: 30px;
            --floyo-notch-reach: 17px;
            --floyo-notch-inner-base: 29px;
            --floyo-notch-inner-reach: 16.5px;
            --floyo-sticky-notch-fill: var(--floyo-sticky-bg, var(--bg));
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
            box-sizing: border-box !important;
            border: 0 !important;
            background: transparent !important;
            pointer-events: none !important;
            transform: none !important;
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::before {
            z-index: 1 !important;
            background: var(--floyo-sticky-border, var(--border)) !important;
        }
        .floyo-sticky-node-shell.floyo-sticky-node-shell::after {
            z-index: 2 !important;
            background: var(--floyo-sticky-notch-fill, var(--floyo-sticky-bg, var(--bg))) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::before {
            display: block !important;
            width: var(--floyo-notch-base) !important;
            height: var(--floyo-notch-reach) !important;
            left: 50% !important;
            top: calc(-1 * var(--floyo-notch-reach)) !important;
            transform: translateX(-50%) !important;
            clip-path: polygon(50% 0, 100% 100%, 0 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="up"]::after {
            display: block !important;
            width: var(--floyo-notch-inner-base) !important;
            height: var(--floyo-notch-inner-reach) !important;
            left: 50% !important;
            top: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
            transform: translateX(-50%) !important;
            clip-path: polygon(50% 0, 100% 100%, 0 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::before {
            display: block !important;
            width: var(--floyo-notch-base) !important;
            height: var(--floyo-notch-reach) !important;
            left: 50% !important;
            bottom: calc(-1 * var(--floyo-notch-reach)) !important;
            transform: translateX(-50%) !important;
            clip-path: polygon(0 0, 100% 0, 50% 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="down"]::after {
            display: block !important;
            width: var(--floyo-notch-inner-base) !important;
            height: var(--floyo-notch-inner-reach) !important;
            left: 50% !important;
            bottom: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
            transform: translateX(-50%) !important;
            clip-path: polygon(0 0, 100% 0, 50% 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::before {
            display: block !important;
            width: var(--floyo-notch-reach) !important;
            height: var(--floyo-notch-base) !important;
            left: calc(-1 * var(--floyo-notch-reach)) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            clip-path: polygon(0 50%, 100% 0, 100% 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="left"]::after {
            display: block !important;
            width: var(--floyo-notch-inner-reach) !important;
            height: var(--floyo-notch-inner-base) !important;
            left: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            clip-path: polygon(0 50%, 100% 0, 100% 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::before {
            display: block !important;
            width: var(--floyo-notch-reach) !important;
            height: var(--floyo-notch-base) !important;
            right: calc(-1 * var(--floyo-notch-reach)) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            clip-path: polygon(0 0, 100% 50%, 0 100%) !important;
        }
        .floyo-sticky-node-shell[data-pointer-dir="right"]::after {
            display: block !important;
            width: var(--floyo-notch-inner-reach) !important;
            height: var(--floyo-notch-inner-base) !important;
            right: calc(-1 * var(--floyo-notch-inner-reach) + 0.5px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            clip-path: polygon(0 0, 100% 50%, 0 100%) !important;
        }
    `;
    document.head.appendChild(style);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function nodeDimension(shell, name, fallback) {
    const value = parseFloat(shell.style.getPropertyValue(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function syncZoomNotchChrome(root = document) {
    root.querySelectorAll(".floyo-sticky-wrapper").forEach((wrapper) => {
        const shell = wrapper.closest(".lg-node");
        if (!shell) return;
        const styles = getComputedStyle(wrapper);
        const border = styles.getPropertyValue("--border").trim();
        const bg = styles.getPropertyValue("--bg").trim();
        const header = styles.getPropertyValue("--header").trim();
        const dir = wrapper.dataset.pointerDir || "";
        const rect = shell.getBoundingClientRect();
        const nodeWidth = nodeDimension(shell, "--node-width", rect.width);
        const nodeHeight = nodeDimension(shell, "--node-height", rect.height);
        const ref = Math.min(nodeWidth || rect.width, nodeHeight || rect.height);
        const base = Math.round(clamp(ref * 0.13, 30, 50));
        const reach = Math.round(clamp(ref * 0.075, 17, 30));

        shell.classList.add("floyo-sticky-node-shell");
        shell.dataset.pointerDir = dir;
        if (border) shell.style.setProperty("--floyo-sticky-border", border);
        if (bg) shell.style.setProperty("--floyo-sticky-bg", bg);
        shell.style.setProperty("--floyo-sticky-notch-fill", dir === "up" && header ? header : bg);
        shell.style.setProperty("--floyo-notch-base", `${base}px`);
        shell.style.setProperty("--floyo-notch-reach", `${reach}px`);
        shell.style.setProperty("--floyo-notch-inner-base", `${Math.max(1, base - 1)}px`);
        shell.style.setProperty("--floyo-notch-inner-reach", `${Math.max(1, reach - 0.5)}px`);
    });
}

function installZoomNotchFix() {
    injectZoomNotchStyles();
    syncZoomNotchChrome();
    if (!window.__floyoStickyZoomNotchObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target?.classList?.contains("floyo-sticky-wrapper")) {
                        syncZoomNotchChrome(target.parentElement || document);
                    }
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncZoomNotchChrome(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-pointer-dir", "data-theme", "class", "style"],
        });
        window.__floyoStickyZoomNotchObserver = observer;
    }
    if (!window.__floyoStickyZoomNotchTimer) {
        window.__floyoStickyZoomNotchTimer = setInterval(syncZoomNotchChrome, 250);
    }
}

installZoomNotchFix();
