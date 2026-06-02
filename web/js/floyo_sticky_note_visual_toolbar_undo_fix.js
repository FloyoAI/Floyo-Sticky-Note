/**
 * Floyo Sticky Note visual toolbar and undo fix.
 * Role: hosted compatibility module for cached sticky-note editors.
 *
 * Ensures the toolbar wraps instead of clipping controls on narrow notes, and
 * keeps Ctrl/Cmd+Z/Y inside the contenteditable so ComfyUI does not steal text
 * undo/redo as graph-level undo/redo.
 */

const STYLE_ID = "floyo-sticky-toolbar-undo-style";
const UNDO_GUARD_FLAG = "__floyoStickyUndoGuard";
const UNDO_STACK_FLAG = "__floyoStickyUndoStack";

function injectToolbarStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .floyo-sticky-toolbar {
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
            overflow: visible !important;
            align-content: flex-start !important;
        }
        .floyo-tool-btn,
        .floyo-tool-sep {
            flex: 0 0 auto !important;
        }
    `;
    document.head.appendChild(style);
}

function installUndoGuards(root = document) {
    root.querySelectorAll(".floyo-sticky-editor").forEach((editor) => {
        if (editor[UNDO_GUARD_FLAG]) return;
        editor[UNDO_GUARD_FLAG] = true;
        editor[UNDO_STACK_FLAG] = {
            stack: [editor.innerHTML],
            index: 0,
            restoring: false,
        };

        const remember = () => {
            const state = editor[UNDO_STACK_FLAG];
            if (!state || state.restoring) return;
            const html = editor.innerHTML;
            if (state.stack[state.index] === html) return;
            state.stack.splice(state.index + 1);
            state.stack.push(html);
            if (state.stack.length > 100) state.stack.shift();
            state.index = state.stack.length - 1;
        };

        const restore = (nextIndex) => {
            const state = editor[UNDO_STACK_FLAG];
            if (!state || nextIndex < 0 || nextIndex >= state.stack.length || nextIndex === state.index) return;
            state.index = nextIndex;
            state.restoring = true;
            editor.innerHTML = state.stack[state.index];
            state.restoring = false;
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "historyUndo" }));
        };

        editor.addEventListener("input", remember);
        editor.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if ((event.metaKey || event.ctrlKey) && (key === "z" || key === "y")) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (key === "y" || (key === "z" && event.shiftKey)) {
                    restore(editor[UNDO_STACK_FLAG].index + 1);
                } else {
                    restore(editor[UNDO_STACK_FLAG].index - 1);
                }
            }
        }, true);
    });
}

function installToolbarUndoFix() {
    injectToolbarStyles();
    installUndoGuards();
    if (!window.__floyoStickyToolbarUndoObserver) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) installUndoGuards(node);
                });
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.__floyoStickyToolbarUndoObserver = observer;
    }
}

installToolbarUndoFix();
