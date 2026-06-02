/**
 * Floyo Sticky Note visual footer icons fix.
 * Role: hosted compatibility module for exact Figma footer icons.
 *
 * Replaces cached check/compass SVGs with the provided assets and keeps the
 * selected compass arrow filled while inactive arrows remain white@30% strokes.
 */

const STYLE_ID = "floyo-sticky-footer-icons-style";
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M9.33301 14L4.66699 14V12.833L9.33301 12.833V14ZM4.66699 12.833H2.33301L2.33301 11.667H4.66699V12.833ZM11.667 12.833H9.33301V11.667H11.667V12.833ZM2.33301 11.667H1.16699L1.16699 9.33301H2.33301V11.667ZM12.833 11.667H11.667V9.33301H12.833V11.667ZM6.41699 10.5H5.25V9.33301H6.41699V10.5ZM1.16699 9.33301H0L0 4.66699H1.16699L1.16699 9.33301ZM5.25 9.33301H4.08301V8.16699H5.25V9.33301ZM7.58301 9.33301L6.41699 9.33301V8.16699L7.58301 8.16699V9.33301ZM14 9.33301H12.833L12.833 4.66699H14L14 9.33301ZM4.08301 8.16699H2.91699V7L4.08301 7V8.16699ZM8.75 8.16699H7.58301V7H8.75L8.75 8.16699ZM9.91699 7H8.75V5.83301H9.91699V7ZM11.083 5.83301L9.91699 5.83301V4.66699L11.083 4.66699V5.83301ZM2.33301 4.66699H1.16699L1.16699 2.33301L2.33301 2.33301V4.66699ZM12.833 4.66699H11.083V3.5H11.667V2.33301L12.833 2.33301V4.66699ZM4.66699 2.33301H2.33301L2.33301 1.16699L4.66699 1.16699V2.33301ZM11.667 2.33301H9.33301V1.16699L11.667 1.16699V2.33301ZM9.33301 0V1.16699L4.66699 1.16699V0L9.33301 0Z" fill="#3CE195"/>
</svg>`;

const COMPASS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="18" viewBox="0 0 26 18" fill="none" aria-hidden="true" class="floyo-pointer-svg">
  <path class="floyo-pointer-arrow" data-dir="up" d="M11.7655 1.49994C12.1504 0.833273 13.1126 0.833272 13.4975 1.49994L15.5942 5.13152C15.9791 5.79818 15.498 6.63152 14.7282 6.63152H10.5348C9.76501 6.63152 9.28388 5.79818 9.66878 5.13152L11.7655 1.49994Z"/>
  <path class="floyo-pointer-arrow" data-dir="right" d="M23.5132 8.09351C23.8255 8.27393 23.845 8.70753 23.5718 8.91968L23.5132 8.95972L19.8813 11.0564C19.5481 11.2485 19.1313 11.0076 19.1313 10.6228V6.42944C19.1314 6.04466 19.5481 5.80449 19.8813 5.99683L23.5132 8.09351Z"/>
  <path class="floyo-pointer-arrow" data-dir="down" d="M13.0645 15.3026C12.884 15.6149 12.4504 15.6344 12.2383 15.3611L12.1982 15.3026L10.1016 11.6707C9.90951 11.3374 10.1504 10.9207 10.5352 10.9207H14.7285C15.1133 10.9208 15.3535 11.3374 15.1611 11.6707L13.0645 15.3026Z"/>
  <path class="floyo-pointer-arrow" data-dir="left" d="M1.75 8.95905C1.43765 8.77862 1.41815 8.34503 1.69141 8.13287L1.75 8.09283L5.38184 5.99616C5.71511 5.8041 6.13184 6.04499 6.13184 6.42975V10.6231C6.13173 11.0079 5.71511 11.2481 5.38184 11.0557L1.75 8.95905Z"/>
</svg>`;

function injectIconStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-pointer-arrow {
            fill: transparent !important;
            stroke: rgba(255, 255, 255, 0.30) !important;
            stroke-width: 1 !important;
        }
        .floyo-pointer-arrow.is-active {
            fill: #D9D9D9 !important;
            stroke: transparent !important;
        }
        .floyo-footer-save svg {
            width: 14px !important;
            height: 14px !important;
        }
    `;
    document.head.appendChild(style);
}

function syncFooterIcons(root = document) {
    root.querySelectorAll(".floyo-footer-save").forEach((save) => {
        if (save.dataset.floyoExactCheck === "true") return;
        save.innerHTML = CHECK_SVG;
        save.dataset.floyoExactCheck = "true";
    });

    root.querySelectorAll(".floyo-footer-pointer").forEach((pointer) => {
        const wrapper = pointer.closest(".floyo-sticky-wrapper");
        const activeDir = wrapper?.dataset.pointerDir || "";
        if (pointer.dataset.floyoExactCompass !== "true") {
            pointer.innerHTML = COMPASS_SVG;
            pointer.dataset.floyoExactCompass = "true";
        }
        pointer.querySelectorAll(".floyo-pointer-arrow").forEach((arrow) => {
            arrow.classList.toggle("is-active", arrow.dataset.dir === activeDir);
        });
    });
}

function installFooterIconFix() {
    injectIconStyles();
    syncFooterIcons();
    if (!window.__floyoStickyFooterIconObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target?.classList?.contains("floyo-sticky-wrapper")) {
                        syncFooterIcons(target);
                    }
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncFooterIcons(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-pointer-dir", "class"],
        });
        window.__floyoStickyFooterIconObserver = observer;
    }
    if (!window.__floyoStickyFooterIconTimer) {
        window.__floyoStickyFooterIconTimer = setInterval(syncFooterIcons, 500);
    }
}

installFooterIconFix();
