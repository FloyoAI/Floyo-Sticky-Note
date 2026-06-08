<div align="center">

# 📝 Floyo Sticky Note

### Beautiful, rich‑text sticky notes for **ComfyUI** — document your workflow right on the canvas.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#-license)
[![ComfyUI](https://img.shields.io/badge/ComfyUI-custom%20node-7C3AED.svg)](https://github.com/comfyanonymous/ComfyUI)
[![Made by Floyo](https://img.shields.io/badge/made%20by-floyo.ai-2C1852.svg)](https://floyo.ai)
[![Canvas only](https://img.shields.io/badge/runtime-never%20executes-34D399.svg)](#-what-it-doesnt-do)

![Floyo Sticky Note](image.png)

</div>

> **TL;DR** — Drop a gorgeous note next to your nodes to explain *what a workflow does and why*. It has **no inputs and no outputs**, so the prompt queue skips it — it never runs, it just makes your graph readable. Think of it as a **comment block for ComfyUI**, with full rich‑text, themes, media and direction pointers.

---

## Why you'll want it

- 🧭 **Make workflows self‑explaining** — annotate steps so anyone (including future‑you) gets it at a glance.
- 🎨 **On‑brand & pretty** — 4 polished themes, pixel‑art title font, clean typography.
- 🖊️ **Real rich text** — headings, lists, code, links, images and videos — not just plain text.
- 🎯 **Point at things** — a direction notch shows *which* node a note is talking about.
- 💾 **Zero‑friction & safe** — autosaves into the workflow JSON, and **never touches execution** (no inputs/outputs, nothing to slow your runs).

---

## ✨ At a glance — everything this node does

| Area | Options |
| --- | --- |
| **States** | Display • Editor • Collapsed |
| **Headings** | H₁ • H₂ • H₃ • **P** (back to paragraph) |
| **Text size** | A− • A+ (shrink / grow selected text) |
| **Inline style** | **Bold** • *Italic* • <u>Underline</u> • ~~Strikethrough~~ • Tₓ (clear formatting) |
| **Blocks** | Code block • Bullet list • Numbered list |
| **Insert** | Image (URL) • Video (YouTube / Vimeo) • Link • Divider |
| **Themes** | 🟣 Purple (default) • 🔵 Blue • 🟢 Green • ⚫ Grey |
| **Pointer** | Direction notch — up / down / left / right |
| **Title** | Inline rename |
| **Layout** | Collapse / expand • Drag to move • Resize • Scroll inside note |
| **Clipboard** | Copy keeps the note's colour • Paste cleans to plain text |
| **Persistence** | Title, content, theme, font, pointer — all saved with the workflow |

Each option is explained in its own short section below. 👇

---

## 📦 Install

**Git (recommended)**
```bash
cd /path/to/ComfyUI/custom_nodes
git clone https://github.com/FloyoAI/Floyo-Sticky-Note.git
```
Restart ComfyUI, then add it via **Add Node → Floyo → Notes → 📝 Floyo Sticky Note**.

**Manual** — download the repo ZIP, extract into ComfyUI's `custom_nodes/`, restart.

**Update**
```bash
cd custom_nodes/Floyo-Sticky-Note && git pull
```
Restart ComfyUI and hard‑refresh the browser (`Cmd/Ctrl + Shift + R`) so the latest front‑end loads.

---

## 🚀 Quick start

1. **Add** the node to the canvas.
2. **Double‑click the body** to enter the editor.
3. Type, format with the toolbar, pick a theme.
4. **Save** with the green ✓ — or just click anywhere outside the note.

That's it. Your note is saved with the workflow.

---

## 🧰 Editor toolbar — what each button does

Open the editor (double‑click the body) and the toolbar appears at the top. Select text first, then click; for block buttons (headings, lists, code) just place the cursor on the line.

| Button | Does |
| --- | --- |
| **H₁ / H₂ / H₃** | Turn the current line into a heading (large / medium / small). |
| **P** | Turn a heading back into a normal **paragraph** (paragraph font). |
| **A− / A+** | Shrink / grow the **selected** text size, in small steps. |
| **B** | **Bold** the selection. |
| **I** | *Italic* the selection. |
| **U** | <u>Underline</u> the selection. |
| **S** | ~~Strikethrough~~ the selection. |
| **Tₓ** | Clear inline formatting from the selection. |
| **`</>`** | Wrap the line in a **code block** (monospaced). |
| **• ≡** | **Bullet** list. |
| **1 ≡** | **Numbered** list. |
| **🖼️** | Insert an **image** by URL. |
| **▶️** | Insert a **YouTube / Vimeo** video (lazy preview — the player loads only on click). |
| **🔗** | Turn the selection into a **link** (opens in a new tab). |
| **➖** | Insert a horizontal **divider** line. |

> **Tip:** clicking an active heading toggles it back to a paragraph too — the **P** button just makes that explicit.

### Working with media
Hover any inserted image/video to get a mini toolbar: **−** smaller, **+** bigger, **× Remove**. A fresh paragraph is auto‑added below media so you can keep typing.

---

## 🎛️ Footer controls

The footer shows in editor mode, left → right:

- **Floyo logo** — opens [floyo.ai](https://floyo.ai) in a new tab.
- **Theme swatches** — switch between **Purple** (default), **Blue**, **Green**, **Grey**. The whole note (title bar, body, accent, code, notch) re‑tints together.
- **Direction notch (compass)** — click **up / down / left / right** to project a triangular pointer from that edge, so readers know which node the sticky annotates. Click the same arrow again to remove it.
- **Save ✓** — saves your edits and returns to display mode.

---

## 🪟 States & gestures

| Action | Result |
| --- | --- |
| **Double‑click the body** | Enter the editor. |
| **Click the chevron** in the title bar | Collapse to just the title bar (▼ ↔ ▶) — great when the canvas is crowded. |
| **Double‑click the title bar** | Rename the note inline. |
| **Drag the title bar** | Move the note (standard LiteGraph). |
| **Drag the bottom‑right corner** | Resize; the content reflows. |
| **Scroll inside the note** | Scrolls the note's content instead of zooming the canvas. |
| **Click outside the note** | Saves and exits the editor. |

### Clipboard
- **Copy** from a note keeps the note's **text colour**, so it stays readable when pasted into other rich‑text apps (instead of turning black).
- **Paste** into a note is cleaned to **plain text**, so it picks up the note's styling instead of dragging in foreign formatting.

---

## 💾 Saving & persistence

Everything is stored with the workflow JSON under a single `floyo_state` key:

```jsonc
{
  "floyo_state": {
    "title":      "K‑Sampler settings",
    "content":    "<h1>…</h1><p>…</p>",
    "theme":      "purple",
    "font":       "Default",
    "pointerDir": "down"
  }
}
```

Reload the workflow and the note returns exactly as you left it.

---

## 🧩 What it *doesn't* do

This node is **purely documentation**. It has **no inputs, no outputs**, contributes nothing to the prompt queue, and produces no images/latents/tensors. It's the ComfyUI equivalent of a code comment — for the humans, invisible to the run‑time graph.

---

## 🛠️ Troubleshooting

| Problem | Fix |
| --- | --- |
| Node missing from the Add‑Node menu | Make sure the folder is a **direct child** of `custom_nodes/`, then check ComfyUI's terminal for import errors. |
| Note looks plain / unstyled or behaves oddly | Your browser cached old front‑end JS. **Hard‑refresh** (`Cmd/Ctrl + Shift + R`). |
| Video shows "unavailable" | That video disabled embedding — open the original URL on YouTube/Vimeo. |

---

## 🤝 Contributing

Issues and PRs are welcome.

1. Fork the repo and create a branch.
2. The front‑end lives in `web/js/`; the (no‑op) Python class is in `nodes.py`.
3. Keep changes focused, test in a real ComfyUI canvas, and hard‑refresh before verifying.
4. Open a pull request describing the change.

---

## 📄 License

Released under the **MIT License** — see [`LICENSE`](LICENSE).

---

<div align="center">

**Built with care by [Floyo](https://floyo.ai) 💜**

Copyright © Floyo — [floyo.ai](https://floyo.ai)

</div>
