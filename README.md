# Database Schema Visualizer

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> A PostgreSQL IDE that explains your schema, optimizes your queries, and never sends data to the cloud.

A production-grade PostgreSQL IDE for schema exploration, SQL development, and query optimization. Entity-relationship diagrams with React Flow, a Monaco editor with live schema autocomplete, visual EXPLAIN plan trees, and AI-powered index suggestions via local Ollama — all in a lightweight Tauri native desktop app.

## Features

- **Interactive ER diagrams** — React Flow + Dagre layout with click-to-explore relationships
- **SQL editor** — Monaco with autocomplete sourced from live schema introspection
- **EXPLAIN plan analysis** — visual tree display with performance warnings highlighted
- **AI optimization** — query optimization, index suggestions, and schema review via local Ollama (no cloud)
- **Encrypted connections** — AES-256-GCM credential storage with PostgreSQL SSL support
- **Query history** — 50-item history with execution timing and error tracking
- **Performance metrics** — table and index statistics from pg_stat views

## Quick Start

### Prerequisites

- Node.js 22.22.1+ with npm for the full developer workflow, including the locked `lint-staged` hook tooling. Vite itself supports Node 20.19+ on the 20.x line or 22.12+; the existing frontend CI lane uses Node 20 and does not establish compatibility for the full local hook workflow.
- pnpm 10.28.1, matching CI and the committed `pnpm-lock.yaml`.
- For Rust tests and the desktop app: Rust stable and the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/). macOS desktop development needs Xcode Command Line Tools.
- PostgreSQL 12+ is needed only for connected database features. [Ollama](https://ollama.com/) is optional for AI features. Local typechecking, frontend builds, and fixture tests need neither service.

### Installation

Run from the repository root:

```bash
pnpm --version # expected: 10.28.1
pnpm install --frozen-lockfile --ignore-scripts
```

This skips dependency lifecycle scripts, including Husky's `prepare`. A normal install without `--ignore-scripts` configures Git hooks; that Git configuration is shared by linked worktrees. Use an isolated clone when checking work without changing another checkout's hooks.

### Usage

```bash
pnpm tauri dev
```

Tauri's existing configuration invokes `npm run dev` and `npm run build` internally, so npm must also be available. Starting the desktop app creates its SQLite database and encryption salt in the application data directory. Use disposable connections for manual database checks.

For frontend-only development, use `pnpm dev`; browser previews do not provide Tauri's native commands. See [verification instructions](CONTRIBUTING.md#verification) for focused tests, broader checks, and conditional UI checks.

## Tech Stack

| Layer              | Technology          |
| ------------------ | ------------------- |
| Desktop runtime    | Tauri (Rust)        |
| Frontend           | React + TypeScript  |
| SQL editor         | Monaco Editor       |
| ER diagrams        | React Flow + Dagre  |
| AI features        | Ollama (local)      |
| PostgreSQL driver  | Rust postgres crate |
| Credential storage | AES-256-GCM         |

## License

MIT
