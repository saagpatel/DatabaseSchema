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
- Node.js 18+, Rust stable
- PostgreSQL 12+ (target database)
- [Ollama](https://ollama.com/) (optional, for AI features)

### Installation
```bash
npm install
```

### Usage
```bash
npm run tauri dev
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop runtime | Tauri (Rust) |
| Frontend | React + TypeScript |
| SQL editor | Monaco Editor |
| ER diagrams | React Flow + Dagre |
| AI features | Ollama (local) |
| PostgreSQL driver | Rust postgres crate |
| Credential storage | AES-256-GCM |

## License

MIT
