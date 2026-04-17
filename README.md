# Etcher-Sketchpad

A canvas-based AI interaction UI inspired by the design in `Etcher-Sketchpad-UI.pptx`.
Context for inference is built by bolting together draggable sticky notes (Q&A pairs) into chains.

## Features

- **Canvas tab** — a dotted infinite feel canvas with draggable sticky notes. Each note
  holds a single Q/A pair. Drop one note onto another to chain them — the chain becomes
  the context passed to the LLM for subsequent inference. A dashed line visualizes each
  parent→child link.
- **Sidebar chat** — double-click a sticky (or click the 🔍 icon) to open the full
  chain in a traditional chat view on the right. Continuing the chat appends a new
  linked sticky to the chain on the canvas.
- **Config tab** — switch between DeepSeek, OpenAI, and Claude; paste API keys and
  override model names. The provided DeepSeek key is preloaded.
- **Persistence** — canvas state and config persist in `localStorage`.

## Run

```bash
cd etcher-sketchpad
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173 by default).

## Interactions

| Gesture | Action |
|---|---|
| Double-click empty canvas | Add a new root sticky |
| `+` button (top-right) | Add a new root sticky |
| Drag sticky header | Move the sticky |
| Drop sticky onto another | Chain this sticky as a child of the target |
| Double-click sticky / 🔍 | Open the chain as a chat in the sidebar |
| ⎘ on sticky | Duplicate |
| ✂ on sticky | Detach from parent |
| ✕ on sticky | Delete |
| ⌘/Ctrl+Enter in composer | Send |
