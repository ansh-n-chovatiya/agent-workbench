---
name: showreel
description: Create demo videos from web flows with Showreel: capture or automate a walkthrough, record, add captions and optional narration, then edit and export locally. Use for Showreel projects and web-app demo videos.
---

# Showreel

Showreel turns a web flow into a demo video with cursor motion, zooms, captions,
optional local voice-over, themes and branding. The local editor handles finishing.
Overlays and templates do not exist.

Commands below use `showreel` as shorthand for
`node <plugin>/scripts/showreel.mjs`. `N` is the project slug.

## Flow (in order)

1. Run `showreel doctor`. Resolve required environment failures before recording.
2. Intake: `brief init --name N --url URL --topic "TOPIC"` unless it exists.
   Run `brief questions --name N --json`; ask only unanswered questions.
   Save with `brief set --name N key=value` (dotted keys supported); repeat until `[]`.
3. Choose the intake's flow mode:
   - Guide: explain that the user clicks through once and closes the window;
     run `guide --name N`, then `guide resolve --name N`.
   - Auto: `snapshot --url URL` lists controls with selectors. Use those selectors
     in `guide add --name N --action click --selector 'SELECTOR' --label 'LABEL' --url URL`;
     then `guide resolve --name N`. Resolve failures before proceeding.
4. Run `storyboard draft --name N`; edit only captions and narration in
   `storyboard.json`. Run `storyboard validate --name N`; fix errors.
5. Run `scenario build --name N`, then `scenario validate --name N`.
6. Run `record --name N`; use `record --name N --profile phone` for vertical.
7. Only if the user wants voice-over: `voice install --yes` (if missing), then
   `voice generate --name N`. Otherwise skip voice installation and generation.
8. Run `edit --name N` to open the local editor. The user does cuts, speed,
   zooms, captions, theme, brand and export there.
9. For CLI export: `render --name N --to FOLDER`.
   Add `--format vertical` for 9:16; `--size 720|1080|1440|4k` selects resolution.
   Record with the phone profile before exporting vertical.

For multi-video sequences, add completed runs with
`scenes add --name N --run RUN_ID` in playback order; edit or render the sequence.
For reusable branding: `brand init --brand BRAND`, then
`brand apply --name N --brand BRAND` before recording; also available in the editor.

## Claude rules

- Write only captions and narration; let commands generate actions and other files.
- Caption: plain language, at most 70 characters per step.
- Narration: only when requested, at most 45 words per step.
- Never invent selectors; use resolver results. Re-capture or resolve failed steps.
- Never put secrets in files. Use `SHOWREEL_SECRET_<STEPID>` environment variables
  (uppercase step ID); let the user supply them or log in separately with `login`.
- Keep tokens minimal: use command summaries; do not read video frames or logs
  unless a run fails. Do not read generated guide/scenario files in full.

- Prefer default short command outputs; use `--verbose` or `--json` only for details.
- Run `showreel tokens --name N` at the end only if the user asks about cost.

## Files

`SHOWREEL_HOME` defaults to `~/.showreel`; projects live in `projects/<name>/`.
Each project holds brief, guide, storyboard, scenario, recordings and composition.
Exports go to the user's chosen folder; default `~/Movies/Showreel` on macOS,
`~/Videos/Showreel` on Windows/Linux. Keep exports outside project state.
