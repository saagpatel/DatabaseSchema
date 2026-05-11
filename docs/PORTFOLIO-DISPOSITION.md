# DatabaseSchema — Portfolio Disposition

**Status:** Release Frozen — Tauri 2 + Rust + React production PostgreSQL
IDE on `origin/main` with Monaco editor, React Flow ER diagrams,
AES-256-GCM credential storage, and local Ollama AI index suggestions.
Joins the signing cluster as the 12th member.

> Disposition uses strict `origin/main` verification.

---

## Verification posture

This repo has both `origin` (`saagpatel/DatabaseSchema`) and
`legacy-origin` (`saagar210/DatabaseSchema`) remotes. Two simultaneous
traps to call out, **distinct from the legacy-origin trap on other
repos this session:**

1. **Branch trap.** The local working clone's `HEAD` is on
   `codex/chore/bootstrap-codex-os`, which is **13 commits behind
   `origin/main`**. Any analysis done from `HEAD` would miss the
   actual canonical state.
2. **Master-tracks-legacy trap.** The local `master` branch tracks
   `legacy-origin/master` (frozen `saagar210` account), 4 behind. So
   even if a reader did `git checkout master`, they'd get the wrong
   read.

The correct read uses literal `origin/main` regardless of local
branch state.

Specifically verified on `origin/main`:

- Tip: `8cfefed` chore: add initial CHANGELOG
- Substantive commits on `origin/main`:
  - `dd826af` feat: implement comprehensive testing, CI/CD, and code quality infrastructure
  - `8ed0d89` feat(dev): add lean development and cleanup workflows
  - `d58d2fc` Add comprehensive README with feature documentation
- Tree on `origin/main` is a real Tauri 2 + Rust + React desktop app:
  - `src-tauri/src/commands/{ai,connections,performance,query,schema,settings}.rs`
  - `src-tauri/src/crypto/encryption.rs` (AES-256-GCM credential storage)
  - `src-tauri/src/db/{introspect,local,postgres}.rs`
  - `src-tauri/src/models/{ai,connection,performance,query,schema,settings}.rs`
  - `src-tauri/migrations/001_initial.sql`
- Release scaffolding: none yet (no `RELEASE-READINESS.md`, no
  `release-smoke.yml`)
- Default branch: `main`

---

## Legacy-origin orphan note

`legacy-origin/master` has 3 commits not on `origin/main` — all
`chore(codex): bootstrap tests and docs defaults`. Low value, safe to
ignore. The `codex/aggressive-prune-cleanup` branch (`38ab58e
refactor(repo): aggressively prune non-runtime project bloat`) is
also legacy-origin-only — operator should review before considering
it lost, but it predates the canonical product surface.

---

## Current state in one paragraph

Database Schema Visualizer is a production-grade PostgreSQL IDE
desktop app for schema exploration, SQL development, and query
optimization. Features per the on-origin/main README: entity-
relationship diagrams via React Flow + Dagre, Monaco SQL editor with
live schema autocomplete, visual EXPLAIN plan trees, AI-powered index
suggestions via local Ollama, AES-256-GCM credential storage. Stack:
Tauri 2 (Rust) backend, React + TypeScript frontend, Postgres driver
via the Rust `postgres` crate, local Ollama for AI features. Builds
for Linux / macOS / Windows per README badge.

For full detail see `README.md` on `origin/main`.

---

## Why "Release Frozen" instead of other dispositions

- **Active** — wrong. The product surface looks complete; the gate is
  signing, not feature delivery.
- **Cold Storage / Archived** — wrong. The README explicitly markets
  this as production-grade.
- **Release Frozen** — correct. Joins the cluster.

This is the **12th signing cluster member**: DesktopPEt / ContentEngine
/ AIGCCore / Relay / FreeLanceInvoice / Nexus / DeepTank / OPscinema /
ShipKit / SignalFlow / PixelForge / **DatabaseSchema**.

---

## Unblock trigger (operator)

When ready to ship:

1. Reconcile local working tree. Either:
   - Discard the dirty `codex/chore/bootstrap-codex-os` work (10+
     modified files including AGENTS.md, README.md), or
   - Cherry-pick its valuable changes onto `origin/main`
2. Fast-forward local `main` to `origin/main` so future analysis isn't
   misled by branch state.
3. Wire Apple Developer ID + notarization credentials.
4. Cut v1.0.0 release tag.
5. Verify signed/notarized DMG opens without Gatekeeper warnings.

Estimated operator time once credentials are in hand: ~3 hours
including notarization round-trip.

---

## Portfolio operating system instructions

| Aspect               | Posture                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio status     | `Release Frozen`                                                                                                                                                                                          |
| Review cadence       | Suspend overdue counting                                                                                                                                                                                  |
| Resurface conditions | (a) Apple signing credentials wired, (b) operator decides cross-platform packaging strategy (README claims Linux/macOS/Windows; macOS signing is one of three), or (c) operator opens a v1.1 scope packet |
| Co-batch with        | Signing cluster: DesktopPEt / ContentEngine / AIGCCore / Relay / FreeLanceInvoice / Nexus / DeepTank / OPscinema / ShipKit / SignalFlow / PixelForge / **DatabaseSchema** — **now 12 repos**              |
| Special concern      | **Local branch state hides canonical truth.** Reactivation MUST start from `origin/main` regardless of where local HEAD sits.                                                                             |

---

## Why this row has two traps

Most signing-cluster repos hit at most one trap (legacy-origin
tracking). DatabaseSchema hits two simultaneously:

- **Branch trap:** local clone's working branch is 13 behind canonical
- **Master-tracks-legacy trap:** local `master` points at the frozen
  account

Both can mislead `git log HEAD --oneline -10` or `git diff HEAD` style
analysis. The fix in both cases is the same: pin verification to
`origin/main` explicitly.

This pattern likely recurs on other repos with both `origin` and
`legacy-origin` remotes plus stale codex bootstrap branches checked
out. Worth a sweep next session.

---

## Reactivation procedure (for the next code session)

1. **Pin to `origin/main` first**, regardless of local branch state.
2. Decide disposition for the 10+ modified files on
   `codex/chore/bootstrap-codex-os` — cherry-pick or discard.
3. Fast-forward local `main` to `origin/main`; set
   `main@{upstream}` to `origin/main` not `legacy-origin/main`.
4. Delete stale `codex/*` branches that pre-date the Phase commits
   on `origin/main`.
5. Re-run `pnpm install && pnpm tauri build` to confirm the
   toolchain still works.

---

## Last known reference

| Field                     | Value                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `origin/main` tip         | `8cfefed` chore: add initial CHANGELOG                                                                        |
| Last substantive commit   | `dd826af` feat: implement comprehensive testing, CI/CD, and code quality infrastructure                       |
| Default branch            | `main`                                                                                                        |
| Build system              | Tauri 2 + Rust + React + TypeScript + Monaco + React Flow + Dagre                                             |
| Release scaffolding       | **None yet** — no readiness doc, no release-smoke workflow                                                    |
| Build verification status | Untested in this disposition pass — needs `pnpm tauri build` smoke                                            |
| Blocker                   | Apple signing (operator-only) + local-branch reconciliation                                                   |
| Migration state           | `legacy-origin` present; local HEAD on stale codex bootstrap branch (13 behind), local `master` tracks legacy |
| Legacy-origin orphans     | 3 low-stakes `chore(codex)` commits + 1 aggressive-prune refactor branch                                      |
| Distinguishing feature    | **Double trap** — branch state AND master tracking both mislead. Always pin to `origin/main`.                 |
