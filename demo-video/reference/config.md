# Config

`init` writes it to `~/.demo-video/configs/<project>.json` (`init --here`:
`./demo.config.json`) from `templates/demo.config.json`. Lookup order:
`--config <file>`, `DEMO_VIDEO_CONFIG`, `./demo.config.json`,
`~/.demo-video/configs/<project>.json`, where `<project>` is the name of the
folder the command runs in. Only `baseURL` is required. A key left out keeps
its default, and so does a sub-key left out of a nested object
(`"pace": {"typeCps": 18}` keeps the other pace values). An unknown key or a
bad value stops every command with a message naming it. Relative paths
resolve against the folder the command runs in.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `baseURL` | string | none (required) | App address the scenario's relative `page.goto()` calls resolve against. |
| `project` | string \| null | `null` | Name used for `configs/`, `auth/` and `runs/` under `~/.demo-video`; `null` = the folder's name. A plain name, not a path. |
| `storageState` | path \| null | `null` | Saved login session written by `login`, loaded when recording; `null` = `~/.demo-video/auth/<project>.json`. |
| `outDir` | path \| null | `null` | Where run folders `<YYYY-MM-DD-HHMMSS>-<scenario>/` go; `null` = `~/.demo-video/runs/<project>`. Must lie outside the scenario's folder, which each run copies. |
| `deliverDir` | path \| null | `null` | Root of the deliverables folders `<scenario>-<YYYY-MM-DD-HHMM>/`; `null` = `~/Desktop/Demo Videos`. |
| `laptop.width` | number | `1920` | Laptop recording width in px: sets its resolution. The height follows the video's shape, `width x (1080 - band) / 1920` (band = `caption.bandHeight` in `band` mode, else 0), so the recording fills the video area without cropping. |
| `laptop.height` | number | `1080` | Not used for the recording, whose height follows `laptop.width`; a value that is not `laptop.width x 9 / 16` prints a warning. |
| `phone.enabled` | boolean | `false` | Also record a phone clip (mobile, touch) and show it in a phone frame. |
| `phone.width` | number | `390` | Phone viewport width in px. |
| `phone.height` | number | `844` | Phone viewport height in px. |
| `busySelector` | CSS selector | `[aria-busy="true"]` | While this matches, the page counts as loading; the wait is cut. |
| `maxWaitMs` | number | `1200` | Any single action or wait longer than this is cut to 500 ms. |
| `allowWrites` | string[] | `[]` | Every request other than GET, HEAD and OPTIONS (browser, Playwright request contexts, Node fetch/http/https) is blocked unless its URL without the query string (origin + path) contains one of these strings. A regex starts with `re:`, e.g. `"re:^https://api\\.example\\.com/"`. An entry may end in ` [Next-Action=<id>]` (or ` [header:<name>=<value>]`) and then matches only a request that also carries that header with exactly that value, e.g. `"/dashboard [Next-Action=7f3a...]"`. An entry may instead end in ` [Next-Action-Name=<name>]`, `<name>` being `<file>#<export>` as the build's manifest lists it (e.g. `"/ [Next-Action-Name=src/app/page.tsx#searchProducts]"`) or a bare export name found in one file only: at each `record` it becomes one `[Next-Action=<id>]` entry per id the Next.js build has for that action (production build and dev server), since ids change with every build; a name the build does not list stops `record`. Inline actions (a `"use server"` function inside a component) are listed as `$$RSC_SERVER_ACTION_<n>`, their order in the file. An empty entry, a regex that does not compile, or a malformed `[Next-Action=...]`/`[Next-Action-Name=...]`/`[header:...]` ending stops every command. `record` suggests an entry for each blocked path, with `[Next-Action-Name=<file>#<export>]` (or `[Next-Action=<id>]` when the build does not list it) when the request was a Next.js server action; frameworks such as Next.js server actions send reads as POST, so a blocked POST may be a read. Every action on a page posts to the page's path, so a plain path entry allows all of them, writes included; keep the id. Add one only when the request writes nothing. |
| `allowWebSockets` | boolean | `false` | WebSockets are closed during recording (each is listed as blocked), since a write sent over one cannot be checked. `true` lets them through, with a warning. |
| `allowDevSockets` | boolean | `true` | Development live-reload sockets connect and are logged as allowed: `/_next/webpack-hmr`, `/_next/hmr`, `/sockjs-node`, and Vite's socket (`/` with a `token` query, only on the app's own host:port). Only on a loopback host (`localhost`, `*.localhost`, `127.*`, `::1`): a dev server runs there, while the same path on a deployed app could carry real writes. Plain `/ws` is not allowed, since apps use it for data; a dev server whose live reload uses it (webpack-dev-server) needs `allowWebSockets` or a production build. With it off, a dev page reloads in a loop and recording stops with "page keeps reloading". |
| `blur` | CSS selector[] | `[]` | Elements blurred on screen during recording. |
| `caption.mode` | `"band"` \| `"overlay"` \| `"off"` | `"band"` | `band`: the page is recorded above a solid caption band, so captions never cover it. `overlay`: caption pills over a full-frame recording. `off`: nothing burned. All three write `.srt`/`.vtt`; only `off` embeds a soft subtitle track, since players show a lone MP4 subtitle track by default and would draw it over burned captions. |
| `caption.bandHeight` | number | `120` | Band height in px (about two lines of caption text). |
| `caption.position` | `"bottom"` \| `"top"` | `"bottom"` | Where `overlay` pills sit. |
| `caption.background` | CSS color | `#111827e6` | Caption pill color (8-digit hex includes alpha). |
| `caption.color` | CSS color | `#ffffff` | Caption text color. |
| `caption.font` | CSS font-family | `Inter, system-ui, sans-serif` | Caption and card font. |
| `title.text` | string \| null | `null` | Title card heading; `null` derives it from the scenario file name. |
| `title.subtitle` | string \| null | `null` | Line under the title; `null` shows the recording date. |
| `end.text` | string | `Thank you` | End card text. |
| `voice.name` | string \| null | `null` | TTS voice for `record --voice`; `null` picks the best installed English voice. |
| `voice.rate` | number | `160` | Speaking rate in words per minute (`say -r`, espeak `-s`): calm rather than brisk. |
| `pace.msPerChar` | number | `55` | Caption reading time per character. |
| `pace.minStepMs` | number | `1800` | Minimum on-screen time of a step without narration. A narrated step lasts at least its speech plus the larger of `pace.breathMs` and `pace.voiceLeadMs` instead. |
| `pace.captionLeadMs` | number | `300` | Caption appears this long before its step's first action. |
| `pace.settleMs` | number | `400` | Pause after each action so its effect is seen. |
| `pace.typeCps` | number | `14` | Typing speed in characters per second, also for `fill`. |
| `pace.breathMs` | number | `450` | Least silence after each spoken sentence, a natural gap. Only ever the minimum: a step whose action already outlasts its speech gets no extra pause. After a Recordly edit, a clip that would run into this gap is sped up by at most 1.1x, else the next clip and its caption wait. 0 or more. |
| `pace.voiceLeadMs` | number | `250` | How long after its caption appears a step's narration starts. 0 or more. |
| `timeoutMin` | number | `10` | Time limit per clip; the message names the step that was running. |
| `actionTimeoutSec` | number | `60` | While recording, how long one action or `expect` waits (Playwright's actionTimeout and expect timeout), so a missing element fails in about this long with its locator named. Page loads get `max(actionTimeoutSec, 60)` s. |
| `rehearsalActionTimeoutMs` | number | `5000` | The same limit in the rehearsal, kept short so a broken locator stops it in seconds; raise it for an app that is only slow. |
| `stopOn` | string[] | `[]` | Texts that must never show: when one appears in the page's visible text during the rehearsal or recording, the run stops at once with `page shows "<text>" in step "<step>"` (e.g. `["No matches"]`). |
| `nextBuildDir` | path \| null | `null` | The Next.js build folder whose `server/` and `dev/server/server-reference-manifest.json` resolve `[Next-Action-Name=...]` entries and name blocked actions; `null` = the nearest `.next` in the scenario's folder or above. |
| `recordly` | `"auto"` \| `true` \| `false` | `"auto"` | Recordly (macOS) lets the user edit the video (cuts, speed, zoom, cursor, background, shape, audio; every edit is kept and captions and narration are re-planned onto it) but needs them to export it and save the project. `"auto"` and `true`: offered only when a person is at the terminal and Recordly is installed. `false`: never. An agent or CI run uses it only with `render --recordly`; `--no-recordly` on `render`, or on the `record` of that run, turns it off. |
| `recordlyTimeoutMin` | number | `10` | How long `render` waits for the Recordly export before finishing with its own drawn cursor. After the export it looks for the saved project for 20 s more; without one the edits are recovered by aligning the export's frames (used at confidence 0.8 or more). |

Recordly exports at its own frame rate (often 30 fps). The final file is
still encoded at 60 fps, but the Recordly part moves at the export's rate, and
the summary line reports `Recordly exported <n> fps`. Only renders without
Recordly have 60 fps motion throughout.
