"""
Floyo Sticky Note — backend node definition.

This is a canvas-only documentation node. It carries no inputs, no outputs,
and never participates in the workflow execution graph. All of its behavior
(rich-text editing, themes, fonts, minimize, etc.) lives in
`web/js/floyo_sticky_note.js`. The Python side exists only so ComfyUI
recognises and registers the node, and so its serialized state can be
restored when the workflow is reloaded.
"""

from __future__ import annotations


class FloyoStickyNote:
    """A stylised sticky note for documenting Floyo ComfyUI workflows on the canvas."""

    # No inputs — this node is purely a canvas artifact.
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    # No outputs — the prompt queue will skip this node entirely because
    # nothing depends on it.
    RETURN_TYPES: tuple = ()
    RETURN_NAMES: tuple = ()
    FUNCTION = "noop"
    CATEGORY = "Floyo/Notes"

    # Tell ComfyUI we don't need to be re-executed on workflow changes.
    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):  # noqa: D401
        return False

    @classmethod
    def VALIDATE_INPUTS(cls, *args, **kwargs):  # noqa: D401
        return True

    def noop(self):
        """No-op: the node never actually runs."""
        return ()


NODE_CLASS_MAPPINGS = {
    "FloyoStickyNote": FloyoStickyNote,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "FloyoStickyNote": "📝 Floyo Sticky Note",
}
