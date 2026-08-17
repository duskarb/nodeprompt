# NodePrompt

**A node-based interface for turning linear prompts into editable networks of concepts and relationships.**

NodePrompt explores a different way of prompting AI: instead of treating a prompt as a fixed sentence, it breaks the text into a graph that can be inspected, rearranged, edited, and used again as the structure for generation.

The core loop is:

`Prompt → Extract nodes & relationships → Edit the graph → Generate from the edited structure`

## Why

Most AI interfaces keep the logic of a prompt hidden inside a block of text. NodePrompt makes that structure visible.

A prompt is decomposed into entities, actions, concepts, risks, and the relationships between them. The resulting network becomes an intermediate design space: users can change labels, strengths, connections, and layout before asking the model to synthesize a final response.

The project treats prompting less like writing a command and more like **designing a system of relationships**.

## What it does

- Extracts key concepts and relationships from an input prompt with Gemini
- Visualizes the result as an interactive node graph
- Distinguishes directed and undirected relationships
- Encodes node/edge strength as editable graph properties
- Lets users add, remove, connect, rename, and reorganize nodes
- Supports multiple automatic graph layouts, including a radial layout
- Generates a new AI response from the edited graph rather than only the original prompt
- Highlights graph elements in relation to generated text
- Exports the graph as PNG
- Supports light/dark themes and responsive layouts

## Interaction model

```text
Linear language
      ↓
AI extraction
      ↓
Nodes + edges
      ↓
Human editing
      ↓
Structured graph
      ↓
AI synthesis
```

The important part is the middle step: the user can intervene in the representation before generation happens again.

## Graph model

Nodes contain:

- `label`
- `type`
- `mentions`
- `strength`

Edges contain:

- `source`
- `target`
- `label`
- `strength`
- `isDirected`

The extraction system currently uses four node categories: `entity`, `action`, `concept`, and `risk`.

## Tech

- React 19
- TypeScript
- Vite
- XYFlow / React Flow
- Dagre
- Google Gemini API
- Motion
- Tailwind CSS
- html-to-image

## Run locally

### Prerequisites

- Node.js
- Gemini API key

### Setup

```bash
npm install
```

Create `.env.local` and add:

```bash
GEMINI_API_KEY=your_api_key
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Project structure

```text
src/
├── App.tsx                 # main graph interaction and generation flow
├── components/             # custom nodes and graph edges
└── lib/
    ├── gemini.ts           # graph extraction + final response generation
    ├── flow-utils.ts       # graph layout utilities
    └── utils.ts
```

## Status

Experimental interface / design prototype.

NodePrompt is primarily an exploration of **non-linear prompting**: making the relationships inside language visible and editable before asking AI to respond.
