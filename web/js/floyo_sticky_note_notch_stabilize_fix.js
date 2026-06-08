/* Floyo Sticky Note — Notch Stabilize Fix
 * ----------------------------------------
 * PURPOSE
 *   The directional notch (the speech-bubble pointer triangle) visibly FLICKERS
 *   — its size oscillates big/small several times a second — on jacob and prod.
 *
 * ROOT CAUSE (verified against the cached files)
 *   WEB_DIRECTORY='./web' auto-loads every web/js/*.js. THREE timer loops each
 *   write the SAME four geometry vars (--floyo-notch-base / -reach / -inner-base /
 *   -inner-reach) on the SAME .lg-node shell every 250 ms, AND each installs a
 *   MutationObserver whose attributeFilter INCLUDES "style":
 *     - floyo_sticky_note_visual_notch_surface_fix.js:151  -> getBoundingClientRect()  (zoom-scaled PX)
 *       (+ floyo_sticky_note_visual_notch_surface_owner_fix.js, SAME flags, same rect path)
 *     - floyo_sticky_note_visual_zoom_notch_fix.js:152-155  -> --node-width/-height ELSE rect (PX; the
 *       graph-unit vars are never defined in-repo, so it always falls back to zoom-scaled rect)
 *     - floyo_sticky_note_visual_zoom_notch_thin_outline_fix.js:59-66 -> re-derives inner-* from
 *       whatever base/reach currently exist
 *   The canonical writer, floyo_sticky_note.js:1409-1425 syncOuterChrome(), uses
 *   node.size (LiteGraph GRAPH UNITS → zoom-INVARIANT) and is EVENT-DRIVEN (no
 *   interval). getBoundingClientRect() px diverges from graph units by the zoom
 *   factor, so the px writers and the graph-unit writer disagree. Every
 *   setProperty() mutates inline style → wakes the three style-watching observers
 *   → each recomputes with its own (different) number and overwrites. That
 *   observer feedback loop sitting on top of three perpetual 250 ms intervals is
 *   what makes --floyo-notch-* oscillate between ~31/18 (graph units) and the
 *   zoom-scaled px value. That oscillation is the visible flicker.
 *
 *   The five other "notch" files (unified / triangle / outer_chrome border-triangle
 *   renderers, visual_compat polishCompasses, ui_runtime syncPointerDatasets) do
 *   NOT write --floyo-notch-* geometry and their observers do NOT watch "style",
 *   so they are not flicker drivers. We silence their perpetual color/dir INTERVALS
 *   (to be the single authority and stop needless style churn) but we LEAVE THEIR
 *   OBSERVERS CONNECTED, because two of those observers also power unrelated
 *   features (ui_runtime → the A-/A+ text-size toolbar buttons; visual_compat →
 *   the footer compass on stale-cached-main clients). Disconnecting them would be
 *   an out-of-scope regression for zero flicker benefit.
 *
 * STRATEGY (single authoritative owner)
 *   1. clearInterval + pin to a truthy sentinel (-1) every competing INTERVAL so
 *      the origin file's `if (!window.__flag)` guard can never re-arm it — the
 *      exact pattern floyo_sticky_note_title_persist_fix.js:194-200 uses for the
 *      legacy reverter.
 *   2. Disconnect + pin ONLY the three style-watching GEOMETRY observers
 *      (surface[+owner], zoom, thin) — the engine that turns value disagreements
 *      into fast oscillation. Leave all non-style observers connected.
 *   3. Become the ONE writer of --floyo-notch-* and --floyo-sticky-notch-fill,
 *      computing geometry from node.size (graph units → zoom-INVARIANT) with the
 *      canonical formula copied verbatim from floyo_sticky_note.js:1413-1425. We
 *      do NOT depend on the main file's per-node syncOuterChrome closure being
 *      cached; we re-find the node ourselves via app.graph._nodes.
 *   4. We touch ONLY CSS variables / data-pointer-dir on the shell. We NEVER write
 *      the node title or any node property.
 *
 * We KEEP every file's injected <style> block (the clip-path / pseudo-element CSS
 * that actually paints the notch and reads the vars). Only the JS resync TIMERS
 * and the three geometry OBSERVERS are neutralized.
 *
 * Cache-bust convention: this ships as a NEW filename so it reaches already-loaded
 * browsers via an immutable edge-cached URL, and is self-sufficient regardless of
 * which other files happen to be cached on a given client.
 */

import { app } from "../../../scripts/app.js";

/* ── Theme fallback (only used if the wrapper's computed --border/--bg/--header
 *    are empty during hydration; mirrors THEMES in floyo_sticky_note.js:101-156). */
const THEMES = {
    purple: { bg: "#3A206B", header: "#2C1852", border: "#543294" },
    blue:   { bg: "#192765", header: "#101844", border: "#2E419E" },
    green:  { bg: "#002514", header: "#00170D", border: "#01341C" },
    grey:   { bg: "#222222", header: "#1A1A1A", border: "#333333" },
};
const DEFAULT_THEME = "purple";

const SENTINEL = -1;

/* ── Competing INTERVAL flags (exact, verified by grep against the cached files).
 *    All are cleared + pinned so the geometry/color/dir loops stop and cannot
 *    respawn. ─────────────────────────────────────────────────────────────────── */

/* Loops that write --floyo-notch-* geometry — the DIRECT flicker drivers. */
const GEOMETRY_TIMER_FLAGS = [
    "__floyoStickyNotchSurfaceTimer",  // notch_surface_fix.js:202 (+ owner twin shares this flag)
    "__floyoStickyZoomNotchTimer",     // zoom_notch_fix.js:198
    "__floyoStickyThinNotchTimer",     // zoom_notch_thin_outline_fix.js:97
];

/* Loops that re-stamp color/border/dir on the shell. They don't size the notch,
 * but each perpetual write mutates inline style needlessly; silence them so WE are
 * the sole authority and there is no residual style churn. (Their OBSERVERS are
 * NOT touched — see OBSERVER note below.) */
const SECONDARY_TIMER_FLAGS = [
    "__floyoStickyUnifiedNotchTimer",      // visual_unified_notch_fix.js:169 (border-triangle color writer)
    "__floyoStickyTriangleNotchTimer",     // visual_triangle_notch_fix.js:164 (border-triangle color writer)
    "__floyoStickyVisualOuterChromeTimer", // visual_outer_chrome_fix.js:119 (rotated-square color writer)
    "__floyoStickyVisualPolishTimer",      // visual_compat.js:173 (polishCompasses re-render)
    "__floyoStickyUiRuntimeFixTimer",      // ui_runtime_patch.js:190 (index-fragile syncPointerDatasets)
];

const ALL_TIMER_FLAGS = [...GEOMETRY_TIMER_FLAGS, ...SECONDARY_TIMER_FLAGS];

/* ── Competing OBSERVER flags we DISCONNECT — ONLY the three that include "style"
 *    in their attributeFilter and recompute --floyo-notch-* geometry. These are the
 *    feedback engine. (surface_fix and surface_owner_fix share ONE flag.) ───────── */
const GEOMETRY_OBSERVER_FLAGS = [
    "__floyoStickyNotchSurfaceObserver",  // notch_surface_fix.js:199 / owner_fix.js:199 (shared)
    "__floyoStickyZoomNotchObserver",     // zoom_notch_fix.js:195
    "__floyoStickyThinNotchObserver",     // zoom_notch_thin_outline_fix.js:94
];

/* Deliberately NOT disconnected (verified attributeFilter excludes "style", so
 * they are not flicker drivers, and two of them power unrelated features):
 *   __floyoStickyUnifiedNotchObserver / __floyoStickyTriangleNotchObserver /
 *   __floyoStickyVisualOuterChromeObserver  -> ["data-pointer-dir","data-theme","class"]
 *   __floyoStickyUiRuntimeFixObserver       -> childList only; ALSO installs the A-/A+
 *                                              text-size buttons (ui_runtime_patch.js:175)
 *   __floyoStickyVisualPolishObserver       -> childList only; footer-compass polish for
 *                                              stale-cached-main clients (visual_compat.js)
 * Their perpetual INTERVALS are pinned above; their childList handlers still run on
 * node-add (rare), and our own observer + poll immediately re-assert correct geometry. */

/* Clear an interval handle and pin the flag truthy so the source file's
 * `if (!window.__flag)` guard never re-creates it. */
function killTimer(flag) {
    try {
        const handle = window[flag];
        if (handle && handle !== SENTINEL) clearInterval(handle);
    } catch (_) {}
    window[flag] = SENTINEL;
}

/* Disconnect a competing observer and pin its flag truthy so the source file's
 * `if (window.__obs) return` / `if (!window.__obs)` guard never re-observes. */
function killObserver(flag) {
    try {
        const obs = window[flag];
        if (obs && obs !== SENTINEL && typeof obs.disconnect === "function") {
            obs.disconnect();
        }
    } catch (_) {}
    window[flag] = SENTINEL;
}

function silenceCompetingWriters() {
    ALL_TIMER_FLAGS.forEach(killTimer);
    GEOMETRY_OBSERVER_FLAGS.forEach(killObserver);
}

/* ── Canonical geometry (copied verbatim from floyo_sticky_note.js:1413-1425). ── */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function graphNodes() {
    return app?.graph?._nodes || window.comfy?.app?.graph?._nodes || [];
}

/* Resolve the LiteGraph node behind a sticky wrapper so we can read node.size
 * (graph units → constant at every zoom). We re-find it ourselves rather than
 * relying on the main file's per-node closure (which may or may not be cached). */
function findNodeForWrapper(wrapper) {
    for (const node of graphNodes()) {
        const widgets = node.widgets || [];
        for (const w of widgets) {
            if (w.element === wrapper) return node;
        }
    }
    return null;
}

/* Write a CSS var only if it actually changed. This is the key to idempotency:
 * an unchanged setProperty still emits an attribute mutation record, so a no-op
 * write would re-wake any surviving observer. Skipping no-ops means our own sync
 * cannot self-oscillate. */
function setVar(shell, name, value) {
    const next = String(value).trim();
    if (shell.style.getPropertyValue(name).trim() !== next) {
        shell.style.setProperty(name, next);
    }
}

/* THE single authoritative write. Geometry from node.size (zoom-invariant);
 * color/border/dir from the model (THEMES) preferring the wrapper's computed
 * theme vars when present. */
function writeNotch(wrapper, shell, node) {
    // --- geometry: graph units, never getBoundingClientRect() ---
    let ref = 240;
    if (node && Array.isArray(node.size)) {
        const nodeWidth = node.size[0] || 320;
        const nodeHeight = node.size[1] || 240;
        ref = Math.min(nodeWidth, nodeHeight);
    }
    const base = Math.round(clamp(ref * 0.13, 30, 50));
    const reach = Math.round(clamp(ref * 0.075, 17, 30));

    // --- direction: prefer the model, fall back to the wrapper dataset ---
    const dir =
        (node?.properties?.pointerDir) ||
        wrapper.dataset.pointerDir ||
        "";

    // --- color: prefer the model theme, then the wrapper's computed theme vars ---
    const t = THEMES[node?.properties?.theme] || THEMES[DEFAULT_THEME];
    let border = t.border;
    let bg = t.bg;
    let header = t.header;
    try {
        const cs = getComputedStyle(wrapper);
        const cBorder = cs.getPropertyValue("--border").trim();
        const cBg = cs.getPropertyValue("--bg").trim();
        const cHeader = cs.getPropertyValue("--header").trim();
        if (cBorder) border = cBorder;
        if (cBg) bg = cBg;
        if (cHeader) header = cHeader;
    } catch (_) {}

    // fill matches floyo_sticky_note.js:1421 exactly: header for "up", body bg
    // otherwise. header/bg always resolve truthy via the theme fallback, so there
    // is no header<->bg ping-pong like the empty-prone computed-only branches.
    const fill = dir === "up" ? header : bg;

    // --- write (CSS vars + data-pointer-dir only; never title / properties) ---
    shell.classList.add("floyo-sticky-node-shell");
    if (shell.dataset.pointerDir !== dir) shell.dataset.pointerDir = dir;
    setVar(shell, "--floyo-sticky-border", border);
    setVar(shell, "--floyo-sticky-bg", bg);
    setVar(shell, "--floyo-sticky-notch-fill", fill);
    setVar(shell, "--floyo-notch-base", `${base}px`);
    setVar(shell, "--floyo-notch-reach", `${reach}px`);
    setVar(shell, "--floyo-notch-inner-base", `${Math.max(1, base - 1)}px`);
    setVar(shell, "--floyo-notch-inner-reach", `${Math.max(1, reach - 0.5)}px`);
}

/* Walk every sticky note and write the authoritative notch. */
function syncAllNotches(root = document) {
    const wrappers = new Set();
    root.querySelectorAll?.(".floyo-sticky-wrapper").forEach((w) => wrappers.add(w));
    graphNodes().forEach((node) => {
        (node.widgets || []).forEach((w) => {
            if (w.element?.classList?.contains?.("floyo-sticky-wrapper")) {
                wrappers.add(w.element);
            }
        });
    });

    wrappers.forEach((wrapper) => {
        const shell = wrapper.closest(".lg-node");
        if (!shell) return;
        const node = findNodeForWrapper(wrapper);
        writeNotch(wrapper, shell, node);
    });
}

/* ── Owner observer: a SINGLE observer that recomputes on structural / model-driven
 *    attributes (theme + dir + class) and node add/remove, NOT on "style".
 *    Excluding "style" is deliberate — our own setVar writes mutate style, so
 *    watching style would re-arm exactly the loop we are killing. Geometry that
 *    depends on node.size is kept current by the slow backstop poll below. ──────── */
function installOwnerObserver() {
    if (window.__floyoStickyNotchStabilizeObserver &&
        window.__floyoStickyNotchStabilizeObserver !== SENTINEL) {
        return;
    }
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === "attributes") {
                const target = m.target;
                if (target?.classList?.contains?.("floyo-sticky-wrapper") ||
                    target?.classList?.contains?.("lg-node")) {
                    syncAllNotches(target.parentElement || document);
                }
                continue;
            }
            m.addedNodes?.forEach((n) => {
                if (n.nodeType === Node.ELEMENT_NODE) syncAllNotches(n);
            });
        }
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        // NOTE: "style" intentionally omitted to break the feedback loop.
        attributeFilter: ["data-pointer-dir", "data-theme", "class"],
    });
    window.__floyoStickyNotchStabilizeObserver = observer;
}

/* ── Install ──────────────────────────────────────────────────────────────────
 * On every pass we (a) re-silence competitors in case a late module's top-level
 * install() / setup() re-armed a timer before ours ran, then (b) write the
 * authoritative notch. The slow 750 ms backstop poll keeps node.size-driven
 * geometry current (it also catches drag-resize) without being fast enough to
 * read as flicker, and re-pins the sentinels. */
function install() {
    silenceCompetingWriters();
    installOwnerObserver();
    syncAllNotches();

    // First-paint / late-hydration salvo (covers files that load after us
    // alphabetically: ui_runtime + every visual_*).
    [0, 50, 250, 1000].forEach((d) => setTimeout(() => {
        silenceCompetingWriters();
        syncAllNotches();
    }, d));

    if (!window.__floyoStickyNotchStabilizeTimer ||
        window.__floyoStickyNotchStabilizeTimer === SENTINEL) {
        window.__floyoStickyNotchStabilizeTimer = setInterval(() => {
            silenceCompetingWriters(); // keep competitors dead if a stale module respawns
            syncAllNotches();          // backstop the observer + track resize; idempotent via setVar()
        }, 750);
    }
}

app.registerExtension({
    name: "Floyo.StickyNote.NotchStabilizeFix",
    async setup() {
        install();
    },
});
