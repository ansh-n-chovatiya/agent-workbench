# Third-party notices

This repository is MIT-licensed (see `LICENSE` and the per-plugin `LICENSE` files). It uses the following third-party
software and fonts. Showreel redistributes font files and generated browser bundles in `dist/`; other dependencies are installed by the user. Build tools alone are not redistributed.

| Component | Used by | Licence | Source |
|---|---|---|---|
| `@playwright/test` 1.63.0 | `plugins/skills-demo` (the `demo-video` skill, installed with `npm install`) | Apache-2.0 | https://github.com/microsoft/playwright (licence field read from the npm registry on 2026-10-18) |
| `playwright` 1.63.0 | `plugins/showreel` | Apache-2.0 | https://github.com/microsoft/playwright |
| `esbuild` | `plugins/showreel` (dev only) | MIT | https://github.com/evanw/esbuild |
| Inter font (via `@fontsource/inter` 5.3.0) | `plugins/showreel/assets/fonts` (redistributed woff2) | SIL OFL 1.1 (`OFL.txt` alongside) | https://github.com/rsms/inter |
| Space Grotesk (latin 600/700), `@fontsource/space-grotesk` 5.3.0 | `plugins/showreel/assets/fonts` (redistributed woff2) | SIL OFL 1.1 (`SpaceGrotesk-OFL.txt` alongside) | https://www.npmjs.com/package/@fontsource/space-grotesk |
| `mediabunny` | `plugins/showreel/dist` (bundled encoder, compositor and editor; unmodified upstream modules) | MPL-2.0 | https://github.com/Vanilagy/mediabunny |
| `@floating-ui/core` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@floating-ui/core |
| `@floating-ui/dom` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@floating-ui/dom |
| `@floating-ui/react-dom` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@floating-ui/react-dom |
| `@floating-ui/utils` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@floating-ui/utils |
| `@radix-ui/number` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/number |
| `@radix-ui/primitive` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/primitive |
| `@radix-ui/react-arrow` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-arrow |
| `@radix-ui/react-checkbox` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-checkbox |
| `@radix-ui/react-collection` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-collection |
| `@radix-ui/react-compose-refs` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-compose-refs |
| `@radix-ui/react-context` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-context |
| `@radix-ui/react-dialog` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-dialog |
| `@radix-ui/react-direction` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-direction |
| `@radix-ui/react-dismissable-layer` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-dismissable-layer |
| `@radix-ui/react-focus-guards` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-focus-guards |
| `@radix-ui/react-focus-scope` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-focus-scope |
| `@radix-ui/react-id` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-id |
| `@radix-ui/react-label` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-label |
| `@radix-ui/react-popover` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-popover |
| `@radix-ui/react-popper` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-popper |
| `@radix-ui/react-portal` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-portal |
| `@radix-ui/react-presence` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-presence |
| `@radix-ui/react-primitive` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-primitive |
| `@radix-ui/react-roving-focus` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-roving-focus |
| `@radix-ui/react-select` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-select |
| `@radix-ui/react-slider` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-slider |
| `@radix-ui/react-slot` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-slot |
| `@radix-ui/react-switch` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-switch |
| `@radix-ui/react-tabs` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-tabs |
| `@radix-ui/react-tooltip` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-tooltip |
| `@radix-ui/react-use-callback-ref` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-callback-ref |
| `@radix-ui/react-use-controllable-state` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-controllable-state |
| `@radix-ui/react-use-effect-event` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-effect-event |
| `@radix-ui/react-use-is-hydrated` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-is-hydrated |
| `@radix-ui/react-use-layout-effect` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-layout-effect |
| `@radix-ui/react-use-rect` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-rect |
| `@radix-ui/react-use-size` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-use-size |
| `@radix-ui/react-visually-hidden` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/react-visually-hidden |
| `@radix-ui/rect` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/@radix-ui/rect |
| `aria-hidden` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/aria-hidden |
| `class-variance-authority` | `plugins/showreel` (runtime dependency or bundled browser module) | Apache-2.0 | https://www.npmjs.com/package/class-variance-authority |
| `clsx` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/clsx |
| `detect-node-es` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/detect-node-es |
| `get-nonce` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/get-nonce |
| `lucide-preact` | `plugins/showreel` (runtime dependency or bundled browser module) | ISC | https://www.npmjs.com/package/lucide-preact |
| `playwright-core` | `plugins/showreel` (runtime dependency or bundled browser module) | Apache-2.0 | https://www.npmjs.com/package/playwright-core |
| `preact` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/preact |
| `react` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/react |
| `react-dom` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/react-dom |
| `react-remove-scroll` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/react-remove-scroll |
| `react-remove-scroll-bar` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/react-remove-scroll-bar |
| `react-style-singleton` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/react-style-singleton |
| `scheduler` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/scheduler |
| `tailwind-merge` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/tailwind-merge |
| `tailwindcss` | `plugins/showreel` (bundled generated CSS) | MIT | https://www.npmjs.com/package/tailwindcss |
| `tslib` | `plugins/showreel` (runtime dependency or bundled browser module) | 0BSD | https://www.npmjs.com/package/tslib |
| `use-callback-ref` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/use-callback-ref |
| `use-sidecar` | `plugins/showreel` (runtime dependency or bundled browser module) | MIT | https://www.npmjs.com/package/use-sidecar |

`plugins/ctx` is standard-library Python and has no third-party runtime dependencies. CI tooling (GitHub Actions and
ruff, coverage, build and hatchling in CI only) is not redistributed.

If code or rules are later adapted from another project (for example Caveman, Apache-2.0, or ccusage, MIT), add the
project, licence and what was adapted here in the same change.
