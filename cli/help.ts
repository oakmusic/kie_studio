export const ROOT_HELP = `kiestudio — KIE STUDIO CLI

Generate IMAGE / VIDEO / AUDIO via the Studio API. Results appear in the Gallery history.
Direct calls to external provider APIs or internal agent endpoints are not made.

Usage:
  kiestudio <command> [options]

Commands:
  up         Start Studio API (does nothing if already running)
  open       Open Web UI in browser (http://localhost:5173)
  models     List available catalog workflows
  generate   Create a generation task (new taskId each run; not idempotent)
  status     Get task status
  history    Display summary of Gallery history

Global options:
  -h, --help     Show help
  --json         Output in JSON format
  -V, --version  Show version

Examples:
  kiestudio up
  kiestudio models --category image flux
  kiestudio generate -m flux-kontext-pro -p "a red bicycle" --wait
  kiestudio status <taskId> --wait
  kiestudio history

If API is not running, run \`kiestudio up\` or \`npm run dev\` first.
Connection target is STUDIO_API_BASE, or autodetected from 127.0.0.1:8787-8806 if unset.
`

export const UP_HELP = `kiestudio up

Starts the Studio API (Hono) in the foreground. Does nothing if /api/health is already responding.

Usage:
  kiestudio up

Examples:
  kiestudio up
  STUDIO_API_BASE=http://127.0.0.1:8788 kiestudio up
`

export const OPEN_HELP = `kiestudio open

Opens the Web UI in your default browser. Suggests \`npm run dev\` if http://localhost:5173 is unreachable.

Usage:
  kiestudio open

Examples:
  kiestudio open
`

export const MODELS_HELP = `kiestudio models

Lists workflows available in the catalog.

Usage:
  kiestudio models [--category image|video|audio] [query]

Options:
  --category   Filter by category: image / video / audio
  --json       Output in JSON format
  -h, --help   Show help

Examples:
  kiestudio models
  kiestudio models --category image
  kiestudio models flux
  kiestudio models --category video seedance --json
`

export const GENERATE_HELP = `kiestudio generate

Creates a generation task and records it in Studio history (Gallery).
Rerunning creates a separate task (not idempotent).

Usage:
  kiestudio generate -m <id|model> [options]

Options:
  -m, --model <id>     Workflow id or model name (required)
  -p, --prompt <text>  Value for input.prompt
  --input <json>       Generation input as a JSON string
  --set <key=value>    Additional input fields (repeatable; value can be JSON or string)
  --wait               Poll until task reaches a terminal state
  --json               Output in JSON format
  -h, --help           Show help

Examples:
  kiestudio generate -m flux-kontext-pro -p "a red bicycle" --wait
  kiestudio generate -m market/flux-kontext-pro --input '{"prompt":"hi","aspect_ratio":"16:9"}'
  kiestudio generate -m flux-kontext-pro -p "hi" --set aspect_ratio=16:9 --json

Manage results (pin, reuse, delete) in the Gallery UI:
  kiestudio history
  kiestudio open
`

export const STATUS_HELP = `kiestudio status

Retrieves the normalized task status. Terminal states are mirrored into history.

Usage:
  kiestudio status <taskId> [--provider market|suno|veo|runway] [--operation generate] [--wait] [--json]

Options:
  --provider    Provider name (default: market)
  --operation   Operation name (default: generate)
  --wait        Poll until task reaches a terminal state
  --json        Output in JSON format
  -h, --help    Show help

Examples:
  kiestudio status 123e4567-e89b --wait
  kiestudio status 123e4567-e89b --provider suno --json
`

export const HISTORY_HELP = `kiestudio history

Displays a summary of the same SQLite history used by the Gallery. Deletion and pinning are managed via Gallery UI.

Usage:
  kiestudio history [query] [--category image|video|audio] [--json]

Options:
  --category   Filter by category: image / video / audio
  --json       Output in JSON format
  -h, --help   Show help

Examples:
  kiestudio history
  kiestudio history bicycle
  kiestudio history --category image --json
`
