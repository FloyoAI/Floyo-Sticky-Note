/**
 * Floyo Sticky Note visual compatibility patch.
 * Role: meaningful implementation for hosted visual-cache compatibility.
 *
 * Fresh immutable-dispatch filename for hosted Floyo sessions. Applies the
 * latest Figma-aligned outline, compact directional notches, bottom controls,
 * and compass icon even when an older sticky-note module is cached.
 *
 * Keep this patch only for hosted cache compatibility. Future visual changes
 * should land in `floyo_sticky_note.js` first, then use a shim only when a
 * new immutable URL is required.
 */

import { app } from "../../../scripts/app.js";

const STYLE_ID = "floyo-sticky-visual-polish-style";

const COMPASS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 18" width="26" height="18" fill="none" aria-hidden="true" class="floyo-pointer-svg">
    <path class="floyo-pointer-arrow" data-dir="up"
          d="M11.7655 1.49994C12.1504 0.833273 13.1126 0.833272 13.4975 1.49994L15.5942 5.13152C15.9791 5.79818 15.498 6.63152 14.7282 6.63152H10.5348C9.76501 6.63152 9.28388 5.79818 9.66878 5.13152L11.7655 1.49994Z"/>
    <path class="floyo-pointer-arrow" data-dir="right"
          d="M23.5132 8.09351C23.8255 8.27393 23.845 8.70753 23.5718 8.91968L23.5132 8.95972L19.8813 11.0564C19.5481 11.2485 19.1313 11.0076 19.1313 10.6228V6.42944C19.1314 6.04466 19.5481 5.80449 19.8813 5.99683L23.5132 8.09351Z"/>
    <path class="floyo-pointer-arrow" data-dir="down"
          d="M13.0645 15.3026C12.884 15.6149 12.4504 15.6344 12.2383 15.3611L12.1982 15.3026L10.1016 11.6707C9.90951 11.3374 10.1504 10.9207 10.5352 10.9207H14.7285C15.1133 10.9208 15.3535 11.3374 15.1611 11.6707L13.0645 15.3026Z"/>
    <path class="floyo-pointer-arrow" data-dir="left"
          d="M1.75 8.95905C1.43765 8.77862 1.41815 8.34503 1.69141 8.13287L1.75 8.09283L5.38184 5.99616C5.71511 5.8041 6.13184 6.04499 6.13184 6.42975V10.6231C6.13173 11.0079 5.71511 11.2481 5.38184 11.0557L1.75 8.95905Z"/>
</svg>`;

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
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
        .floyo-sticky-wrapper {
            overflow: visible !important;
            box-shadow: none !important;
        }
        .floyo-sticky-wrapper[data-pointer-dir]::before,
        .floyo-sticky-wrapper[data-pointer-dir]::after {
            display: none !important;
        }
        .floyo-display-actions {
            left: 14px !important;
            right: -1px !important;
            bottom: -2px !important;
        }
        .floyo-footer-pointer {
            width: 26px !important;
            height: 18px !important;
        }
        .floyo-pointer-svg {
            width: 26px !important;
            height: 18px !important;
            overflow: visible !important;
        }
    `;
    document.head.appendChild(style);
}

function polishCompasses(root = document) {
    root.querySelectorAll(".floyo-footer-pointer").forEach((pointer) => {
        const wrapper = pointer.closest(".floyo-sticky-wrapper");
        const activeDir = wrapper?.dataset.pointerDir || "";
        if (pointer.dataset.visualPolish !== "true") {
            pointer.innerHTML = COMPASS_SVG;
            pointer.dataset.visualPolish = "true";
        }
        pointer.querySelectorAll(".floyo-pointer-arrow").forEach((arrow) => {
            arrow.classList.toggle("is-active", arrow.dataset.dir === activeDir);
        });
    });
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

function installObserver() {
    if (window.__floyoStickyVisualPolishObserver) return;
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes") {
                const target = mutation.target;
                if (target?.classList?.contains("floyo-sticky-wrapper")) {
                    syncOuterChrome(target.parentElement || document);
                    polishCompasses(target.parentElement || document);
                }
                continue;
            }
            if (mutation.type !== "childList") continue;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    polishCompasses(node);
                    syncOuterChrome(node);
                }
            });
        }
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-pointer-dir", "data-theme", "class"],
    });
    window.__floyoStickyVisualPolishObserver = observer;
}

function installVisualPolish() {
    injectStyles();
    polishCompasses();
    syncOuterChrome();
    installObserver();
    if (!window.__floyoStickyVisualPolishTimer) {
        window.__floyoStickyVisualPolishTimer = setInterval(() => {
            polishCompasses();
            syncOuterChrome();
        }, 500);
    }
    app.graph?.setDirtyCanvas?.(true, true);
}

installVisualPolish();

app.registerExtension({
    name: "Floyo.StickyNote.VisualPolish",
    async setup() {
        installVisualPolish();
    },
});
