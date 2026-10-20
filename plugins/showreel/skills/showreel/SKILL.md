---
name: showreel
description: Create demo videos from web flows with Showreel: capture or automate a walkthrough, record, add captions and optional narration, then edit and export locally. Use for Showreel projects and web-app demo videos.
---

# Showreel

Commands use `showreel` as shorthand for `node <plugin>/scripts/showreel.mjs`.
`N` is the project slug. Ask for the app URL, topic and desired flow if missing.
Auto mode is the default for a described flow; use Guide mode for a person-led walkthrough.

## Auto mode (default)

1. Write `plan.json` with a single Bash heredoc or the Write tool. Run make in
   the SAME tool call when possible, so the whole job takes about 2 tool calls.
2. One-command flow: `showreel make --name N --plan plan.json --record --render --to FOLDER`.
   Use the user's export folder, or omit `--to` to use the saved/platform default
   (Movies/Showreel or Videos/Showreel). For vertical add `--format vertical --profile phone`.
3. If a stage fails, follow its exact step/fix and rerun the same command.
   Completed stages are reused when the plan is unchanged.
4. Report the `Final video:` path. Use `showreel edit --name N` for tweaks:
   cuts, speed, zooms, captions, theme, branding and export.

Worked five-step `plan.json` (local demo-app fixture):
```json
{
  "url": "http://localhost:3000",
  "topic": "Explore Fieldnotes",
  "audience": "New teammates",
  "theme": "clean",
  "steps": [
    {"caption":"Welcome to Fieldnotes","do":[{"goto":"/"}]},
    {"caption":"Share your plan","do":[{"click":{"role":"tab","name":"Share"}}]},
    {"caption":"Review the work","do":[{"click":{"role":"tab","name":"Review"}}]},
    {"caption":"Explore the features","do":[{"click":"Features"}]},
    {"caption":"Compare the plans","do":[{"click":"Pricing"}]}
  ]
}
```

Actions: `goto` URL/path, `click` visible text or `{role,name}`,
`fill: {label,value}`, `scroll` pixels, `wait` milliseconds, `press` key.
Plan keys: `url`, `topic`, `audience?`, `theme?`, `profile?`,
`steps[{caption, narration?, do[...]}]`. Captions default on; voice defaults off.
Optional step `narration`: only when requested.
Enabled voice needs locally generated clips
(`voice install --yes` then `voice generate --name N`) before the final export.
Theme is clean|dark|bold; profile is desktop|phone.
For a secret fill use `{"fill":{"label":"Password","value":{"secret":"MY_PASSWORD"}}}`;
the person supplies that environment variable before running the command.

## Guide mode

1. `brief init --name N --url URL --topic "TOPIC"`.
   `brief set --name N flowMode=guide voice.enabled=false` for captions only.
   Use `brief questions --name N` only for unanswered intake.
2. Explain that the person clicks through once and closes the window.
   Run `guide --name N`, then `guide resolve --name N`.
3. `storyboard draft --name N`; edit only captions/narration in storyboard.json.
   Draft is idempotent; `--force` explicitly replaces an existing storyboard.
4. `storyboard validate --name N`, `scenario build --name N`,
   `scenario validate --name N`, `record --name N`.
5. `edit --name N` for finishing, or `render --name N --to FOLDER`.

For existing selector-based guides, batch additions in one call:
`guide add --name N --file steps.json` or `--json '[...]'`.
Each item uses action, selector, label, and optional url/value/key/role/tab.

## Rules

- Captions: plain language, at most 70 characters per step.
- Narration: at most 45 words per step, only when requested.
- Never invent selectors: click by visible text or an ARIA role/name.
  The resolver supplies unique selectors; use its closest candidates on failure.
- Never store secrets. Use environment references in plans, or `login --name N`.
  Guide recordings use `SHOWREEL_SECRET_<STEPID>` (uppercase) at runtime.
- Prefer summaries; use `--json` only for machine output or detailed failures.
  Do not read frames, logs or generated files in full unless a run fails.
- Projects live in `SHOWREEL_HOME/projects/N` (default `~/.showreel`).
  Exports belong in the user's chosen folder outside project state.

Run `showreel audit` only when the user asks for QA.
