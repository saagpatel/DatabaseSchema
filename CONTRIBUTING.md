# Contributing

Thanks for your interest in contributing! Here's how to get started.

## Bug Reports & Feature Requests

Open a [GitHub Issue](../../issues/new) with:

- Clear description of the problem or idea
- Steps to reproduce (for bugs)
- Expected vs actual behavior

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes with clear commit messages
4. Run the relevant [verification commands](#verification) and report their results
5. Open a PR with a description of what changed and why

## Development Setup

See the README for installation and setup instructions.

## Verification

Run commands from the repository root after the [locked installation](README.md#installation). Use pnpm 10.28.1: the performance build script runs pnpm's JavaScript entry point through Node. Rust commands also need the native Tauri prerequisites linked in the README.

### Frontend and documentation

```bash
pnpm lint                           # TypeScript check: tsc --noEmit
pnpm build                          # TypeScript plus the Vite frontend build
pnpm exec prettier --check README.md CONTRIBUTING.md
```

For formatting checks, replace the example paths with the files you changed. `pnpm format` and `pnpm lint:fix` rewrite files; use them only when those edits are intended. There is currently no frontend unit-test or automated browser-test script in `package.json`.

### Focused Rust fixtures and broader tests

The local database tests use `tempfile` SQLite databases and do not start PostgreSQL, Ollama, or the desktop app:

```bash
cargo test --locked --manifest-path src-tauri/Cargo.toml db::local::tests
```

For another backend change, replace `db::local::tests` with its test module, such as `crypto::encryption::tests` or `commands::query::tests`. Run the broader Rust unit suite for changes that cross modules:

```bash
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

The current query-helper tests have pre-existing SELECT-limit and query-mode assertion failures. Keep those failures visible when reporting a targeted or full run; a passing SQLite fixture run does not establish that the full Rust suite passes.

For Rust formatting, use the read-only check:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

### Repository verification authority

Keep the existing repository checks from `AGENTS.md` and `.codex/verify.commands`:

```bash
pnpm build
bash .codex/scripts/run_verify_commands.sh
```

Build first so the bundle report measures `dist/assets`. The authority runs Git guards, bundle reporting, build timing, and asset checks; the secret guard requires `gitleaks`. It writes local `.perf-results` reports and rebuilds the frontend. Report it separately from Rust tests and desktop verification.

### UI and service checks

For changed screens, interactions, or rendered reports, inspect the affected states at the relevant viewport sizes and check the browser console. `pnpm dev` previews browser-compatible frontend states; desktop IPC behavior needs `pnpm tauri dev`. Pure documentation changes need no browser pass.

Desktop launch writes application data for `com.dbviz.app`, and connection/query actions can read or modify a target database. A separate Git clone does not isolate that application data. Use a disposable test account/application-data environment and database for those manual checks. Ollama checks need a separately available local model. Do not start installed services, use saved personal connections, or run provider/database performance lanes merely to validate documentation. The conditional API/DB CI jobs are separate service lanes; the default local authority does not execute them. A frontend build or fixture test does not verify the packaged desktop app, live PostgreSQL/Ollama behavior, or distribution.

## Code Style

- Follow the existing patterns in the codebase
- Use meaningful variable and function names
- Add comments only where the logic isn't self-evident

## Questions?

Open an issue or start a discussion. Response time is typically within a few days.
