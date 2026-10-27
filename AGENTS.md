# AGENTS.md — KIE STUDIO

Notes and guidelines for coding agents working in this repository.

## Project Overview

A local Studio application for **IMAGE / VIDEO / AUDIO** generation powered by the kie.ai Market API and dedicated workflows.

| Layer | Technologies & Location |
|-------|--------------------------|
| Frontend | `src/` — Vite + React 19 + Tailwind CSS v4 + TanStack Query + Motion |
| Backend | `server/` — Hono (`127.0.0.1:8787`). Both dev and desktop run on the **Bun runtime** via `Bun.serve`. Vite proxies `/api` |
| Desktop | Electrobun (Bun main process `src/bun/index.ts` + native webview). Configuration in `electrobun.config.ts` |
| Catalog | Combines OpenAPI documentation from `src/data/catalog.json` with dedicated workflows in `server/catalog/dedicated.ts` |
| Secrets | `KIE_API_KEY`. Sourced from `.env` or SQLite `app_settings` (saved in Settings sheet). Stored key takes precedence over env var. Never exposed to frontend |

Supported providers are Market, Suno, Veo, and Runway. Conversational chat APIs are out of scope.

## indexion (Mandatory Knowledge Base)

Repository knowledge is governed by the **indexion wiki** and **agent orient**. Do not navigate directories by guessing.

### Binary (Windows)

```powershell
# If not in PATH:
$env:Path = "$env:USERPROFILE\.indexion\bin;$env:Path"
# Or: & "$env:USERPROFILE\.indexion\bin\indexion.exe" ...
```

- Binary: `%USERPROFILE%\.indexion\bin\indexion.exe`
- KGF directory: `$env:INDEXION_KGFS_DIR` → `%LOCALAPPDATA%\Indexion\kgfs`

### Before Implementation (Required)

1. Read entry point: `.indexion/wiki/index.md`
2. Read hubs relevant to the task (Architecture / Core Concepts / Frontend / Server API, etc.)
3. If the target location is ambiguous, orient:

```powershell
indexion agent orient --task "<short English purpose gloss>" --output .indexion/cache/agent/orient.md .
```

Pass a concise gloss of codebase terminology to `--task`.

### Search

```powershell
indexion search "history pin SQLite" src/
indexion grep "createTask" server/
```

### When Updating Wiki (Direct `.md` edits prohibited)

Wiki pages must be managed via `indexion wiki pages add|update`. If edited directly, always sync manifest / search index / logs with `pages update`.

```powershell
indexion wiki pages ingest --wiki-dir=.indexion/wiki
indexion wiki lint --wiki-dir=.indexion/wiki
indexion wiki index build --wiki-dir=.indexion/wiki
```

Wiki pages overview (see `.indexion/wiki/*.md` for details):

| ID | Description |
|----|-------------|
| `overview` / `getting-started` / `architecture` / `core-concepts` | System overview, setup, layers, concepts |
| `frontend` / `client-lib` | UI components and `src/lib` |
| `server-api` / `kie-integration` | Hono routes and kie.ai client |
| `catalog-sync` / `prompt-optimize` | Catalog synchronization and Grok optimization |
| `agent-mode` | Agent mode (AI SDK, conversation lifecycle) |

## Directory Structure

```text
src/
  App.tsx, main.tsx, index.css
  components/          # UI components
    agent/             # Agent mode UI (AgentView, AgentChat, model picker)
    audio/             # Dialogue/narration editors and persistent audio player
    shell/             # StudioShell, FloatingChrome
    motion/            # Pressable, Material, SpringSheet, SharedMedia
  lib/
    api.ts, history.ts, submissionQueue.ts, workflowValidation.ts, media*.ts
    agentApi.ts        # Client for agent chat & LLM settings /api
    models/            # Types, from-openapi, mentions
  data/catalog.json
src/bun/
  index.ts             # Electrobun main process (Bun.serve + BrowserWindow + updater)
  installCwd.ts        # Handles chdir from Windows Temp Worker to install bin
server/
  app.ts               # createApp(): Hono app (CORS, health, route registration, onError)
  index.ts             # Dev entry point (Bun.serve createApp + startup sync)
  agent/               # AI SDK agent (streamText + tools in same Hono process)
  routes/              # upload, generate, task, Suno, archive, history, settings, agentChat, ...
  db/                  # bun:sqlite (history, Persona, audio assets, app_settings, agent logs)
  settings/            # API key resolution (storage store prioritized over env vars)
  kie/adapters/        # Normalization across Market / Suno / Veo / Runway
  grok/                # Grok CLI prompt optimization
  catalog/             # Docs catalog synchronization + dedicated workflows
electrobun.config.ts   # Electrobun build configuration
scripts/sync-models.ts
docs/PRE_RELEASE.md    # Pre-release checklist
cli/                   # kiestudio CLI (Studio API client; outputs to Gallery history)
.indexion/wiki/        # Project knowledge base
```

| Path | Role |
|------|------|
| `src/App.tsx` | Mediates form, queue, history, polling, and Quick Actions |
| `src/components/DynamicForm.tsx` | Catalog-driven dynamic form |
| `src/components/HistoryGallery.tsx` / `HistorySheets.tsx` | History, multi-media, synced lyrics, retry, import/export |
| `src/components/audio/` | Dialogue and narration editors, persistent audio player |
| `src/components/ReferenceUpload.tsx` | Reference media upload |
| `src/components/PromptOptimizePanel.tsx` | Prompt optimization UI |
| `src/components/KlingElementsEditor.tsx` | Kling Elements editor |
| `src/components/shell/` | Layout framework |
| `src/components/motion/` + `src/lib/motion.ts` | Micro-interactions and motion |
| `src/components/agent/` + `src/lib/agentApi.ts` | Agent mode UI and conversation client. Conversations are drafts until first send |
| `server/agent/` | AI SDK agent (`streamText` + tools) handling `POST /api/agent/chat` |
| `src/lib/api.ts` | `/api` client (does not hold keys) |
| `src/lib/history.ts` | Pure history functions (capping, normalization). Persisted via `/api/history` |
| `src/lib/submissionQueue.ts` | Unsent queue, retries, and rate limiting |
| `src/lib/workflowValidation.ts` | Pre-submission validation per provider/operation |
| `src/lib/models/` | Types, OpenAPI extraction, mentions |
| `src/bun/index.ts` | Electrobun main process. Sets `STUDIO_DB_PATH` to userData → `Bun.serve` → launches webview |
| `server/app.ts` | `createApp()` creates Hono instance (shared by dev and desktop) |
| `server/routes/` | HTTP boundary (`settings.ts` manages API keys) |
| `server/db/` | bun:sqlite (defaults to `data/studio.db`, overridden by `STUDIO_DB_PATH`) |
| `server/settings/` | API key resolution helper (saved store prioritized over env vars) |
| `server/kie/adapters/` | Normalizes generation, status, and errors across Market, Suno, Veo, and Runway |
| `server/grok/` | Grok CLI integration for prompt optimization |
| `server/catalog/` + `scripts/` | Catalog synchronization |
| `cli/` | `kiestudio` CLI client for public `/api`. Generated items appear in Gallery |
| `.github/workflows/` | CI, periodic bundled catalog PRs, desktop releases |
| `docs/PRE_RELEASE.md` | Pre-release checklist |
| `.indexion/wiki/` | indexion knowledge base |

## Working Rules

- **Do not commit** unless explicitly instructed by the user. Follow conventional commits
- Never commit `.env` or secrets
- Align with existing types, naming conventions, and UI patterns. Do not perform unrelated refactoring or add unnecessary documentation
- Disallow inline imports (gather at file header)
- Use `default: never` check in `switch` statements over unions/enums
- **Always run verification commands after editing code**: `npm run lint && npm test && npx tsc -b` (all 3 must succeed before considering work complete)
- Before and after major feature changes, run `ingest` on relevant wiki pages and `pages update` if needed
- Run the [docs/PRE_RELEASE.md](docs/PRE_RELEASE.md) checklist before releases or major PR completions

## Agent Harness & Automated Gates

Automated gates stop agent execution in specific safety conditions. Do not bypass them. If stopped, inspect the reason, break down actions into non-destructive steps, and ask for confirmation.

| Layer | Implementation | Blocked Actions |
|-------|----------------|-----------------|
| Cursor hook | `.cursor/hooks.json` → `node .cursor/hooks/guard-shell.mjs --cursor` (`failClosed`) | Force push, direct push to main, `reset --hard`, recursive deletion, `.env` read/write, `gh pr merge`, branch protection changes, `curl \| sh` |
| Qoder hook | `.qoder/settings.json` `PreToolUse` → same script `--qoder` (`exit 2`) | Same as above |
| pi permissions | `.pi/extensions/pi-permission-system/config.json` | Same as above + self-PR approval, tagging, sub-agents |
| GitHub | `main` branch protection (required check `lint / test / types / build`, 1 approval, auto-merge enabled) | CI failures, unapproved merges |

- Block logs: `~/.cursor/hooks/blocked.log`, `~/.qoder/hooks/blocked.log`, pi logs in `~/.pi/agent/extensions/pi-permission-system/logs/`
- Autonomous merges are restricted to **low-risk tasks only** (`src/data/catalog.json` daily sync, `docs/**`, test additions). Final merges for feature changes require human review

## Pre-release Summary

Detailed guide in [docs/PRE_RELEASE.md](docs/PRE_RELEASE.md). Summary:

1. `npm run lint && npm test && npx tsc -b`
2. Functional smoke test of changed areas
3. Visual UI/UX inspection (no layout breaks or overlapping controls)
4. Synchronize wiki / AGENTS.md / README.md
5. Never commit secrets (`.env`, etc.)

## Skills Routing

Use only skills that match this project's stack: Vite + React 19 + Tailwind CSS v4 + Hono + Bun + Vitest + oxlint + Motion.

### Allowed Skills

| Category | Skill Name | Usage |
|----------|------------|-------|
| React | `react-best-practices` | React 19 performance and patterns |
| Testing | `vitest` | Vitest unit tests, mocks, fixtures |
| Backend | `hono` | Hono routes, middleware, validation |
| Build | `vite` | Vite config, plugins, SSR |
| Lint | `oxlint` | oxlint config and rules |
| CSS | `tailwind-css-patterns` | Tailwind CSS v4 utilities |
| Accessibility | `accessibility`, `fixing-accessibility` | WCAG auditing and fixes |
| Design | `impeccable`, `baseline-ui`, `emil-design-eng`, `make-interfaces-feel-better`, `apple-design` | UI quality (following DESIGN.md priorities) |
| Motion | `animation-principles`, `mastering-animate-presence` | Motion / AnimatePresence |
| Types | `typescript-advanced-types` | Advanced TypeScript type design |
| CLI | `kiestudio-cli` | Terminal generation, model listing, history inspection |
| CLI Implementation | `kiestudio-cli-maintain` | Modifying CLI / history upsert / Gallery merge |
| CLI Verification | `verify-kiestudio-cli` | Testing CLI doctor and generate-to-history |
| Debugging | `diagnosing-bugs`, `systematic-debugging` | Fault diagnosis |
| Refactoring | `refactor`, `improve-codebase-architecture` | Safe refactoring |

### Prohibited Skills

The following are strictly out-of-stack and **must not be used**:
- Vue / Nuxt: `vue`, `vue-best-practices`, `nuxt`, `pinia`, etc.
- Next.js: `next-best-practices`, `next-upgrade`, `next-rspack`, etc.
- Remotion: all `remotion-*`
- Three.js: all `threejs-*`
- Svelte: `svelte-code-writer`, etc.
- Cloudflare: `cloudflare`, `wrangler`, `durable-objects`, etc.
- Supabase: `supabase`, `supabase-postgres-best-practices`
- Other frameworks: `react-router-framework-mode`, `react-native-best-practices`, `swiftui-ui-patterns`

### Design Skill Priority

In case of conflict, follow the chain in `DESIGN.md`:
> impeccable → baseline-ui → design-system → emil-design-eng → apple-design (sheet only) → make-interfaces-feel-better

## Git: Reminders

When commit or PR work is ready:
1. Run `git status` to check ahead/untracked status
2. If remote push was requested, run `git push` (with `-u` if needed)
3. If not requested, ask the user before pushing

## Setup

```bash
cp .env.example .env     # Configure KIE_API_KEY if testing live API
npm install
npm run dev              # Web http://localhost:5173 / API http://127.0.0.1:8787
```

Node.js should be an LTS supporting Vite 8 / React 19 (e.g. 20.19+ / 22.12+).

## Common Commands

```bash
npm run dev                    # server + web (dev:server + dev:web. Agent on :8787)
npm run dev:server             # Hono API only (bun --watch server/index.ts)
npm run desktop:dev            # Run Electrobun desktop in dev mode (requires Bun)
npm run desktop:build:canary   # Canary desktop build (vite build + electrobun build)
npm run desktop:build:stable   # Stable desktop build
npm run desktop:package:canary # Repackage canary (skips vite build + collects to release/)
npm run desktop:package:linux:canary # Repackage Linux canary (bun-driven / WSL compatible)
npm run desktop:build:linux:canary   # Full Linux build (vite build + electrobun build)
npm run desktop:installer:win  # Build Windows Inno Setup installer (requires Inno Setup 6/7)
npm run desktop:installer:deb  # Build Linux .deb (requires Linux/WSL + dpkg-deb)
npm run icons                  # assets/icon-master.svg → icon.ico / icon.png / icon.iconset
npm run dev:web                # Vite only
npm run lint                   # oxlint (.oxlintrc.json)
npm test                       # Run Vitest once
npm run test:watch             # Vitest watch mode
npx tsc -b                     # Type check only (also included in build)
npm run build                  # tsc -b + vite build
npm run preview                # Preview production build
npm run sync:models            # Sync catalog models
npm run sync:models -- --ignore-age
npm run sync:models -- --force
npm run kiestudio -- --help    # CLI (bun cli/index.ts)
```

- Standard verification: `npm run lint` + `npm test` + `npx tsc -b` + `npm run build`.

## Important Implementation Notes

- Catalog sync only runs on dev startup if the snapshot is outdated. Packaged desktop checks `llms.txt` on launch and re-checks every 6 hours. Bundled `src/data/catalog.json` is updated by `.github/workflows/catalog-sync.yml` and `release.yml`
- Reference key names (e.g. Seedance) and mention tags are sensitive to trailing spaces and casing
- History uses bun:sqlite (`data/studio.db` default; desktop stores it under `userData` via `STUDIO_DB_PATH`). Maintain safety bounds: pin limits, import normalization, and form input restoration
- Provider/operation differences are normalized in `server/kie/adapters/` to maintain a unified task/history interface
- Personas and external audio metadata are stored in SQLite. Media binary files are not stored
- Legacy localStorage keys are migrated on first launch via `POST /api/history/migrate`
- Prompt optimization depends on Grok CLI. Returns 503 if not installed
- Agent Grok uses builtin `xai` + `XAI_API_KEY` (saved in Settings or env). Does not use X OAuth. Do not confuse with `server/grok/` (CLI prompt optimization)
- When adding `FieldType` or custom UI, review `types.ts` → `DynamicForm` → catalog extraction together
- Dedicated workflows for Suno, Veo, and Runway are coupled between `server/catalog/dedicated.ts` and adapters
- Adding agent tools requires updating both `server/agent/tools.ts` and `server/agent/actions.ts`

### Desktop Distribution (Electrobun + Inno Setup)

- **Windows primary distribution is Inno Setup** (`installer/win/kie-studio.iss` + `scripts/build-win-installer.mjs`). Electrobun's default Setup.exe does not register in ARP and has incomplete uninstallation. The installation path matches Electrobun default (`%LocalAppData%\ai.kie.studio\<channel>\app`) to preserve auto-update behavior.
- **Never corrupt user DB (Critical)**: `studio.db` (+ WAL/SHM) lives in the **parent** directory of `app\` (`...\<channel>\`). Uninstaller only deletes `app\` and must never touch the parent directory.
- **Icons**: `assets/icon-master.svg` (K monogram) → `npm run icons` (sharp + png-to-ico) produces `icon.ico`/`icon.png`. Post-build script `scripts/embed-win-icon.mjs` embeds icon into launcher.exe using rcedit to bypass Electrobun's path-resolution bug. Re-embedded during installer build (`build-win-installer.mjs`).
- **arm64**: win-arm64 runs x64 builds via OS emulation; separate build not required.
- **release/ aggregation**: Electrobun recreates `artifacts/` on each build, deleting other platform files. `scripts/collect-release.mjs` copies artifacts to persistent `release/`.

### Recovery Procedure for Failed Builds

If build pipeline fails: **Rebuild → Repackage → Redeploy**.

#### 1. Rebuild (Type Check + Vite + Electrobun)

```bash
npx tsc -b                        # Type check
npm run build                     # tsc -b + vite build
npm run desktop:build:canary      # Canary full build
# npm run desktop:build:stable    # Stable full build
```

Verify:
- `npx tsc -b` exits with 0
- `npm run build` outputs `dist/`
- `desktop:build:*` outputs to `artifacts/`

#### 2. Repackage (Inno Setup / .deb / release collection)

```bash
# Windows Inno Setup installer:
npm run desktop:installer:win

# Collect to release/:
node scripts/collect-release.mjs
```

Verify:
- `release/` contains setup executable
- Log output from ISCC compiler confirms successful packaging
