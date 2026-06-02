/**
 * Floyo Sticky Note visual zero top line fix.
 * Role: hosted compatibility module for removing stale top hairlines.
 *
 * Some hosted cached visual modules styled the first Vue child inside the
 * outer node shell. In Floyo that child can collapse to a 1px strip, producing
 * an ugly horizontal line above the rounded title bar. This override clears it.
 */

const STYLE_ID = "floyo-sticky-visual-zero-top-line-style";

function injectZeroTopLineStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-sticky-node-shell.floyo-sticky-node-shell > :first-child:first-child {
            border: 0 !important;
            box-shadow: none !important;
            background-color: transparent !important;
        }
    `;
    document.head.appendChild(style);
}

injectZeroTopLineStyles();
