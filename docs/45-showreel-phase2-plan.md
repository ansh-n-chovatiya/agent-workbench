# Showreel Phase 2 plan: intake, storyboard, Guide mode and scenario

Status: **complete 2026-10-18** (results in `docs/42`). Spec: `docs/40-showreel-design.md` (sections 4, 5, 16, 24, 25). Evidence: `docs/42-showreel-spike-findings.md` (S4) and
`docs/44-showreel-phase1-plan.md` (what exists). Operating model as before: Claude writes briefs and reviews every diff; Codex writes code and unit
tests (no browser, no local ports, no `~/.npm` writes); Claude runs everything that launches a browser and fixes what it finds.

**Goal.** A user-guided flow produces a working scenario with no exploration loop, and Claude spends tokens only on captions and narration.
Pipeline: `brief.json` (intake) -> `guide.json` (what the user clicked) -> `guide.resolved.json` (unique selectors) -> `storyboard.json` (Claude's captions
and narration) -> `scenario.json` (declarative actions the Phase 3 recorder will run). Nothing here records video.

## Global constraints

- All Phase 1 constraints still apply (Node range, Playwright 1.63.0 exactly, ES modules, no ffmpeg or OS speech tools, MIT, no home paths in committed files, stage
  before scanning).
- Files live in `~/.showreel/projects/<name>/` (`SHOWREEL_HOME` overrides): `config.json`, `brief.json`, `guide.json`, `guide.resolved.json`,
  `storyboard.json`, `scenario.json`. Never inside the demoed project.
- Claude never writes selectors or Playwright code. It edits only `brief.json` values, `storyboard.json` captions, narration and flags.
- Sensitive values are never stored: `<input type=password>` and fields whose `autocomplete` starts with `cc-` are recorded with `sensitive: true` and no value.
- Captions: at most 70 characters, one plain sentence, what the viewer sees and why it matters; no selectors, ids, tickets or backticks.
- Codex: no git commands; only the paths named in the task; never touch `plugins/skills-demo/`; do not run `npm install`; do not launch a browser or bind a port.

## File structure (new or changed under `plugins/showreel/`)

```
scripts/showreel.mjs                 CLI: add brief, guide, snapshot, storyboard, scenario commands
scripts/lib/project.mjs              read/write project files, require-file helpers
scripts/lib/brief.mjs                schema, defaults, validate, setPath, questions
scripts/lib/storyboard.mjs           schema, validate, draftFromGuide
scripts/lib/scenario.mjs             schema, validate, buildScenario
scripts/lib/guide/page-script.js     in-page recorder (browser code, no imports)
scripts/lib/guide/recorder.mjs       installRecorder, recordGuide
scripts/lib/guide/resolver.mjs       resolveGuide
scripts/lib/snapshot.mjs             snapshotPage, formatSnapshot
scripts/run-browser-tests.mjs        runs test-browser/*.browser.mjs with node --test
fixtures/demo-app/                   add frame.html, an iframe on features.html, a new-tab link on contact.html
test/*.test.mjs                      unit tests (no browser)
test/fixtures/guide.resolved.sample.json   canned resolved guide for pure tests
test-browser/*.browser.mjs           browser tests (run by Claude and CI, not by Codex)
skills/showreel/SKILL.md             the real flow (Claude writes this)
```

---

## Task A: brief, storyboard, scenario, project files and CLI (Codex, pure logic)

**Files:** `scripts/lib/{project,brief,storyboard,scenario}.mjs`, extend `scripts/showreel.mjs`, tests `test/{brief,storyboard,scenario,project,cli-phase2}.test.mjs`, `test/fixtures/guide.resolved.sample.json`.

### `project.mjs`
`PROJECT_FILES = { config: 'config.json', brief: 'brief.json', guide: 'guide.json', resolved: 'guide.resolved.json', storyboard: 'storyboard.json', scenario: 'scenario.json' }`;
`readProjectFile(name, key)` (throws `Error("<file> not found for project <name>; run: <command that creates it>")` with the right creating command per file);
`writeProjectFile(name, key, data, { overwrite = true })` (pretty JSON, trailing newline, creates the folder, atomic: write to a temp file in the same folder then rename);
`projectExists(name)`. All paths come from `projectDir` in `paths.mjs`.

### `brief.mjs` (schema version 1)
`DEFAULT_BRIEF` (frozen): `{ version: 1, topic: null, audience: null, targetSeconds: 60, baseURL: null, flowMode: null, theme: 'clean', titleCard: { enabled: true, title: null, subtitle: null }, outroCard: { enabled: true, text: 'Thank you' }, captions: { enabled: true, mode: 'band' }, voice: { enabled: false, tier: 'auto', name: null, language: 'en' }, music: { mode: 'none', file: null }, outputs: { landscape: true, vertical: false, gif: false }, notes: null }`.
- `validateBrief(brief)` returns `{ ok, errors: string[] }` (collects every error, one line each naming the dotted key): `version` is 1; `topic` null or non-empty string (max 200); `targetSeconds` number 10 to 600; `baseURL` null or http(s) URL; `flowMode` null, `'guide'` or `'auto'`; `theme` in `clean|dark|bold`; booleans are booleans; `captions.mode` in `band|overlay`; `voice.tier` in `auto|kokoro|kitten`; `music.mode` in `none|file|bundled` and `music.file` required when mode is `file`; unknown keys at any level are errors; `titleCard.title` and `subtitle` max 80 chars.
- `setPath(brief, dottedKey, rawValue)` returns a new brief with the value coerced by the type of the default at that key (`true/false` for booleans, numbers for numbers, `null` for the literal `null`, strings otherwise); throws `Unknown brief key "x"` for a key not in the defaults.
- `isReady(brief)`: `{ ready: boolean, missing: string[] }` where required keys are `topic`, `baseURL`, `flowMode`.
- `questions(brief)`: returns at most 4 objects `{ key, header (max 12 chars), question, options: [{ label, description }] | null, freeText: boolean }` for essentials still unanswered, in this order and only when unanswered: `topic` (freeText), `baseURL` (freeText), `flowMode` (options `Guide mode (Recommended)`: "You click through the flow once in a browser window; Claude reads the result instead of exploring" and `Auto mode`: "Claude explores the app itself; slower and costs more tokens"), then one combined question `voice.enabled` (options `Voice-over`, `Captions only`). Everything else keeps its default.

### `storyboard.mjs` (schema version 1)
Shape: `{ version: 1, title: { text, subtitle } | null, steps: [{ id, caption, narration, guideSteps: number[], zoom: 'auto'|'none', highlight: boolean, holdMs: number|null }], outro: { text } | null }`.
- `validateStoryboard(sb, { resolvedGuide = null, captionsEnabled = true })` returns `{ ok, errors, warnings }`: at least 1 step; ids unique and match `^s[0-9]+$`; caption (required when `captionsEnabled`) is 1 to 70 chars, contains none of `` ` `` `>>` `role=` `#` `[data-` ; narration is null or 1 to 280 chars and at most 45 words; `guideSteps` is a non-empty array of non-negative integers; when `resolvedGuide` is given every index must exist in `resolvedGuide.steps`, no index may be used by two storyboard steps (error), indexes must be ascending across the storyboard (error), and any resolved step not referenced is a **warning** naming the index; `holdMs` null or 0 to 10000.
- `draftFromGuide(resolvedGuide)`: one storyboard step per resolved guide step: id `s1`..; caption from the step: `click` -> `Open <name>` when the role is link, `Press <name>` when button or other, `Select <name>` for tab/radio/checkbox roles; `fill` -> `Enter <name>`; name trimmed and the caption cut to 70 chars on a word boundary; `narration: null`; `zoom: 'auto'`; `highlight: false`; `holdMs: null`; `guideSteps: [index]`. `title`: null; `outro`: null. The draft always validates.

### `scenario.mjs` (schema version 1)
Shape: `{ version: 1, baseURL, steps: [{ id, caption, narration, zoom, highlight, holdMs, actions: Action[] }] }` with `Action` one of `{ type: 'goto', url }`, `{ type: 'click', selector, tab?, frameUrl? }`, `{ type: 'fill', selector, value, sensitive?: boolean, tab?, frameUrl? }`, `{ type: 'press', selector, key, tab?, frameUrl? }`, `{ type: 'wait', ms }`.
- `validateScenario(sc)`: `{ ok, errors }`; every action has its required keys with the right types; selectors non-empty strings; a `fill` with `sensitive: true` must have `value: null` (a stored value is an error); an unfilled sensitive fill is **pending, not an error**: `validateScenario(sc, { secrets })` returns `{ ok, errors, pending }` where `pending` lists `step sN needs a secret at run time` for each sensitive step without `secrets[stepId]`; the recorder (Phase 3) refuses to start while any step is pending; the CLI prints pending items as `pending: ...` and still exits 0; `ms` 0 to 60000; `key` non-empty.
- `buildScenario({ brief, storyboard, resolvedGuide })`: throws if `validateStoryboard(storyboard, { resolvedGuide })` has errors. For each storyboard step, build actions from its `guideSteps` in order: insert `{ type: 'goto', url }` before the first action of the whole scenario (the first guide step's `url`) and whenever a guide step's `url` differs from the previous guide step's `url` **and** the previous step was not a click (a click that navigates needs no `goto`); map `click`, `fill` (copy `sensitive`; when sensitive set `value: null`), `press`; copy `tab` and `frameUrl` when present; add `{ type: 'wait', ms: 400 }` after every `fill`. `baseURL` from the brief. Returns `{ scenario, warnings }` where a warning is added for every click whose resolved `name` matches `/delete|remove|pay|purchase|buy now|place order|confirm|submit/i` (text: `step sN clicks "<name>", which may write data; writes are blocked during recording unless allowed`).
- `test/fixtures/guide.resolved.sample.json`: a realistic resolved guide of 6 steps on the fixture app (goto-less: `url` per step; a click on the 2nd `Learn more` with `how: "scoped"`, a tab switch, a `fill` on name and email, a sensitive password fill with `value` omitted, a final click on `Send message`) in the shape `{ url, steps: [{ i, action, selector, how, name, role, url, tab, frameUrl, value, sensitive }] }`.

### CLI (extend `scripts/showreel.mjs`; keep the existing commands and help text style)
All take `--name <project>`. Errors are one line on stderr and exit 1; unknown subcommands print help and exit 2.
- `brief init --name N [--url U] [--topic T]`: creates `brief.json` from `DEFAULT_BRIEF` (refuse if it exists); prints the path.
- `brief show --name N`: prints the brief JSON.
- `brief set --name N key=value ...`: applies `setPath` for each pair, validates, writes; prints `ok`.
- `brief questions --name N [--json]`: prints the questions (JSON array with `--json`, else a short numbered list; prints `[]` / `intake complete` when none).
- `storyboard draft --name N`: reads `guide.resolved.json` and writes `storyboard.json` (refuse to overwrite unless `--force`); prints the number of steps.
- `storyboard validate --name N`: validates against the resolved guide and the brief's `captions.enabled`; prints errors and warnings; exit 1 on errors.
- `scenario build --name N`: reads brief, storyboard and resolved guide, writes `scenario.json`, prints warnings; exit 1 on errors.
- `scenario validate --name N`: prints errors; exit 1 on errors.
(`guide`, `guide resolve` and `snapshot` are Task B.)

### Tests (pure, no browser, no ports; use a temp `SHOWREEL_HOME`)
Cover every validation rule with a passing and a failing case, each message names the key; `setPath` coercions and the unknown-key error; `questions` returns exactly the unanswered essentials in order, never more than 4, and `[]` when complete; `draftFromGuide` captions for link, button, fill and long names (cut on a word boundary at or under 70); drafts always validate; storyboard errors for duplicate index use, descending order, missing index; warning for an unreferenced step; `buildScenario` on the sample guide produces the exact action sequence you expect (assert the full array for at least two steps), inserts `goto` correctly, leaves the password fill with `value: null` and `validateScenario` then fails with the sensitive-field error until a value is filled; risky-click warning; CLI tests spawn `node scripts/showreel.mjs` with a temp `SHOWREEL_HOME` through the full chain `brief init -> brief set -> brief questions -> storyboard draft -> storyboard validate -> scenario build` using the sample guide copied into the project folder as `guide.resolved.json`.

**Acceptance:** `cd plugins/showreel && npm test` passes (it must still run without a browser or ports; if a Phase 1 fixture-server test fails in your sandbox because it cannot bind a port, say so and leave it).

---

## Task B: Guide mode recorder, resolver, snapshot, fixture additions and browser tests (Codex writes, Claude runs)

Reference implementations to read and productionise (do not import from them): `spikes/showreel/s4-guide/{recorder,guide,resolve,guide-auto,test-duplicates}.mjs`, the S4 section of `docs/42-showreel-spike-findings.md`.

### Fixture additions
`fixtures/demo-app/frame.html` (a small page with a button labelled `Frame button` that sets its own text to `Clicked in frame`), an `<iframe src="frame.html" title="Embedded widget">` in `features.html` (same origin), and on `contact.html` a link `Open pricing in a new tab` with `target="_blank"` to `pricing.html`. Keep every Phase 1 property (no external requests, at least 5 screens tall, 4 nav links, the existing widgets).

### `page-script.js` (browser code; exported as a string by `recorder.mjs`; no imports; must run as a Playwright init script in every frame)
Everything the S4 recorder did (synchronous facts at event time, nothing judged in the page) plus:
1. Candidate order: `[data-testid]`; `role=<role>[name="<name>"i]`; **scoped** `role` candidate; `#id`; `[aria-label]`; `text="<name>"`; scoped `text`; structural CSS path (guarded at `<html>`, depth at most 5).
2. **Scoped candidates**: climb at most 6 ancestors to the first element that contains a heading (`h1` to `h6`) or has `aria-label`/`aria-labelledby`; if the heading text is 1 to 60 chars build `<tag>:has(:is(h1,h2,h3,h4,h5,h6):text-is("<heading>")) >> <the role or text candidate>` (use the ancestor's tag name; escape quotes). The step records `scope: "<heading>"` when one was found.
3. `sensitive: true` for `input[type=password]` and `autocomplete` beginning `cc-`; never read `value` for them.
4. Events: `click` (as before), `change` -> `fill` (not for checkbox/radio: those are `click`), `keydown` with key `Enter` on an input or textarea -> `press` with `key: 'Enter'`.
5. Facts per step: `action`, `candidates`, `name`, `role`, `tag`, `url` (`location.href`), `frameUrl` (`location.href` of the frame, equal to `url` for the top frame), `isTopFrame`, `box` (page coordinates of the element inside its own frame), `scope`, `sensitive`, `value` (only for fill and only when not sensitive), `ts` (`Date.now()`).

### `recorder.mjs`
`installRecorder(context, onStep)`: `exposeBinding('__sr_event', ...)` and `addInitScript` the page script on the **context** so popups and iframes are covered; every step gets `tab`: the index of the page in order of first seen (0 for the first). `recordGuide({ url, name, headless = false, viewport = { width: 1440, height: 900 } })`: launches Chromium, opens the URL (`domcontentloaded`, 60 s, then a 3 s settle), prints `Click through your flow, then close the browser window.`, waits for disconnect, writes `guide.json` `{ version: 1, url, viewport, steps }` into the project folder, returns the steps; closes the browser in `finally`. If the window is closed with zero steps, throw `No interactions were recorded`.

### `resolver.mjs`
`resolveGuide({ guide, headless = true })` replays the steps in order in a fresh Chromium context and returns `{ version: 1, url, steps: [{ i, action, selector, how, name, role, url, tab, frameUrl, value, key, sensitive, scope }], failures: [{ i, name, why }] }` (`key` is carried for `press` steps; the scenario builder needs it). Per step: switch to the right tab (wait up to 5 s for the popup page after a click whose next step has a higher `tab`); navigate to `step.url` when the current page differs (top frame only); pick the frame whose URL equals `frameUrl` (top frame when `isTopFrame`); try candidates in order: the first with exactly one match is the selector (`how`: `unique`, `scoped` when the candidate contains `:has(`, `css` for the structural path, otherwise `unique`); else the multi-match candidate whose match is nearest the recorded box centre within 40 px becomes `<candidate> >> nth=<k>` (`how: 'nth'`); else a failure. Then perform the action (click, fill with the recorded value, press) with a 6 s timeout and a 2 s settle. Fills of sensitive steps are skipped during replay (not performed). The result file is written by the CLI as `guide.resolved.json`; failures stay in the file under `failures`.

### `snapshot.mjs` (Auto mode support; token-lean)
`snapshotPage({ url, max = 60, viewport })`: opens the page headless, waits for `domcontentloaded` plus 3 s, and returns `{ title, headings: string[] (h1 to h3 text, at most 12, each cut to 60 chars), elements: [{ role, name, selector, y }] }` for visible interactive elements (links, buttons, inputs, selects, textareas, tabs, summary; `y` rounded page offset) using the same candidate engine and uniqueness rule as the resolver (first unique candidate, else the scoped one, else `>> nth=`), sorted by `y`, capped at `max`. `formatSnapshot(snapshot)` returns compact text, one line per element: `<role> "<name>" -> <selector>`, preceded by `# <title>` and a `headings:` line; the whole output for the fixture index page must stay under 4 KB.

### CLI additions
- `guide --name N [--url U]`: URL defaults to the brief's `baseURL`; runs `recordGuide`; prints the number of steps and the path.
- `guide resolve --name N`: reads `guide.json`, runs `resolveGuide`, writes `guide.resolved.json`, prints `<resolved>/<total> steps resolved` and each failure; exit 1 when any failure.
- `snapshot --url U [--max N]`: prints `formatSnapshot(...)`.
- `guide add --name N --action click|fill|press --selector S --label L [--role R] [--url U] [--value V] [--key K] [--tab T]`: **Auto mode helper**: appends one step to `guide.json` (creating `{ version: 1, url, viewport, steps: [] }` from the brief's `baseURL` when the file does not exist) with `candidates: [S]`, `name: L`, `role` (default empty), `url` (default: the previous step's url, else `baseURL`), `frameUrl` equal to `url`, `isTopFrame: true`, `box: null`, `scope: null`, `sensitive: false`, `tab` (default 0); validates the action (`fill` needs `--value`, `press` needs `--key`) and prints the new step number. The resolver treats `box: null` as "no nth fallback" (a multi-match then fails with a clear reason).

### Browser tests (`test-browser/*.browser.mjs`, run through `scripts/run-browser-tests.mjs`; `package.json` script `test:browser`)
Use `startFixtureServer`, a temp `SHOWREEL_HOME`, and a **synthetic user** (Playwright driving a headed-or-headless context with `installRecorder`): (1) the second `Learn more` link: after `resolveGuide` its selector is unique and points at the second card (assert the enclosing card heading); `how` is `scoped`; (2) a tab-switcher click and an accordion (`details/summary`) click resolve and replay; (3) the contact form: name and email fills resolve; a password field (add one to a test-only HTML page served by the test) is `sensitive` with no value stored; (4) the `Open pricing in a new tab` click records `tab: 1` for the next step and the resolver follows it; (5) the iframe button resolves with a `frameUrl`; (6) the full guide has `failures: []`; (7) `snapshotPage` on `/index.html`: at least 12 elements, the three `Learn more` entries have three different selectors each matching exactly one element, `formatSnapshot` under 4096 bytes. Tests must close every browser in `finally`.
`scripts/run-browser-tests.mjs`: lists `test-browser/*.browser.mjs` and runs `node --test <files...>` (no glob and no directory argument: they fail on some Node versions), forwarding the exit code.

**Acceptance (Claude runs):** `npm run test:browser` passes on this Mac; `npm test` still passes; a full manual-style run through the CLI on the fixture app produces `guide.resolved.json` with no failures.

---

## Task C: SKILL.md, CI and the end-to-end check (Claude)

- Rewrite `skills/showreel/SKILL.md` with the real Phase 2 flow (under 100 lines): intake with `brief questions`, Guide or Auto mode, `guide resolve`, `storyboard draft` and the rules for editing captions and narration, `scenario build`, and an explicit "not available yet: record, edit and export (Phase 3 onward)" so Claude does not promise a video.
- CI: add a `Browser tests` step (`npm run test:browser`, no `continue-on-error`) to the showreel job before the smoke tests.
- End-to-end check on the fixture app and on `https://anshchovatiya.vercel.app/`: Guide mode with a synthetic user, then the CLI chain to `scenario.json`; record the token cost of the Claude-written part (captions and narration only) against the Phase 8 budget.
- Update `docs/42`, the spec and this plan's status; commit in pieces; scan after staging; push; confirm CI on three OS.

**Decisions made during Task A (2026-10-18):** Codex found two contradictions in this plan and left the tests failing rather than bending them: (1) `voice.enabled` defaulted to false, so intake could not tell unanswered from answered, now `null`; (2) a sensitive value must stay null yet validate once filled, now a *pending secret* concept. Both are reflected above.

## Exit criteria

Every acceptance line met or its failure recorded; the Guide pipeline resolves a mixed flow (duplicate links, tabs, accordion, form, popup tab, iframe) with zero failures; `scenario.json` validates; CI green on three OS; `skills-demo` untouched.

## Budget and stop rule

0.5 to 1.0M Claude tokens. Stop and ask the owner if Task B needs more than three browser-debug rounds, or if popups or iframes cannot be resolved reliably.
