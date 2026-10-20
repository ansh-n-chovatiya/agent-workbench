# Showreel

Turn a web flow into a demo video with cursor motion, zooms, captions, optional
local voice-over, themes and branding. Finish and export in the local editor.

Install in Claude Code:

```sh
claude plugin marketplace add ansh-n-chovatiya/agent-workbench
claude plugin install showreel@agent-workbench
```

Requirements: Node >= 20.19 (supported: Node 20.19+ in the 20.x line, or
Node 22.12+), and Chromium. From the installed plugin directory, set up dependencies:

```sh
npm install
npx playwright install chromium
npm run build
```

Quick start from that directory (or ask Claude to use `/showreel`):

```sh
node scripts/showreel.mjs doctor
node scripts/showreel.mjs brief init --name demo --url http://localhost:3000 --topic "Product tour"
node scripts/showreel.mjs brief questions --name demo --json
```

Answer only missing intake questions with `brief set --name demo key=value`.
Choose Guide (click through once with `guide`, then `guide resolve`) or Auto
(`snapshot`, `guide add`, `guide resolve`). Then run `storyboard draft`, write
captions and optional narration, `storyboard validate`, `scenario build`,
`scenario validate`, and `record`, each with `--name demo`.
Use `record --name demo --profile phone` for vertical video.

Voice-over is optional: `node scripts/showreel.mjs voice install --yes` installs
Kokoro locally; then run `voice generate --name demo`. No voice engine is needed
for silent videos.

Run `node scripts/showreel.mjs edit --name demo` for cuts, speed, zooms, captions,
theme, brand and export. For CLI export:

```sh
node scripts/showreel.mjs render --name demo --to ~/Movies/Showreel --format vertical --size 1080
```

Combine recordings with `scenes add --name demo --run RUN_ID`.
Create/apply a reusable brand with `brand init --brand BRAND` and
`brand apply --name demo --brand BRAND`. Overlays and templates are not supported.
Commands without the `node scripts/showreel.mjs` prefix above use that same CLI.

State: `SHOWREEL_HOME` (default `~/.showreel`), projects in `projects/<name>/`.
Exports use the chosen folder, defaulting to `~/Movies/Showreel` on macOS or
`~/Videos/Showreel` on Windows/Linux.

Licence: [MIT](LICENSE). See [third-party notices](../../THIRD_PARTY_NOTICES.md).
