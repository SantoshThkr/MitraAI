# Graph Report - MitraAI  (2026-09-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 140 nodes · 176 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18466862`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Dashboard.tsx
- package.json
- compilerOptions
- compilerOptions
- devDependencies
- index.ts
- scripts
- dependencies
- compilerOptions

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 13 edges
3. `scripts` - 11 edges
4. `Dashboard()` - 6 edges
5. `compilerOptions` - 6 edges
6. `normalizeChat()` - 4 edges
7. `normalizeChats()` - 4 edges
8. `react` - 4 edges
9. `Chat` - 3 edges
10. `Message` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard()` --indirect_call--> `normalizeChats()`  [INFERRED]
  src/features/chat/Dashboard.tsx → src/utils/chat.ts
- `Dashboard()` --calls--> `useLocalStorage()`  [EXTRACTED]
  src/features/chat/Dashboard.tsx → src/hooks/useLocalStorage.ts
- `Dashboard()` --calls--> `askGemini()`  [EXTRACTED]
  src/features/chat/Dashboard.tsx → src/services/geminiService.ts
- `Dashboard()` --calls--> `createChat()`  [EXTRACTED]
  src/features/chat/Dashboard.tsx → src/utils/chat.ts

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "Dashboard.tsx"
Cohesion: 0.14
Nodes (21): react, Results(), ResultsProps, CHAT_STORAGE_KEY, GEMINI_API_URL, SELECTED_CHAT_STORAGE_KEY, THEME_STORAGE_KEY, Dashboard() (+13 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (19): name, private, type, version, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+11 more)

### Community 2 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+9 more)

### Community 3 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+6 more)

### Community 4 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, tsx, @types/node (+6 more)

### Community 5 - "index.ts"
Cohesion: 0.16
Nodes (11): dotenv, fastify, @fastify/cors, react-dom, zod, buildServer(), environment, environmentSchema (+3 more)

### Community 6 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, build:server, dev, dev:server, lint, lint:server, preview (+3 more)

### Community 7 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, dotenv, fastify, @fastify/cors, react, react-dom, tailwindcss, @tailwindcss/vite (+1 more)

### Community 8 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

## Knowledge Gaps
- **83 isolated node(s):** `ResultsProps`, `StoredValueParser`, `GeminiResponse`, `MessageRole`, `name` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 84 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Dashboard.tsx` to `package.json`, `index.ts`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `ResultsProps`, `StoredValueParser`, `GeminiResponse` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13756613756613756 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._