/**
 * Floyo Sticky Note editor cursor and title owner-document fix.
 * Role: hosted compatibility module for cached sticky-note implementations.
 *
 * Adds document-style text cursors while editing and preserves user-provided
 * node titles, including empty or whitespace-only values.
 */

const STYLE_ID = "floyo-sticky-editor-cursor-title-owner-style";
const DEFAULT_TITLE = "Floyo Sticky Note";
const NATIVE_TITLE_SENTINEL = "\u00A0";
const styledDocuments = new WeakSet();

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function rawTitle(value) {
    return value == null ? "" : String(value);
}

function titleForNative(value) {
    const title = rawTitle(value).replace(/\r\n?/g, "\n").replace(/\n/g, " ");
    return title.length ? title : NATIVE_TITLE_SENTINEL;
}

function isUserNativeTitle(value) {
    const title = rawTitle(value);
    return title !== "" &&
        title !== NATIVE_TITLE_SENTINEL &&
        title !== DEFAULT_TITLE &&
        title !== "FloyoStickyNote";
}

function injectCursorStyles(doc = document) {
    if (!doc?.head || styledDocuments.has(doc)) return;
    let style = doc.getElementById(STYLE_ID);
    if (!style) {
        style = doc.createElement("style");
        style.id = STYLE_ID;
        doc.head.appendChild(style);
    }
    styledDocuments.add(doc);
    style.textContent = `
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-body,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-editor,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-editor * {
            cursor: text !important;
        }
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-toolbar,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-toolbar *,
        .floyo-sticky-wrapper[data-mode="editor"] button,
        .floyo-sticky-wrapper[data-mode="editor"] a,
        .floyo-sticky-wrapper[data-mode="editor"] img,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-embed,
        .floyo-sticky-wrapper[data-mode="editor"] [contenteditable="false"] {
            cursor: pointer !important;
        }
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-sticky-footer * {
            cursor: default !important;
        }
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-footer-pointer,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-pointer-arrow,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-swatch,
        .floyo-sticky-wrapper[data-mode="editor"] .floyo-footer-save {
            cursor: pointer !important;
        }
    `;
}

function patchTitlePersistence(node) {
    if (!node || node.__floyoEditorCursorTitleOwnerFix) return;
    node.__floyoEditorCursorTitleOwnerFix = true;
    node.properties ||= {};
    if (!hasOwn(node.properties, "title") || node.properties.title == null) {
        node.properties.title = DEFAULT_TITLE;
    }

    let lastNativeTitle = "";
    const applyStoredTitleToNative = () => {
        node.title = titleForNative(node.properties.title);
        lastNativeTitle = node.title;
    };
    const syncTitleFromNative = () => {
        const current = rawTitle(node.title);
        if (current === lastNativeTitle) return;
        node.properties.title = current === NATIVE_TITLE_SENTINEL ? "" : current;
        applyStoredTitleToNative();
    };

    if (isUserNativeTitle(node.title) && node.title !== titleForNative(node.properties.title)) {
        node.properties.title = rawTitle(node.title);
    }
    applyStoredTitleToNative();
    const timer = window.setInterval(syncTitleFromNative, 500);

    const onSerialize = node.onSerialize;
    node.onSerialize = function (o) {
        const nativeBeforeSerialize = rawTitle(node.title);
        onSerialize?.apply(this, arguments);
        if (nativeBeforeSerialize !== lastNativeTitle) {
            node.properties.title = nativeBeforeSerialize === NATIVE_TITLE_SENTINEL ? "" : nativeBeforeSerialize;
            applyStoredTitleToNative();
        } else {
            syncTitleFromNative();
        }
        o.floyo_state ||= {};
        o.floyo_state.title = node.properties.title;
    };

    const onConfigure = node.onConfigure;
    node.onConfigure = function (o) {
        onConfigure?.apply(this, arguments);
        if (hasOwn(o?.floyo_state || {}, "title")) {
            node.properties.title = rawTitle(o.floyo_state.title);
        } else if (!hasOwn(node.properties, "title") || node.properties.title == null) {
            node.properties.title = DEFAULT_TITLE;
        }
        applyStoredTitleToNative();
    };

    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
        window.clearInterval(timer);
        onRemoved?.apply(this, arguments);
    };
}

function syncEditorCursorAndTitles(root = document) {
    root.querySelectorAll?.(".floyo-sticky-wrapper").forEach((wrapper) => {
        injectCursorStyles(wrapper.ownerDocument || document);
    });
    window.comfy?.app?.graph?._nodes?.forEach((node) => {
        if (node.type !== "FloyoStickyNote") return;
        patchTitlePersistence(node);
        node.widgets?.forEach((widget) => {
            if (widget.element?.classList?.contains("floyo-sticky-wrapper")) {
                injectCursorStyles(widget.element.ownerDocument || document);
            }
        });
    });
}

function installEditorCursorTitleFix() {
    injectCursorStyles(document);
    syncEditorCursorAndTitles();
    window.setTimeout(syncEditorCursorAndTitles, 50);
    window.setTimeout(syncEditorCursorAndTitles, 250);
    window.setTimeout(syncEditorCursorAndTitles, 1000);

    if (!window.__floyoStickyEditorCursorTitleOwnerObserver) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    syncEditorCursorAndTitles(mutation.target?.parentElement || document);
                    continue;
                }
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncEditorCursorAndTitles(node);
                });
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-mode", "class", "style"],
        });
        window.__floyoStickyEditorCursorTitleOwnerObserver = observer;
    }

    if (!window.__floyoStickyEditorCursorTitleOwnerTimer) {
        window.__floyoStickyEditorCursorTitleOwnerTimer = window.setInterval(syncEditorCursorAndTitles, 500);
    }
}

installEditorCursorTitleFix();
