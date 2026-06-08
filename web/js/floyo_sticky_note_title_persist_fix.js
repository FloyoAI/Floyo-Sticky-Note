/**
 * Floyo Sticky Note — title persistence hotfix (new-filename cache-bust).
 *
 * WHY THIS IS A NEW FILE (read before "simplifying" into another module):
 * Floyo's hosted ComfyUI imports every extension file from an immutable,
 * edge-cached dispatch URL keyed by FILENAME. Editing an existing file in
 * place (e.g. floyo_sticky_note_remote_compat.js) does NOT reach browsers that
 * already cached that filename — they keep running the old module forever.
 * Shipping a fix under a brand-new filename is the only reliable way to force
 * the browser to fetch it. (This is the same reason remote_compat.js itself
 * exists.) So: new behaviour that must reach cached clients → new file.
 *
 * WHAT IT FIXES:
 * The previously-shipped remote_compat.js ran a 1-second syncTitle() that
 * preferred the stored properties.title over the live node.title. A rename
 * typed into the native / Vue title bar only mutates node.title, so that loop
 * reverted it back to the stored value — almost always the default
 * "Floyo Sticky Note" — within ~1s. Because the old file is cached by
 * filename, fixing it in place did not help already-loaded browsers.
 *
 * THIS MODULE:
 *   1. Stops the legacy reverting timer (window.__floyoStickyLivePatchTimer)
 *      and pins the handle so it can never be re-created.
 *   2. Installs a CORRECT reconcile that adopts a genuine user-typed native
 *      title and otherwise reflects the persisted title — never forcing the
 *      default over a real name.
 *   3. Keeps onSerialize/onConfigure persistence consistent with floyo_state.
 */

import { app } from "../../../scripts/app.js";

const NOTE_TYPE = "FloyoStickyNote";
const DEFAULT_TITLE = "Floyo Sticky Note";
const SENTINEL_TITLE = " ";

/* Reconcile a single node's title: node.title <-> node.properties.title. */
function reconcileTitle(node) {
    if (!node || node.type !== NOTE_TYPE) return;
    node.properties = node.properties || {};

    const native = typeof node.title === "string" ? node.title : "";
    const stored = typeof node.properties.title === "string" ? node.properties.title : "";
    const nativeTrimmed = native.trim();
    const storedTrimmed = stored.trim();

    // A native title the user actually typed: not blank, not the sentinel,
    // not the raw class name, and not the default placeholder. Only such a
    // value may OVERRIDE the persisted title — that guard stops a stray
    // re-render that momentarily shows the placeholder from wiping a save.
    const nativeIsUserRename =
        nativeTrimmed !== "" &&
        nativeTrimmed !== SENTINEL_TITLE &&
        nativeTrimmed !== NOTE_TYPE &&
        nativeTrimmed !== DEFAULT_TITLE;

    let next;
    if (nativeIsUserRename && native !== stored) {
        next = native;            // user renamed via the native / Vue title bar
    } else if (storedTrimmed !== "") {
        next = stored;            // reflect the persisted title
    } else if (nativeIsUserRename) {
        next = native;
    } else {
        next = DEFAULT_TITLE;
    }

    node.properties.title = next;
    node.title = next;
    node.drawBadges = function () {};
}

function reconcileAll() {
    const nodes = app.graph?._nodes || [];
    for (const node of nodes) reconcileTitle(node);
}

/* Kill the legacy 1s reverter from the cached remote_compat.js and pin the
 * handle to a truthy sentinel so its installPeriodicSync() guard
 * (`if (window.__floyoStickyLivePatchTimer) return;`) never recreates it,
 * regardless of which module's setup() runs first. */
function stopLegacyReverter() {
    const t = window.__floyoStickyLivePatchTimer;
    if (t && t !== -1) {
        try { clearInterval(t); } catch (_) {}
    }
    window.__floyoStickyLivePatchTimer = -1;
}

app.registerExtension({
    name: "Floyo.StickyNote.TitlePersistFix",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NOTE_TYPE) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments);
            reconcileTitle(this);
            return r;
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            const r = onConfigure?.apply(this, arguments);
            const saved = data?.floyo_state?.title;
            if (typeof saved === "string" && saved.trim() !== "") {
                this.properties = this.properties || {};
                this.properties.title = saved;
            }
            reconcileTitle(this);
            return r;
        };

        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (data) {
            reconcileTitle(this);
            const r = onSerialize?.apply(this, arguments);
            data.floyo_state = data.floyo_state || {};
            data.floyo_state.title = this.properties?.title ?? DEFAULT_TITLE;
            return r;
        };
    },
    async setup() {
        stopLegacyReverter();
        reconcileAll();
        if (!window.__floyoStickyTitlePersistTimer) {
            window.__floyoStickyTitlePersistTimer = setInterval(() => {
                stopLegacyReverter();   // keep the legacy reverter dead if it respawns
                reconcileAll();
            }, 500);
        }
        // A few immediate passes to cover first paint / late hydration.
        setTimeout(reconcileAll, 0);
        setTimeout(reconcileAll, 250);
        setTimeout(reconcileAll, 1000);
    },
});
