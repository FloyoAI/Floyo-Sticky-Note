/**
 * Floyo Sticky Note — title persistence + brand-font hotfix (new-filename
 * cache-bust).
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
 *   (A) Title revert: the previously-shipped remote_compat.js ran a 1-second
 *       syncTitle() that preferred the stored properties.title over the live
 *       node.title, so a rename typed into the native / Vue title bar was
 *       reverted to the default "Floyo Sticky Note" within ~1s.
 *   (B) Lost brand font: on Floyo's Vue/DOM renderer the title is a real
 *       <span> and the ArcadePixelNeue brand font comes ONLY from the
 *       ".floyo-sticky-vue-title" class, which has to be added by JS. The only
 *       code that added it (remote_compat.js styleVueTitles) was driven by the
 *       1s timer (and an observer) that this module disables to fix (A). So
 *       killing that timer left the title in a plain default font.
 *
 * THIS MODULE (self-sufficient — does NOT depend on remote_compat being loaded):
 *   1. Stops the legacy reverting timer (window.__floyoStickyLivePatchTimer)
 *      and pins the handle so it can never be re-created.
 *   2. Installs a CORRECT reconcile that adopts a genuine user-typed native
 *      title and otherwise reflects the persisted title.
 *   3. Re-injects the .floyo-sticky-vue-title CSS and re-applies the class to
 *      the Vue title span — on its own MutationObserver (immediate, no flash)
 *      plus a 500ms backstop poll — so the brand font is preserved.
 *   4. Keeps onSerialize/onConfigure persistence consistent with floyo_state.
 *
 * INVARIANT: nothing here writes node.title / node.properties.title except
 * reconcileTitle(). The styling helpers touch only DOM classList/textContent,
 * so they can never reintroduce the revert bug.
 */

import { app } from "../../../scripts/app.js";

const NOTE_TYPE = "FloyoStickyNote";
const DEFAULT_TITLE = "Floyo Sticky Note";
const SENTINEL_TITLE = " ";
// Shared with remote_compat.js (its PATCH_STYLE_ID, byte-identical id string)
// so whichever module loads first injects the <style> and the other no-ops.
const PATCH_STYLE_ID = "floyo-sticky-live-patch-style";
const VUE_TITLE_CLASS = "floyo-sticky-vue-title";

/* ── Title value reconcile (node.title <-> node.properties.title) ─────────── */

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

/* ── Brand-font restoration (Vue/DOM renderer) ───────────────────────────── */

/* Inject the Vue-title CSS once. Shares the exact id + rules with
 * remote_compat.js so the two modules are mutually idempotent: whichever runs
 * first injects, the other early-returns. Self-sufficient: does NOT rely on
 * remote_compat being loaded. Rules copied verbatim from remote_compat.js
 * injectPatchStyles(). */
function injectVueTitleStyles() {
    if (document.getElementById(PATCH_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PATCH_STYLE_ID;
    style.textContent = `
        .${VUE_TITLE_CLASS} {
            font-family: "ArcadePixelNeue", "Courier New", monospace !important;
            font-size: 14px !important;
            font-weight: 400 !important;
            letter-spacing: 0.7px !important;
            color: #F1E7FF !important;
            text-transform: none !important;
        }
    `;
    document.head.appendChild(style);
}

/* The set of currently-valid sticky-note titles (live node titles +
 * DEFAULT_TITLE + NOTE_TYPE). Callers must run reconcileAll() FIRST so a fresh
 * rename is already in node.title / node.properties.title — otherwise the
 * `properties.title || title` short-circuit would still hold the OLD value and
 * the renamed span would be skipped by the gate below. */
function knownStickyTitles() {
    const titles = new Set(
        (app.graph?._nodes || [])
            .filter((node) => node.type === NOTE_TYPE)
            .map((node) => (node.properties?.title || node.title || "").trim())
            .filter(Boolean)
    );
    titles.add(DEFAULT_TITLE);
    titles.add(NOTE_TYPE);
    return titles;
}

/* Apply the brand-font class to a single .editable-text span if its text
 * matches a known sticky title. Idempotent: classList.add is a no-op when the
 * class is present; the NOTE_TYPE -> DEFAULT_TITLE rewrite only fires when the
 * span literally reads the raw class name (never a user title) and is guarded
 * so it cannot retrigger our own characterData observer into a loop. */
function styleOneSpan(el, titles) {
    const text = (el.textContent || "").trim();
    if (!titles.has(text)) return;
    el.classList.add(VUE_TITLE_CLASS);
    if (text === NOTE_TYPE && el.textContent !== DEFAULT_TITLE) {
        el.textContent = DEFAULT_TITLE;
    }
}

/* Re-apply the brand-font class to every matching Vue title span under `root`.
 * Never writes node.title / node.properties.title, so it cannot reintroduce
 * the revert bug. Deliberately omits any setDirtyCanvas (no render storm). */
function styleVueTitles(root = document) {
    const titles = knownStickyTitles();
    const spans = root.querySelectorAll ? root.querySelectorAll(".editable-text span") : [];
    spans.forEach((el) => styleOneSpan(el, titles));
    // If the observer hands us the changed span itself, querySelectorAll won't
    // include it — style it directly too.
    if (root.matches && root.matches(".editable-text span")) {
        styleOneSpan(root, titles);
    }
}

/* Self-owned MutationObserver so renames restyle IMMEDIATELY (no up-to-500ms
 * plain-font flash that pure polling would leave). Unlike remote_compat's
 * observer it ALSO watches characterData: Vue renames an existing span by
 * mutating its text in place, which a childList/element-only observer misses.
 * Bursts are coalesced into one pass per animation frame. Independent global
 * flag so it coexists harmlessly with remote_compat's observer if present. */
function installVueTitleObserver() {
    if (window.__floyoStickyVueTitleObserver) return;
    let scheduled = false;
    const restyleSoon = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            try { styleVueTitles(); } catch (_) {}
        });
    };
    const observer = new MutationObserver(restyleSoon);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
    });
    window.__floyoStickyVueTitleObserver = observer;
}

/* ── Legacy reverter shutdown ────────────────────────────────────────────── */

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

/* Run the title reconcile, THEN restyle — order matters (see knownStickyTitles). */
function reconcileAndStyle() {
    reconcileAll();
    styleVueTitles();
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
        injectVueTitleStyles();
        installVueTitleObserver();
        reconcileAndStyle();            // reconcile, then style with current titles
        if (!window.__floyoStickyTitlePersistTimer) {
            window.__floyoStickyTitlePersistTimer = setInterval(() => {
                stopLegacyReverter();   // keep the legacy reverter dead if it respawns
                reconcileAndStyle();    // backstop the observer (poll)
            }, 500);
        }
        // A few immediate passes to cover first paint / late hydration.
        setTimeout(reconcileAndStyle, 0);
        setTimeout(reconcileAndStyle, 250);
        setTimeout(reconcileAndStyle, 1000);
    },
});
