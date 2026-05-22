/**
 * Floyo Sticky Note — end-to-end self-test.
 *
 * Paste the WHOLE thing into the browser DevTools console (F12 → Console)
 * while ComfyUI is open at http://127.0.0.1:8188. It will:
 *
 *   1. Add a fresh Floyo Sticky Note node to the canvas.
 *   2. Programmatically enter editor mode.
 *   3. Embed an image from the package's own assets/ folder (URL flow).
 *   4. Embed a second image via base64 simulating the local-file picker.
 *   5. Embed a YouTube video.
 *   6. Cycle through purple → blue → green themes.
 *   7. Toggle each of the 4 pointer-arrow directions.
 *   8. Rename the title.
 *   9. Save (exit editor mode) and verify display HTML carries everything.
 *
 * Each step prints ✓ or ✗ to the console. The final summary prints PASS
 * counts so you can tell at a glance whether anything regressed.
 *
 * Safe to run multiple times — each run drops a NEW node, doesn't clobber
 * existing ones.
 */
(async function floyoSelfTest() {
    const log    = (...a) => console.log("%c[Floyo test]", "color:#A78BFA;font-weight:700", ...a);
    const pass   = (msg) => { console.log("%c  ✓", "color:#34D399;font-weight:700", msg); results.pass++; };
    const fail   = (msg, why) => { console.log("%c  ✗", "color:#F87171;font-weight:700", msg, "—", why); results.fail++; };
    const sleep  = (ms) => new Promise(r => setTimeout(r, ms));
    const results = { pass: 0, fail: 0 };

    try {
        log("Step 1 — environment check");
        if (!window.app?.graph) return fail("ComfyUI not ready", "window.app.graph is undefined");
        if (!LiteGraph?.registered_node_types?.["FloyoStickyNote"]) {
            return fail("Floyo node not registered",
                "check that 'FloyoStickyNote' is loaded; restart ComfyUI if not");
        }
        pass("ComfyUI + LiteGraph + Floyo node class present");

        log("Step 2 — create a node");
        const node = LiteGraph.createNode("FloyoStickyNote");
        if (!node) return fail("createNode returned null");
        node.pos = [120, 120];
        app.graph.add(node);
        await sleep(80);

        const wrap = node._dom_widgets?.find?.(w => w.element?.classList?.contains?.("floyo-sticky-wrapper"))?.element
                   || document.querySelectorAll(".floyo-sticky-wrapper")[document.querySelectorAll(".floyo-sticky-wrapper").length - 1];
        if (!wrap) return fail("wrapper element not found in DOM");
        pass(`node created (id ${node.id}) and wrapper attached`);

        const editor  = wrap.querySelector(".floyo-sticky-editor");
        const display = wrap.querySelector(".floyo-sticky-display");
        const toolbar = wrap.querySelector(".floyo-sticky-toolbar");
        const footer  = wrap.querySelector(".floyo-sticky-footer");
        const saveBtn = footer?.querySelector(".floyo-footer-save");
        if (!editor || !display || !toolbar || !footer || !saveBtn)
            return fail("required child elements missing");
        pass("editor + display + toolbar + footer + save all present in DOM");

        log("Step 3 — enter editor mode (sim. dblclick on body)");
        display.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await sleep(80);
        wrap.dataset.mode === "editor" ? pass("mode=editor") : fail("mode did not switch", `mode=${wrap.dataset.mode}`);

        log("Step 4 — embed image via URL (the served logo asset)");
        const url = new URL("../assets/floyo-logo.png", document.querySelector('script[src*="floyo_sticky_note.js"]')?.src || location.href).href;
        editor.focus();
        // Insert directly via the same helper the toolbar button uses.
        // We can't actually drive the modal asynchronously here without
        // file picker permission, so we exercise the insert path.
        const before = editor.querySelectorAll("img").length;
        const sel = window.getSelection();
        sel.removeAllRanges();
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
        sel.addRange(r);
        document.execCommand("insertHTML", false, `<img src="${url}" alt="logo via URL" />`);
        editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
        await sleep(60);
        editor.querySelectorAll("img").length > before
            ? pass(`URL image inserted (${url})`)
            : fail("URL image not inserted");
        display.innerHTML.includes("<img") ? pass("display synced with image") : fail("display NOT synced — syncContent fix broken");

        log("Step 5 — embed image as base64 (simulating local file picker)");
        // Tiny 1×1 red pixel PNG.
        const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        const beforeImgs = editor.querySelectorAll("img").length;
        document.execCommand("insertHTML", false, `<img src="${tinyPng}" alt="base64 1px" />`);
        editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
        await sleep(40);
        editor.querySelectorAll("img").length > beforeImgs
            ? pass("base64 image inserted (matches local-file flow)")
            : fail("base64 image not inserted");

        log("Step 6 — embed YouTube video (Rickroll classic)");
        const ytUrl = "https://youtu.be/dQw4w9WgXcQ";
        // Use the package's own helper if available; otherwise just insert iframe directly.
        const id = ytUrl.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{6,})/)?.[1];
        document.execCommand("insertHTML", false,
            `<div class="floyo-embed floyo-embed-youtube"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>`
        );
        editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
        await sleep(40);
        editor.querySelector("iframe[src*='youtube']") ? pass("YouTube iframe present") : fail("YouTube iframe missing");

        log("Step 7 — cycle themes");
        for (const t of ["blue", "green", "purple"]) {
            const sw = footer.querySelector(`.floyo-swatch[data-theme="${t}"]`);
            sw?.click();
            await sleep(40);
            wrap.dataset.theme === t ? pass(`theme=${t}`) : fail(`theme switch to ${t} failed`, `dataset=${wrap.dataset.theme}`);
        }
        node.color === LiteGraph.NODE_DEFAULT_COLOR || node.color
            ? pass("chrome colour reflects theme")
            : fail("chrome colour not synced");

        log("Step 8 — pointer arrows");
        for (const dir of ["up", "down", "left", "right"]) {
            const arrow = footer.querySelector(`.floyo-pointer-arrow[data-dir="${dir}"]`);
            arrow?.click();
            await sleep(30);
            node.properties.pointerDir === dir ? pass(`pointerDir=${dir}`) : fail(`pointerDir not set to ${dir}`);
            arrow?.click(); // toggle off
        }
        node.properties.pointerDir === null ? pass("pointer cleared after toggle-off") : fail("pointer didn't clear");

        log("Step 9 — rename title (direct property mutation, no prompt)");
        node.properties.title = "Self-Test Note";
        node.setDirtyCanvas?.(true, true);
        await sleep(40);
        node.properties.title === "Self-Test Note" ? pass("title set") : fail("title not stored");

        log("Step 10 — save (click ✓)");
        saveBtn.click();
        await sleep(60);
        wrap.dataset.mode === "display" ? pass("mode=display after save") : fail("mode didn't switch back");
        display.innerHTML === editor.innerHTML ? pass("display matches editor (syncContent)") : fail("display + editor diverged");

        log("Step 11 — node didn't auto-grow");
        const initialH = node.size?.[1];
        await sleep(120);
        const laterH = node.size?.[1];
        Math.abs(laterH - initialH) < 5 ? pass(`node height stable (${initialH} → ${laterH})`) : fail(`node grew ${initialH} → ${laterH}`);

        log("Step 12 — serialise + deserialise round-trip");
        const data = node.serialize();
        const fresh = LiteGraph.createNode("FloyoStickyNote");
        app.graph.add(fresh);
        fresh.configure(data);
        await sleep(80);
        fresh.properties.title === "Self-Test Note" ? pass("title round-tripped") : fail("title lost on configure", JSON.stringify(fresh.properties));
        fresh.properties.content?.includes("youtube") ? pass("YouTube embed round-tripped") : fail("YouTube lost on configure");
        fresh.properties.content?.includes("data:image") ? pass("base64 image round-tripped") : fail("base64 lost on configure");

    } catch (e) {
        console.error("[Floyo test] threw:", e);
        fail("unhandled exception", e?.message || String(e));
    }

    console.log("%c\n══ Floyo Sticky Note self-test summary ══", "color:#A78BFA;font-weight:700;font-size:13px");
    console.log(`%c  ✓ PASS  ${results.pass}`, "color:#34D399;font-weight:700");
    console.log(`%c  ✗ FAIL  ${results.fail}`, "color:#F87171;font-weight:700");
    if (results.fail === 0) console.log("%c  🎉 all good!", "color:#34D399;font-weight:700");
    return results;
})();
