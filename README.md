# Database Schema Visualizer

A production-grade PostgreSQL IDE for schema exploration, SQL development, and query optimization. Built with React, TypeScript, and Tauri for a lightweight native desktop experience.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)

## Features

- **Interactive Schema Visualization** - Entity-relationship diagrams with React Flow and Dagre layout
- **Full-Featured SQL Editor** - Monaco editor with autocomplete from live schema introspection
- **EXPLAIN Plan Analysis** - Visual tree display with intelligent performance warnings
- **AI-Powered Optimization** - Query optimization, index suggestions, and schema review via Ollama
- **Connection Management** - Encrypted credential storage (AES-256-GCM) with PostgreSQL SSL support
- **Query History** - 50-item history with execution timing and error tracking
- **Performance Metrics** - Table/index statistics from pg_stat views
- **Dark Mode** - System, light, and dark themes

## Quick Start

### Prerequisites

- **Node.js** 18+ (for frontend build)
- **Rust** stable (for Tauri backend)
- **PostgreSQL** 12+ (target database)
- **Ollama** (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/saagar210/DatabaseSchemaVisualizer.git
cd DatabaseSchemaVisualizer

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### First Connection

1. Click "Add" in the sidebar to create a connection
2. Enter your PostgreSQL connection details
3. Click "Test" to verify the connection
4. Click "Save" to store the connection
5. Click "Connect" to start exploring

## Technology Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 7.0, Tailwind CSS 4.1
- **Backend**: Rust (stable), Tauri 2.x, Tokio (async runtime)
- **Database**: SQLx 0.8 (SQLite + PostgreSQL)
- **Security**: ring 0.17 (AES-256-GCM encryption)

## License

MIT License
