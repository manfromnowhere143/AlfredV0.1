# Alfred Multi-File Preview System: State-of-the-Art Research Prompt

## Mission Statement
Design a next-generation multi-file building and universal preview system for Alfred that matches the sophistication of CodeSandbox, StackBlitz, and Bolt.new while surpassing them with universal visualization capabilities for any file type (React, Python, agents, data pipelines, etc.).

---

## Part 1: Current Architecture Analysis

### 1.1 Artifact Storage (`apps/web/src/lib/artifacts.ts`)
```typescript
// Current: Single-file artifacts with version tracking
export async function saveArtifact(convId: string, msgId: string | null, code: string, lang: string, name: string) {
  const ver = existing.length > 0 ? existing[0].version + 1 : 1;
  await db.insert(artifacts).values({
    conversationId: convId,
    messageId: msgId,
    code,        // <-- SINGLE code string
    language: lang,
    title: name,
    version: ver
  });
}
```

### 1.2 Preview System (`apps/web/src/components/Message.tsx`)
```typescript
// Current: CDN-based single-file preview
function generatePreviewHTML(code: string, language: string): string {
  // Strips all imports
  const cleanCode = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');

  // Uses CDN scripts for React, Tailwind, Babel
  return `<!DOCTYPE html>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    ...
  `;
}

// Rendered in sandboxed iframe
<iframe srcDoc={previewHTML} sandbox="allow-scripts allow-same-origin" />
```

### 1.3 Project Generation (`packages/deploy/src/transformer/project-generator.ts`)
```typescript
// Deployment: Full multi-file Vite project generation
export function generateProject(artifact: ParsedArtifact, projectName: string): GeneratedProject {
  const files: ProjectFile[] = [];
  files.push(generatePackageJson(...));
  files.push(generateViteConfig(...));
  files.push(generateIndexHtml(...));
  files.push(generateMainEntry(...));
  files.push(generateComponentFile(...));
  files.push(generateAppWrapper(...));
  // ... Tailwind, TypeScript configs, etc.
  return { files, framework: 'vite-react', buildCommand: 'npm run build', ... };
}
```

### 1.4 Current Flow Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CURRENT ALFRED FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User Prompt ──▶ LLM ──▶ Single Code Block ──▶ artifacts table         │
│                              │                       │                  │
│                              ▼                       ▼                  │
│                    ┌─────────────────┐      ┌──────────────────┐       │
│                    │ CDN Preview     │      │ Deploy Transform │       │
│                    │ (strips imports)│      │ (multi-file gen) │       │
│                    │     ▼           │      │      ▼           │       │
│                    │   iframe        │      │   Vercel API     │       │
│                    │   srcdoc        │      │                  │       │
│                    └─────────────────┘      └──────────────────┘       │
│                                                                         │
│  LIMITATION: Preview ≠ Deployment structure                            │
│  LIMITATION: No multi-file editing or preview                          │
│  LIMITATION: Only React/HTML supported                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: State-of-the-Art Technologies

### 2.1 In-Browser Bundling

#### ESBuild-WASM
- **Speed**: 10-100x faster than Webpack
- **In-browser**: `esbuild-wasm` package runs entirely in browser
- **Virtual FS plugins**: Can bundle from in-memory file systems
```typescript
import * as esbuild from 'esbuild-wasm';

await esbuild.initialize({ wasmURL: 'esbuild.wasm' });
const result = await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  write: false,
  plugins: [virtualFsPlugin(files)], // Custom plugin for memfs
});
```

#### SWC-WASM
- Rust-based compiler, also available as WASM
- Used by Next.js, faster than Babel
- `@swc/wasm-web` for browser usage

### 2.2 Virtual File Systems

#### memfs
```typescript
import { createFsFromVolume, Volume } from 'memfs';

const vol = new Volume();
vol.fromJSON({
  '/src/index.tsx': 'import App from "./App";\nrender(<App />);',
  '/src/App.tsx': 'export default () => <div>Hello</div>',
  '/package.json': '{"dependencies": {"react": "18"}}',
});
const fs = createFsFromVolume(vol);
```

#### BrowserFS / ZenFS
- Full POSIX-like filesystem in browser
- Multiple backends: IndexedDB, localStorage, in-memory

### 2.3 CDN-Based Import Resolution

#### esm.sh
```typescript
// Runtime npm package resolution
import React from 'https://esm.sh/react@18';
import { motion } from 'https://esm.sh/framer-motion';
```

#### Import Maps
```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react-dom": "https://esm.sh/react-dom@18",
    "framer-motion": "https://esm.sh/framer-motion"
  }
}
</script>
```

### 2.4 Sandpack (CodeSandbox)
```typescript
import { Sandpack } from '@codesandbox/sandpack-react';

<Sandpack
  files={{
    '/App.js': 'export default () => <h1>Hello</h1>',
    '/index.js': 'import App from "./App"; render(<App />)',
  }}
  template="react"
  options={{ showConsole: true, showTabs: true }}
/>
```

Features:
- Multi-file editing
- Live preview with HMR
- Console output
- Dependency management
- Multiple templates (React, Vue, Vanilla, etc.)

### 2.5 WebContainers (StackBlitz)
```typescript
import { WebContainer } from '@webcontainer/api';

const container = await WebContainer.boot();
await container.mount({
  'src': {
    directory: {
      'index.ts': { file: { contents: '...' } },
      'App.tsx': { file: { contents: '...' } },
    }
  },
  'package.json': { file: { contents: '...' } },
});

const install = await container.spawn('npm', ['install']);
await install.exit;
const dev = await container.spawn('npm', ['run', 'dev']);
```

Features:
- Full Node.js runtime in browser
- Real npm install
- Real dev server with HMR
- File system persistence

### 2.6 Universal Visualization

#### Pyodide (Python in Browser)
```typescript
import { loadPyodide } from 'pyodide';

const pyodide = await loadPyodide();
await pyodide.loadPackage(['numpy', 'pandas', 'matplotlib']);

const result = await pyodide.runPythonAsync(`
  import matplotlib.pyplot as plt
  plt.plot([1, 2, 3], [1, 4, 9])
  plt.savefig('/output.png')
`);
```

#### Mermaid (Diagrams)
```typescript
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: true });
const { svg } = await mermaid.render('graph', `
  graph TD
    A[Start] --> B[Process]
    B --> C[End]
`);
```

#### React Flow (Node-Based Visualization)
```typescript
import ReactFlow from 'reactflow';

// Visualize any graph structure: agents, pipelines, workflows
<ReactFlow nodes={nodes} edges={edges} />
```

---

## Part 3: Design Requirements

### 3.1 Multi-File Project Structure (From Start)
The LLM should generate projects with proper file structure from the beginning:

```typescript
interface AlfredProject {
  id: string;
  name: string;
  files: Map<string, ProjectFile>;
  entryPoint: string;
  framework: 'react' | 'vue' | 'python' | 'node' | 'agent' | 'custom';
  dependencies: Record<string, string>;
  visualizationType: 'web' | 'terminal' | 'diagram' | 'data' | 'agent-flow';
}

interface ProjectFile {
  path: string;           // e.g., '/src/components/Header.tsx'
  content: string;
  language: string;
  lastModified: Date;
  isEntryPoint?: boolean;
}
```

### 3.2 Universal Visualization Strategies

| File Type | Visualization Strategy |
|-----------|----------------------|
| `.tsx/.jsx` | React preview with HMR |
| `.py` | Pyodide + matplotlib/plotly output |
| `.sql` | Table visualization with sample data |
| `.json` | Interactive JSON tree viewer |
| `.md` | Rendered markdown preview |
| `.mermaid` | Mermaid diagram render |
| `agent/*.ts` | React Flow node visualization |
| `pipeline/*.yaml` | DAG visualization |
| `.csv/.parquet` | Data table with charts |
| `.test.ts` | Test runner with results |

### 3.3 Streaming Multi-File Generation
```typescript
// Example: LLM streams file-by-file
interface StreamingFileEvent {
  type: 'file_start' | 'file_content' | 'file_end' | 'project_complete';
  path?: string;
  content?: string;
  chunk?: string;
}

// Stream: FILE_START:/src/App.tsx -> CHUNK -> CHUNK -> FILE_END -> FILE_START:/src/api/client.ts -> ...
```

### 3.4 Live Collaboration Between Files
```
┌──────────────────────────────────────────────────────────────────────────┐
│                        IDEAL MULTI-FILE PREVIEW                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐      ┌───────────────────────────────────────────┐ │
│  │ FILE EXPLORER   │      │              LIVE PREVIEW                  │ │
│  ├─────────────────┤      ├───────────────────────────────────────────┤ │
│  │ 📁 src/         │      │                                           │ │
│  │   📄 App.tsx    │◀────▶│   ┌─────────────────────────────────┐    │ │
│  │   📄 Header.tsx │      │   │                                 │    │ │
│  │   📁 api/       │      │   │   [Live React Preview]          │    │ │
│  │     📄 client.ts│      │   │                                 │    │ │
│  │   📁 utils/     │      │   │   Hot Module Replacement        │    │ │
│  │     📄 helpers.ts      │   │   on any file change            │    │ │
│  │ 📄 package.json │      │   │                                 │    │ │
│  │ 📄 tsconfig.json│      │   └─────────────────────────────────┘    │ │
│  └─────────────────┘      │                                           │ │
│                           │   Console | Network | Elements            │ │
│  ┌─────────────────┐      └───────────────────────────────────────────┘ │
│  │ CODE EDITOR     │                                                    │
│  ├─────────────────┤      ┌───────────────────────────────────────────┐ │
│  │ // App.tsx      │      │ For Python files:                         │ │
│  │ import Header.. │      │ - Pyodide execution                       │ │
│  │                 │      │ - Matplotlib/Plotly renders               │ │
│  │ export default  │      │ - Terminal output                         │ │
│  │   function App  │      │                                           │ │
│  │                 │      │ For Agent files:                          │ │
│  └─────────────────┘      │ - React Flow visualization                │ │
│                           │ - State machine diagram                   │ │
│                           └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Research Questions

### Architecture Decisions

1. **Bundler Choice**: Should Alfred use:
   - ESBuild-WASM (fast, limited plugin ecosystem)
   - Sandpack (ready-made, CodeSandbox-backed)
   - WebContainers (full Node.js, but heavier)
   - Custom hybrid approach

2. **File Storage**: How should multi-file projects be stored?
   - JSON blob in existing `artifacts` table
   - New `project_files` table with foreign key
   - Git-like object storage
   - Virtual filesystem + IndexedDB persistence

3. **Streaming Protocol**: How should LLM stream multi-file output?
   - Custom file delimiter protocol
   - JSON-LD streaming
   - Server-Sent Events with file metadata
   - Structured output with file paths

4. **Universal Preview Architecture**:
   - Single iframe with dynamic content injection
   - Multiple specialized iframes per file type
   - Web Worker-based execution for non-web files
   - Service Worker interception for module resolution

### Implementation Priorities

1. **Phase 1**: Multi-file storage and file explorer UI
2. **Phase 2**: ESBuild-WASM bundling for React projects
3. **Phase 3**: Pyodide integration for Python files
4. **Phase 4**: Agent/workflow visualization with React Flow
5. **Phase 5**: Real-time collaboration and versioning

---

## Part 5: Specific Design Tasks

Please provide detailed technical designs for:

### Task 1: Multi-File Artifact Schema
Design the database schema and TypeScript types for storing multi-file projects. Consider:
- File versioning (per-file or whole-project)
- Dependency tracking
- Framework/template detection
- Entry point specification

### Task 2: LLM Output Protocol
Design the protocol for LLM to stream multi-file projects. Consider:
- How to indicate file boundaries
- How to handle partial file edits
- How to reference existing files
- Error handling for malformed output

### Task 3: Universal Preview Engine
Design the preview engine architecture that can:
- Bundle and render React/Vue applications
- Execute Python via Pyodide
- Visualize agents/workflows via React Flow
- Handle mixed projects (e.g., Python backend + React frontend)

### Task 4: File Explorer Component
Design the file explorer UI that:
- Shows project structure
- Allows file selection for editing
- Supports drag-and-drop reordering
- Shows file status (modified, error, etc.)

### Task 5: Import Resolution Strategy
Design how imports should be resolved:
- Local file imports (relative paths)
- npm package imports (via CDN or bundler)
- Dynamic imports
- Type definitions for TypeScript

---

## Part 6: Reference Implementations

Study these open-source implementations:

1. **Sandpack**: https://github.com/codesandbox/sandpack
2. **WebContainers**: https://github.com/nicolo-ribaudo/esbuild-playground
3. **Pyodide**: https://github.com/pyodide/pyodide
4. **React Flow**: https://github.com/xyflow/xyflow
5. **Monaco Editor**: https://github.com/microsoft/monaco-editor
6. **Bolt.new**: Study their multi-file artifact streaming approach

---

## Deliverables Expected

1. **Architecture Document**: Complete system design with diagrams
2. **Database Schema**: Migration files for new tables
3. **TypeScript Types**: Full type definitions for multi-file projects
4. **Component Specifications**: React component hierarchy for new UI
5. **Protocol Specification**: LLM output format for multi-file generation
6. **Implementation Roadmap**: Phased approach with dependencies

---

## Success Criteria

The new system should:

1. ✅ Generate multi-file projects from the start (not split after)
2. ✅ Preview any file type with appropriate visualization
3. ✅ Support hot module replacement for instant feedback
4. ✅ Handle complex dependencies (npm packages, local imports)
5. ✅ Visualize non-rendered files (Python, agents, data)
6. ✅ Match or exceed Bolt.new/StackBlitz in preview quality
7. ✅ Maintain streaming performance (no blocking on file completion)
8. ✅ Support mixed-language projects (React + Python API)

---

*Generated for Alfred V0.1 - MIT/OpenAI engineering standards*
*Research prompt for Claude to design next-generation builder system*
