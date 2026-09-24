# NodePrompt

**A node-based interface for turning linear prompts into editable networks of concepts and relationships.**
**프롬프트를 문장이 아니라 관계의 그래프로 다루는 AI 인터페이스.**

<!-- TODO(여남규): 데모 GIF 또는 스크린샷 추가 - assets/ 폴더에 넣고 아래 주석을 이미지로 교체
<img src="assets/demo.gif" alt="Prompt to graph to generation" width="80%">
-->

NodePrompt explores a different way of prompting AI: instead of treating a prompt as a fixed sentence, it breaks the text into a graph that can be inspected, rearranged, edited, and used again as the structure for generation.

The core loop is:

`Prompt → Extract nodes & relationships → Edit the graph → Generate from the edited structure`

## Why

Most AI interfaces keep the logic of a prompt hidden inside a block of text. NodePrompt makes that structure visible.

A prompt is decomposed into entities, actions, concepts, risks, and the relationships between them. The resulting network becomes an intermediate design space: users can change labels, strengths, connections, and layout before asking the model to synthesize a final response.

The project treats prompting less like writing a command and more like **designing a system of relationships**.

## 한국어 요약

대부분의 AI 인터페이스는 프롬프트를 하나의 텍스트 덩어리로 취급한다. NodePrompt는 프롬프트를 개체·행위·개념·위험 노드와 그 관계로 분해해, 생성 전에 사람이 구조를 직접 보고 고칠 수 있게 만든다. 프롬프팅을 "명령문 쓰기"가 아니라 **"관계의 시스템을 설계하는 일"**로 보는 실험적 인터페이스다.

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
