# Showreel Phase 7 plan: themes, motion templates, brand kit, multi-scene, vertical

Status: executing from 2026-10-19. Spec: `docs/40-showreel-design.md` sections 10, 11, 21 (quality bar). Owner stop rule: stop after Phase 7 unless told otherwise.
Operating model: Claude plans, reviews and runs everything real (browsers, timing, listening/looking); Codex writes code and pure tests.
Acceptance (from the spec table): three themes render the same storyboard distinctly. Plus the section 10/11 features below.

## Decisions
1. **Templates are drawn, not authored per video.** Each template is a small pure module: a JSON parameter schema (validated, with defaults), a timing model (enter, hold, exit using our own easing token table) and a canvas 2D draw function in `draw.js`. Claude fills a handful of values (text, colour token, position); nothing is generated as HTML per video, so token cost stays near zero. Templates live in `scripts/lib/compose/templates/*.mjs`; the registry exports `TEMPLATES`.
2. **Overlays are data in the composition** (`overlays: [{ id, template, start, end, params, anchor }]`), in SOURCE time like captions and zoom, so cuts and speed changes keep them in sync through the time map. The editor shows them on an Overlays timeline track and a params form generated from the template schema.
3. **Easing tokens** (own table, spec section 10): standard curves, longer cinematic durations (entrances 400-700 ms, exits 250-400 ms, exits faster than entrances), springs for camera and cursor only, ease-out for entrances, ease-in-out for moves, no scale from zero (start at 0.92), no bounce by default. Every template and transition uses them; one file `scripts/lib/compose/easing.mjs`.
4. **Themes:** `clean`, `dark`, `bold` (bold must differ clearly: high-contrast saturated gradient or solid, heavier type weight, larger caption text, chunkier cursor and frame). A theme sets background, frame, cursor, caption, card, overlay colours and typography tokens, zoom feel (depth and speed defaults) and the default transition. Open fonts only (Inter already; add one display face under OFL for bold, e.g. Space Grotesk or Sora SemiBold/Bold, licence file kept).
5. **Brand kit** (`brand.json` per client in `<SHOWREEL_HOME>/brands/<name>/`, with logo and font files beside it): logo (png/svg/webp), colours (primary, accent, background, text), fonts (woff2 or ttf, OFL or user-owned; a warning that the user is responsible for licences), intro and outro text and styling, watermark (position, opacity, size), default theme. `showreel brand init|show|set|list|apply --name N --brand B`. Applying a brand resolves into the composition's token overrides (it does not copy files into the project; assets are referenced by brand name and served by the editor/render server with the same safety rules as other assets).
6. **Multi-scene:** a project can hold several scenes (each a recording run) in `scenes.json` with per-scene trims, transition to the next (crossfade, slide, zoom-through, cut), and an optional chapter title. The time map gains a scene layer (sum of scenes with transition overlaps); the compositor draws the active scene(s) (two sources during a transition); captions, zoom, overlays and narration belong to a scene (offset by the scene's start). Chapters are written as `chapters.txt` (YouTube format) and `chapters.vtt`.
7. **Vertical 9:16:** record again with a phone viewport profile (`record --profile phone`: 390x844 CSS px, mobile user agent and touch emulation, deviceScaleFactor-based sharpness through the existing capture scale) and compose to 1080x1920 with a vertical layout (frame fills width with small padding, caption band sized for vertical, safe zones for platform UI). `brief.outputs.vertical` produces a second render; both outputs share captions, narration and music.

## Tasks
- **A (Codex): themes, easing, templates and overlays** (engine, 12 templates, bold theme and display font, composition `overlays`, plan integration, draw, tests).
- **B (Codex): vertical** (phone recording profile, vertical layout and output presets, CLI flags, tests).
- **C (Codex): brand kit** (schema, CLI, resolve into composition, watermark, logo and fonts, tests).
- **D (Codex): multi-scene and chapters** (scenes.json, scene time map, multi-source compositor, transitions, chapters output, tests).
- **E (Codex): editor UI** for overlays (templates picker, params form, timeline track), themes and brand panels, scenes strip, vertical preview toggle.
- **F (Claude): integration** (real recordings in all three themes side by side, a vertical recording of the live portfolio, a two-scene video, visual and listening review, golden frame tests, CI, docs, SKILL.md update for the new features).

## Exit criteria
Three themes render the same storyboard distinctly (side-by-side contact sheet reviewed by the owner); the 12 templates render and keep timing under cuts; a brand applied to a project changes logo, colours, fonts, intro/outro and watermark; a two-scene video exports with transitions and chapters; a vertical video exports at 1080x1920 from a phone-viewport recording; three-OS CI green.

## Status at end of 2026-10-19 (paused by the owner; resume here)
Done and verified (375 unit, 46 browser tests, real renders reviewed): themes clean/dark/bold (distinct on the real recording); easing tokens; 12 templates and overlays with source-time sync, frame-safe placement,
measured plates, auto callout leader (reviewed and fixed after a first review round); vertical: phone recording profile (real recording of the live portfolio, 519x1123 at scale 1.33, 59.7 fps) and a source-aspect portrait frame; brand kit (schema, CLI, precedence, logo, fonts, watermark; browser test passes).
Not done: Task D multi-scene and chapters (scenes.json, scene time map, multi-source compositor, transitions, chapters.txt/.vtt); Task E editor UI (overlays picker and params form, overlays timeline track, theme and brand panels, scenes strip, vertical preview); Task F integration (contact sheet of the three themes for the owner, SKILL.md update, CI confirmation, Phase 7 outcome).
Known visual items to polish: in vertical, the caption block touches the bottom edge of the frame and its text is large (wraps to two lines at 3.9% of height); the lower-third plate sits inside the frame but could use a little more inset on bold.
Reminder: `render --rebuild` regenerates the composition and drops saved settings (voice on, overlays, theme); use `composition set` instead.

## Owner scope update

Overlays removed on 2026-10-20 at the owner's request. The template and overlay decisions, tasks and status above are historical and superseded. Title and outro cards, captions, cursor, zoom, brand watermark, themes, easing, scenes/transitions, voice/music, vertical output and brand kit remain. Legacy composition and storyboard overlay fields are silently ignored.
