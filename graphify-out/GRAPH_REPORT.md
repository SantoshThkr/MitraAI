# Graph Report - MitraAI  (2026-09-23)

## Corpus Check
- 58 files · ~21,484 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .css 2, .example 1)

## Summary
- 445 nodes · 848 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1138f41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- package.json
- compilerOptions
- test_documents.py
- devDependencies
- conversations.py
- test_rag.py
- auth.py
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
- documents.py
- conftest.py

## God Nodes (most connected - your core abstractions)
1. `upload()` - 16 edges
2. `compilerOptions` - 16 edges
3. `chat()` - 14 edges
4. `Conversation` - 14 edges
5. `OllamaError` - 14 edges
6. `Dashboard()` - 14 edges
7. `User` - 13 edges
8. `Base` - 12 edges
9. `What You Must Do When Invoked` - 12 edges
10. `Message` - 11 edges

## Surprising Connections (you probably didn't know these)
- `signup()` --uses--> `SignupRequest`  [INFERRED]
  backend/app/api/auth.py → backend/app/schemas.py
- `login()` --uses--> `LoginRequest`  [INFERRED]
  backend/app/api/auth.py → backend/app/schemas.py
- `list_conversations()` --uses--> `Conversation`  [INFERRED]
  backend/app/api/conversations.py → backend/app/db/models.py
- `create_conversation()` --uses--> `Conversation`  [INFERRED]
  backend/app/api/conversations.py → backend/app/db/models.py
- `get_conversation()` --uses--> `Conversation`  [INFERRED]
  backend/app/api/conversations.py → backend/app/db/models.py

## Import Cycles
- None detected.

## Communities (28 total, 8 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.08
Nodes (46): react, react-dom, App(), Results(), ResultsProps, THEME_STORAGE_KEY, AuthForm(), AuthFormProps (+38 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (28): dependencies, react, react-dom, tailwindcss, @tailwindcss/vite, name, private, scripts (+20 more)

### Community 2 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+9 more)

### Community 3 - "test_documents.py"
Cohesion: 0.08
Nodes (46): Settings, get_session(), AsyncSession, OllamaError, Raised with a message that is safe to show to the client., Chunk, chunk_pages(), embed_texts() (+38 more)

### Community 4 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+4 more)

### Community 5 - "conversations.py"
Cohesion: 0.11
Nodes (37): chat(), events(), create_conversation(), create_message(), delete_conversation(), _event(), get_conversation(), list_conversations() (+29 more)

### Community 6 - "test_rag.py"
Cohesion: 0.15
Nodes (28): failing_ollama(), fake_stream(), fake_ollama(), fake_stream(), new_conversation(), parse_events(), fixture, MonkeyPatch (+20 more)

### Community 7 - "auth.py"
Cohesion: 0.10
Nodes (42): login(), logout(), me(), CurrentUser, get, post, Request, SessionDep (+34 more)

### Community 8 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 10 - "test_auth.py"
Cohesion: 0.14
Nodes (14): health(), get, TestClient, test_duplicate_signup_is_rejected(), test_login_fails_for_unknown_email(), test_login_fails_with_wrong_password(), test_login_succeeds_with_correct_password(), test_logout_invalidates_the_session() (+6 more)

### Community 11 - "test_conversations.py"
Cohesion: 0.36
Nodes (11): create_conversation(), TestClient, test_conversation_crud(), test_conversation_endpoints_require_authentication(), test_data_persists_across_sessions(), test_invalid_message_role_is_rejected(), test_invalid_uuid_is_rejected(), test_messages_are_stored_and_paginated() (+3 more)

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

### Community 25 - "documents.py"
Cohesion: 0.21
Nodes (14): delete_document(), list_documents(), CurrentUser, delete, get, post, SessionDep, UUID (+6 more)

### Community 27 - "conftest.py"
Cohesion: 0.07
Nodes (21): alembic, asyncio, do_run_migrations(), run_migrations_online(), client(), database(), fake_embeddings(), fake_embed() (+13 more)

## Knowledge Gaps
- **103 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 178 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `api.ts` to `package.json`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `OllamaError` connect `test_documents.py` to `conversations.py`, `test_rag.py`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `chat()` (e.g. with `Message` and `OllamaError`) actually correct?**
  _`chat()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `Conversation` (e.g. with `create_conversation()` and `get_conversation()`) actually correct?**
  _`Conversation` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `OllamaError` (e.g. with `chat()` and `failing_ollama()`) actually correct?**
  _`OllamaError` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._