# Database Schema Visualizer

A cross-platform desktop application for PostgreSQL database exploration, schema visualization, query development, performance analysis, and AI-powered optimization — built with Tauri 2, React 19, and Rust.

---

## Features

### Interactive Schema Visualization

Explore your database structure through an interactive entity-relationship diagram powered by React Flow. Tables render as nodes with columns, types, nullability, and primary key indicators. Foreign key relationships appear as directed edges connecting source and target columns.

Two layout engines are available:

- **Hierarchical (Dagre)** — Top-down layout that emphasizes table relationships and dependency chains
- **Force-directed (D3)** — Organic layout with collision detection that naturally clusters related tables

Filter tables by name, switch between schemas, and toggle column/type visibility. Schema data is cached locally in SQLite and refreshed in the background so subsequent loads are instant.

### SQL Query Editor

A full-featured SQL editor built on Monaco (the engine behind VS Code) with:

- **Context-aware autocomplete** — Table and column names are pulled from the loaded schema and injected into Monaco's completion provider
- **Configurable result limits** — Queries are safely wrapped in subqueries to apply LIMIT without interfering with user SQL
- **Results table** — Scrollable, paginated output with column headers and row counts
- **EXPLAIN visualization** — One-click EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) with automatic transaction rollback to prevent accidental data modification
- **Query history** — Every execution is logged with timing, row count, and status. Re-run any previous query from the history panel.

### Performance Analysis

Three tools for understanding database performance:

- **EXPLAIN Plan Tree** — Parses PostgreSQL's JSON execution plan into a navigable tree. Nodes are annotated with automatic warnings for sequential scans on large tables, cost spikes, row estimate mismatches (>10x variance), and high disk I/O.
- **Table Statistics** — Live data from `pg_stat_user_tables` including row estimates, sequential vs index scan counts, dead tuple ratios, and last vacuum/analyze times.
- **Index Statistics** — Data from `pg_stat_user_indexes` showing scan counts and tuple reads per index.

### AI-Powered Suggestions (Ollama)

Connect to a local [Ollama](https://ollama.com) instance for AI-driven database optimization. Four suggestion modes:

| Mode | What it does |
|---|---|
| **Query Optimization** | Analyzes slow queries and suggests rewrites, join optimizations, or predicate improvements |
| **Index Suggestion** | Reviews query patterns and recommends indexes to create or remove |
| **Schema Review** | Evaluates table structure for normalization issues, missing constraints, or type improvements |
| **General** | Free-form database questions answered with schema context |

Suggestions are persisted locally with accept/reject tracking. All AI features degrade gracefully when Ollama is unavailable — the rest of the app works without it.

### Connection Management

- **Multiple concurrent connections** — Each connection maintains its own PostgreSQL pool. Switch between databases without disconnecting.
- **Encrypted credential storage** — All sensitive fields (host, port, database, username, password) are encrypted at rest using AES-256-GCM via the `ring` cryptography library.
- **Connection testing** — Verify connectivity before saving. The test returns the PostgreSQL version string on success.
- **Color coding** — Assign colors to connections for quick visual identification across the app.
- **SSL mode support** — All PostgreSQL SSL modes: disable, prefer, require, verify-ca, verify-full.

### Theming

Light, dark, and system modes with smooth 150ms transitions. The system mode tracks OS preference changes in real-time. All UI elements use semantic color tokens — accent, danger, success, warning — that adapt to the active theme. The Monaco editor theme switches between `vs-dark` and `light` to match.

---

## Security

Credential protection is a core design concern, not an afterthought.

- **AES-256-GCM encryption** for all stored credentials using the `ring` crate
- **PBKDF2-HMAC-SHA256 key derivation** with 600,000 iterations (NIST-recommended minimum)
- **Per-machine keys** — Derived from a random 32-byte salt (stored in app data) combined with the machine hostname. Credentials are not portable between machines.
- **Passwords never returned to frontend** — The `list_connections` command decrypts host/port/database/username for display but never exposes the password
- **12-byte random nonce per encryption** — Same plaintext produces different ciphertext every time
- **EXPLAIN rollback** — EXPLAIN ANALYZE runs inside a transaction that always rolls back, preventing accidental writes from DML analysis
- **Content Security Policy** — Restrictive CSP in the Tauri window: `default-src 'self'` with targeted exceptions for WASM (Monaco) and localhost API calls (Ollama)
- **Mutex safety** — PostgreSQL pool operations release locks before any `.await` points to prevent deadlocks

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.1 | UI framework |
| TypeScript | 5.8 (strict mode) | Type safety |
| @xyflow/react | 12.10 | Schema graph visualization |
| Monaco Editor | 0.55 | SQL editing with autocomplete |
| D3.js | 7.9 | Force-directed graph layout |
| Dagre | 2.0 | Hierarchical graph layout |
| Zustand | 5.0 | Lightweight state management |
| Tailwind CSS | 4.1 | Utility-first styling |
| Vite | 7.0 | Build tooling |
| Vitest | 4.0 | Testing |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Rust | stable | Systems language |
| Tauri | 2.x | Desktop framework (small binary, native webview) |
| SQLx | 0.8 | Async database access (SQLite + PostgreSQL) |
| ring | 0.17 | AES-256-GCM encryption, PBKDF2 key derivation |
| reqwest | 0.12 | HTTP client for Ollama API |
| Tokio | 1.x | Async runtime |
| serde | 1.x | Serialization |

### Data

| Store | Purpose |
|---|---|
| **SQLite** (local, WAL mode) | Connections, settings, query history, schema cache, AI suggestions |
| **PostgreSQL** (remote) | Target database for introspection, queries, and performance analysis |

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/) prerequisites for your platform
- A PostgreSQL database to connect to
- (Optional) [Ollama](https://ollama.com) for AI features

### Install and Run

```bash
# Clone the repository
git clone https://github.com/saagar210/DatabaseSchemaVisualizer.git
cd DatabaseSchemaVisualizer

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

The compiled binary will be in `src-tauri/target/release/bundle/`.

### Run Tests

```bash
# Rust tests (encryption, query logic, plan parsing, SQLite)
cd src-tauri && cargo test

# Frontend tests (stores, layout utilities)
npm test

# Type checking
npm run lint

# Rust linting
cd src-tauri && cargo clippy
```

---

## Architecture

```
src/                          # React frontend
├── components/
│   ├── ai/                   # AI suggestion cards and view
│   ├── common/               # Layout, sidebar, modal, toast, error boundary
│   ├── connections/           # Connection list, form, detail
│   ├── performance/           # EXPLAIN tree, table/index stats panels
│   ├── query/                 # Monaco editor, results table, history
│   ├── schema/                # React Flow canvas, table nodes, toolbar
│   └── settings/              # App settings view
├── hooks/                     # Business logic (useConnections, useSchema, useQuery, etc.)
├── services/                  # Tauri IPC wrappers (invoke calls)
├── stores/                    # Zustand state stores
├── types/                     # TypeScript type definitions
└── utils/                     # Layout engines (dagre, force simulation)

src-tauri/src/                 # Rust backend
├── commands/                  # Tauri command handlers
│   ├── connections.rs         # CRUD + connect/disconnect
│   ├── schema.rs              # PostgreSQL introspection + caching
│   ├── query.rs               # Query execution + EXPLAIN + history
│   ├── performance.rs         # EXPLAIN parsing + pg_stat queries
│   ├── ai.rs                  # Ollama integration + suggestion storage
│   └── settings.rs            # App settings persistence
├── crypto/encryption.rs       # AES-256-GCM + PBKDF2 key derivation
├── db/
│   ├── local.rs               # SQLite initialization (WAL, migrations)
│   ├── postgres.rs            # PgPool creation + SSL configuration
│   └── introspect.rs          # Schema introspection via pg_catalog
├── models/                    # Rust structs (serde, sqlx)
└── error.rs                   # AppError enum with thiserror
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + 1` | Connections view |
| `Cmd/Ctrl + 2` | Schema view |
| `Cmd/Ctrl + 3` | Query view |
| `Cmd/Ctrl + 4` | Performance view |
| `Cmd/Ctrl + 5` | AI view |
| `Cmd/Ctrl + 6` | Settings view |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + Enter` | Run query (in query editor) |

---

## Configuration

All settings are persisted in the local SQLite database and accessible from the Settings view:

| Setting | Default | Description |
|---|---|---|
| Theme | system | `light`, `dark`, or `system` (tracks OS) |
| Query Limit | 1000 | Default row limit for query results |
| Editor Font Size | 14 | Monaco editor font size |
| Editor Tab Size | 2 | Monaco editor tab width |
| Graph Layout | dagre | Default ERD layout (`dagre` or `force`) |
| Show Columns | true | Display columns in schema graph nodes |
| Show Types | true | Display column types in schema graph nodes |
| Ollama Endpoint | http://localhost:11434 | Ollama API URL |
| Ollama Model | llama3.2 | Model to use for AI suggestions |

---

## License

MIT
