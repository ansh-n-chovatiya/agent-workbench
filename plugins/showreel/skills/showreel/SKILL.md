---
name: showreel
description: Preview of the Showreel demo-video skill (under development). Use only when the user names "showreel" explicitly; for ordinary demo videos use demo-video.
---

# Showreel (preview)

Turns a web flow into a demo video. This release covers **intake, capturing the flow and the storyboard**. Recording, editing and export are not built
yet: do not promise a finished video. If the user wants a video today, offer the `demo-video` skill.

Run `node <skill>/scripts/showreel.mjs <command> --name <project>`; `<project>` is a short slug (the app's name). Files live in `~/.showreel/projects/<project>/`.
Start with `doctor` if anything looks wrong.

## 1. Intake: ask only what is missing

1. `brief init --name P --url <app URL> --topic "<what the video is about>"` (skip if `brief.json` exists).
2. `brief questions --name P --json` returns the unanswered questions (at most 4). Ask exactly those: use AskUserQuestion for questions with options, plain text for
   `freeText`. Save answers with `brief set --name P flowMode=guide voice.enabled=true` (dotted keys). Repeat step 2 until it prints `[]`.
3. Do not ask about anything else. Theme, cards, outputs and music keep their defaults unless the user asked to change them.

## 2. Capture the flow

- **Guide mode (default).** Tell the user: "A browser window will open. Click through the flow once, roughly, then close the window." Run `guide --name P`, then
  `guide resolve --name P`. If steps fail, tell the user which steps (by their names) and re-run `guide`; never edit selectors yourself.
- **Auto mode.** Run `snapshot --url <URL>` (compact list of the page's interactive elements with selectors; never read the DOM or take screenshots to find buttons).
  Add each action with `guide add --name P --action click --selector '<selector>' --label '<what it is>' --url <page URL>`, then `guide resolve --name P`.

## 3. Storyboard: the only part you write

`storyboard draft --name P` creates one step per recorded action. Then edit `storyboard.json` (captions, narration, `zoom`, `highlight`, `holdMs`; merge or drop
steps by editing `guideSteps`). Rules:

- **Caption:** one plain sentence, at most 70 characters, what the viewer sees and why it matters. No selectors, ids, backticks or ticket numbers.
- **Narration** (only when `voice.enabled`): conversational, present tense, at most 45 words per step; total under `targetSeconds x 2.5` words.
- Keep the step order: `guideSteps` must ascend across the storyboard.
- Run `storyboard validate --name P` and fix every error. A warning about an unused step is fine if you dropped it on purpose.

## 4. Scenario

`scenario build --name P` turns the storyboard and the resolved guide into `scenario.json` (the declarative actions the recorder will run), then
`scenario validate --name P`. Read the warnings: a click that may write data (delete, pay, submit) is blocked while recording unless the user allows it, so
tell them. A sensitive field (password, card number) has no value: never ask the user for a secret; skip that step or let them log in separately.

## Token discipline

Do not read `guide.json`, `guide.resolved.json` or `scenario.json` in full; use the command output. Edit only captions and narration. No screenshots.

## Not available yet

Recording, the editor, voice, music, themes and export. Say so plainly and stop after the scenario is built; offer to continue when those ship.
