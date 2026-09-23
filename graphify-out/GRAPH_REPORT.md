# Graph Report - MitraAI  (2026-09-22)

## Corpus Check
- 52 files · ~18,072 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .css 2, .example 1)

## Summary
- 328 nodes · 535 edges · 27 communities (18 shown, 9 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6be117d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- package.json
- compilerOptions
- models.py
- devDependencies
- conversations.py
- auth.py
- deps.py
- What You Must Do When Invoked
- test_auth.py
- test_conversations.py
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- MitraAI Development Instructions
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- React + Vite
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Conversation` - 14 edges
3. `User` - 13 edges
4. `Dashboard()` - 12 edges
5. `What You Must Do When Invoked` - 12 edges
6. `Base` - 10 edges
7. `/graphify` - 10 edges
8. `_start_session()` - 9 edges
9. `Message` - 9 edges
10. `signup()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `_start_session()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/db/models.py
- `signup()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/db/models.py
- `login()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/db/models.py
- `logout()` --uses--> `UserSession`  [INFERRED]
  backend/app/api/auth.py → backend/app/db/models.py
- `me()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/db/models.py

## Import Cycles
- None detected.

## Communities (27 total, 9 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.08
Nodes (40): react, react-dom, App(), Results(), ResultsProps, GEMINI_API_URL, THEME_STORAGE_KEY, AuthForm() (+32 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (28): dependencies, react, react-dom, tailwindcss, @tailwindcss/vite, name, private, scripts (+20 more)

### Community 2 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+9 more)

### Community 3 - "models.py"
Cohesion: 0.12
Nodes (25): asyncio, do_run_migrations(), run_migrations_online(), Base, Conversation, Message, TimestampMixin, User (+17 more)

### Community 4 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+4 more)

### Community 5 - "conversations.py"
Cohesion: 0.12
Nodes (23): alembic, create_conversation(), create_message(), delete_conversation(), get_conversation(), list_conversations(), list_messages(), CurrentUser (+15 more)

### Community 6 - "auth.py"
Cohesion: 0.13
Nodes (25): login(), logout(), me(), CurrentUser, get, post, Request, SessionDep (+17 more)

### Community 7 - "deps.py"
Cohesion: 0.10
Nodes (18): AsyncSession, get_current_user(), get_owned_conversation(), CurrentUser, Request, SessionDep, Settings, get_session() (+10 more)

### Community 8 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 10 - "test_auth.py"
Cohesion: 0.33
Nodes (10): TestClient, test_duplicate_signup_is_rejected(), test_login_fails_for_unknown_email(), test_login_fails_with_wrong_password(), test_login_succeeds_with_correct_password(), test_logout_invalidates_the_session(), test_me_requires_authentication(), test_me_returns_authenticated_user() (+2 more)

### Community 11 - "test_conversations.py"
Cohesion: 0.42
Nodes (10): create_conversation(), TestClient, test_conversation_crud(), test_conversation_endpoints_require_authentication(), test_data_persists_across_sessions(), test_invalid_message_role_is_rejected(), test_invalid_uuid_is_rejected(), test_messages_are_stored_and_paginated() (+2 more)

### Community 12 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 13 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 14 - "MitraAI Development Instructions"
Cohesion: 0.40
Nodes (4): Completion requirements, Development rules, MitraAI Development Instructions, Project context

### Community 15 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 16 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 17 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 18 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **101 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 154 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `api.ts` to `package.json`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `Conversation` (e.g. with `create_conversation()` and `get_conversation()`) actually correct?**
  _`Conversation` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `User` (e.g. with `login()` and `me()`) actually correct?**
  _`User` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08408163265306122 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07956989247311828 - nodes in this community are weakly interconnected._