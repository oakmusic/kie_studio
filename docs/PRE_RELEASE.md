# Pre-release Checklist

Procedure to complete before releases (canary / stable) or major PR merges. Also used as completion criteria for agent tasks.

## 1. Code Gates

```bash
npm run lint && npm test && npx tsc -b
```

If modifying the frontend or desktop application, run production build as needed:

```bash
npm run build
```

## 2. Functional Smoke Tests

Manually test areas affected by the changes. Examples:

- Agent Grok: Settings → LLM → xAI Grok: save `XAI_API_KEY` → verify "xAI Grok" appears in model picker
- Prompt optimization Grok CLI (`server/grok/`) uses a separate route: `grok login` or the same `XAI_API_KEY`

## 3. UI/UX Quality Gate (Layout & Overlap)

Visually inspect target screens (narrow viewports, different states):

1. No element overlap or overflow
2. Scrolling and line wrapping remain stable within sheets and modals
3. Buttons do not collide or overlap
4. No z-index conflicts with existing chrome like SpringSheet / FloatingChrome
5. Adherence to [DESIGN.md](../DESIGN.md) (no raw hex, glow, or purple gradients; use `var(--*)`)

Fix any detected issues within the PR before proceeding.

## 4. Desktop Testing (Optional)

```bash
npm run desktop:dev
# Or run a canary build
```

Verify that navigation reaches Settings and UI renders correctly inside the webview.

## 5. Knowledge Base Synchronization

Update relevant indexion wiki pages (do not edit `.md` files directly — use `pages update`):

```bash
indexion wiki pages update --wiki-dir=.indexion/wiki ...
indexion wiki lint --wiki-dir=.indexion/wiki
```

## 6. Entry Documentation

Update entry documents to match the current implementation and procedures:

1. [AGENTS.md](../AGENTS.md) (directories, notes, Pre-release links)
2. [README.md](../README.md) / [README.ja.md](../README.ja.md) (and [README.zh.md](../README.zh.md) if needed)

The recommended update order is **AGENTS → README**, ensuring terminology is consistent across documents.

## 7. Git

- Commit messages follow conventional commits
- Only push or tag when explicitly requested by the user
- Tag formats like `v*-canary` follow `.github/workflows/release.yml`
- Bundled catalog is re-synced from docs.kie.ai by release CI. Local version bumps may keep existing snapshot

## 8. Prohibited Items

Never include the following in build artifacts or commits:

- `.env` files / API keys
- Legacy `data/grok-oauth/auth.json` (deprecated)
- `*.db` / `*.key` files
