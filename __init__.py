"""
Floyo Sticky Note — ComfyUI custom node package.

Exposes the `web/` directory so ComfyUI auto-loads the frontend widget JS.
"""

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# ComfyUI reads this attribute and serves the folder under /extensions/<name>/.
# Our JS lives at web/js/floyo_sticky_note.js and gets auto-loaded on startup.
WEB_DIRECTORY = "./web"

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
