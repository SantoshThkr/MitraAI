# MitraAI Development Instructions

## Project context

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Fastify + TypeScript
- Database: PostgreSQL + Prisma
- Vector search: pgvector
- Local AI: Ollama
- Embeddings: local embedding model
- Testing: Vitest
- Infrastructure: Docker Compose

Use technologies from this stack only when the current task requires them. Do not add LangChain, LlamaIndex, Redis, Pinecone, microservices, Kubernetes, or other infrastructure unless explicitly requested.

## Development rules

- Inspect the existing code before making changes.
- Implement only the requested scope.
- Reuse existing components, utilities, hooks, services, types, and configuration where practical.
- Prefer simple, focused implementations. Do not add speculative features, unnecessary abstractions, dependencies, files, or duplicate utilities/services.
- Do not refactor unrelated code or redesign the UI unless requested.
- Do not create fake data, APIs, responses, success states, or hardcoded secrets.
- Keep environment-specific values in environment variables.
- Keep business logic outside React components and keep route handlers thin.
- Validate inputs at system boundaries and surface errors clearly.
- Remove unused code, imports, variables, types, comments, and dependencies.
- Add comments only when they clarify non-obvious behavior.
- Preserve existing behavior unless the requested change requires otherwise.

## Completion requirements

- Run the relevant existing typecheck, lint, build, and test commands for the changed code.
- Never claim validation passed unless the command was actually run.
- Review the final diff for unnecessary changes and remove unnecessary code before finishing.
