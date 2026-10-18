# Third-party notices

This repository is MIT-licensed (see `LICENSE` and the per-plugin `LICENSE` files). It uses the following third-party
software. Nothing below is copied into this repository's source; each is a dependency installed by the user.

| Component | Used by | Licence | Source |
|---|---|---|---|
| `@playwright/test` 1.63.0 | `plugins/skills-demo` (the `demo-video` skill, installed with `npm install`) | Apache-2.0 | https://github.com/microsoft/playwright (licence field read from the npm registry on 2026-10-18) |
| `playwright` 1.63.0 | `plugins/showreel` | Apache-2.0 | https://github.com/microsoft/playwright |
| `esbuild` | `plugins/showreel` (dev only) | MIT | https://github.com/evanw/esbuild |
| Inter font (via `@fontsource/inter` 5.3.0) | `plugins/showreel/assets/fonts` (redistributed woff2) | SIL OFL 1.1 (`OFL.txt` alongside) | https://github.com/rsms/inter |
| `mediabunny` | `plugins/showreel` (dev only for now) | MPL-2.0 | https://github.com/Vanilagy/mediabunny |

`plugins/ctx` is standard-library Python and has no third-party runtime dependencies. CI tooling (GitHub Actions and
ruff, coverage, build and hatchling in CI only) is not redistributed.

If code or rules are later adapted from another project (for example Caveman, Apache-2.0, or ccusage, MIT), add the
project, licence and what was adapted here in the same change.
