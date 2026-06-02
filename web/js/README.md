# Floyo Sticky Note Frontend Files

ComfyUI serves this directory through `WEB_DIRECTORY = "./web"` and auto-loads
every `.js` file in `web/js`. File names are therefore part of runtime behavior:
they affect both browser cache keys and import order.

## File Map

| File | Role | Notes |
| --- | --- | --- |
| `floyo_sticky_note.js` | Canonical implementation | Defines and renders the `FloyoStickyNote` node. New feature work should start here. |
| `floyo_sticky_note_editor_cursor_title_fix.js` | Compatibility implementation | Forces editor text cursor behavior and preserves arbitrary note titles in cached hosted sessions. |
| `floyo_sticky_note_editor_cursor_title_final_fix.js` | Compatibility implementation | Final fresh cache-busting cursor/title persistence override. |
| `floyo_sticky_note_editor_cursor_title_owner_fix.js` | Compatibility implementation | Fresh owner-document cursor/title override for immutable cached hosted sessions. |
| `floyo_sticky_note_remote_compat.js` | Compatibility implementation | Fixes cached remote sessions for title/logo/badge behavior. |
| `floyo_sticky_note_wheel_element_guard.js` | Compatibility implementation | Earlier element-level wheel containment patch. |
| `floyo_sticky_note_wheel_scroll_guard.js` | Compatibility implementation | Stronger sticky-note scroll wheel guard. |
| `floyo_sticky_note_wheel_capture_guard.js` | Compatibility implementation | Document-level capture wheel guard. |
| `floyo_sticky_note_wheel_runtime_guard.js` | Compatibility implementation | Installs the wheel guard immediately on module import. |
| `floyo_sticky_note_ui_runtime_patch.js` | Compatibility implementation | Adds runtime UI/readability fixes for older cached modules. |
| `floyo_sticky_note_visual_compat.js` | Compatibility implementation | Applies remote visual polish for sessions with a stale main module. |
| `floyo_sticky_note_visual_footer_icons_fix.js` | Compatibility implementation | Replaces cached footer check and compass icons with exact Figma SVGs. |
| `floyo_sticky_note_visual_notch_surface_fix.js` | Compatibility implementation | Fresh hosted override for color-matched thin notch fill and outline. |
| `floyo_sticky_note_visual_notch_surface_owner_fix.js` | Compatibility implementation | Owner-document version of the thin notch override for Floyo iframe/DOM roots. |
| `floyo_sticky_note_visual_outer_chrome_fix.js` | Compatibility implementation | Final hosted override for outer border/notch when older visual modules are cached. |
| `floyo_sticky_note_visual_toolbar_undo_fix.js` | Compatibility implementation | Wraps clipped toolbar controls and keeps editor undo/redo shortcuts inside the note. |
| `floyo_sticky_note_visual_triangle_notch_fix.js` | Compatibility implementation | Replaces the cached diamond notch with outside-only triangle arrows. |
| `floyo_sticky_note_visual_unified_notch_fix.js` | Compatibility implementation | Thin final notch override that hides the shell border behind the arrow. |
| `floyo_sticky_note_visual_zero_top_line_fix.js` | Compatibility implementation | Removes stale 1px top hairlines from cached outer-chrome styles. |
| `floyo_sticky_note_visual_zoom_notch_fix.js` | Compatibility implementation | Responsive clipped-polygon notch that scales with node size and matches theme colors. |
| `floyo_sticky_note_visual_zoom_notch_thin_outline_fix.js` | Compatibility implementation | Thin, color-matched notch override for hosted sessions with cached notch CSS. |

## Naming Convention

- Use descriptive names for new canonical files: `floyo_sticky_note_<purpose>.js`.
- Keep implementation files under descriptive `floyo_sticky_note_*` names.
- Do not use `z`/`zz`/`zzz` filename prefixes for load order or cache busting.
  Names should describe what the file does.
- If a cache-busting hotfix is necessary, add a header that states:
  - why the file exists
  - what older behavior it patches
  - when it can be removed

## Cleanup Strategy

Keep this directory readable and behavior-focused:

1. Move long-term behavior into `floyo_sticky_note.js`.
2. Use a descriptive `floyo_sticky_note_<purpose>.js` file only when a separate
   compatibility module is still needed.
3. Delete compatibility modules once the main implementation no longer needs
   them.

## Deployment Safety

When copying files from macOS to the remote container, avoid AppleDouble metadata
files such as `._floyo_sticky_note.js`. ComfyUI sees `._*.js` as extension
modules and may try to import them.

Use one of these safer deployment patterns:

```sh
COPYFILE_DISABLE=1 tar -C "$repo" -cf - web/js/file.js | ssh ... "docker exec -i jacob-2 tar -xf - -C /app/comfyui-cpu-9000/custom_nodes/Floyo-Sticky-Note"
```

or direct stdin copy:

```sh
ssh ... "docker exec -i jacob-2 sh -lc 'cat > /app/comfyui-cpu-9000/custom_nodes/Floyo-Sticky-Note/web/js/file.js'" < web/js/file.js
```

After any remote copy, remove accidental metadata files before restarting:

```sh
docker exec jacob-2 sh -lc 'rm -f /app/comfyui-cpu-9000/custom_nodes/Floyo-Sticky-Note/web/js/._*.js'
```
