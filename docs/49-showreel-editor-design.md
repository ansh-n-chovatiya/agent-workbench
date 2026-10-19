# Showreel editor: design system and layout (Phase 5)

Source: ui-ux-pro-max skill (Minimalism / Swiss style, dense, dark-first, subtle motion), shadcn/ui component conventions, and references the owner likes (Recordly, OpenScreen).
Goal: a calm, compact tool that a non-technical person understands at a glance and that always fits the window.

## Principles
1. **Always fits the window.** The page never scrolls. `height: 100dvh`; every region scrolls on its own. Supported down to 1024x640.
2. **One primary action per area.** Export is the only filled button. Everything else is quiet (ghost/outline).
3. **Plain words.** Labels say what the viewer sees ("Cursor size", "Intro card"), not what the file calls it. Every control has a one-line help in a tooltip or beneath it. First-run hint card explains cut / speed / zoom in three lines, dismissible.
4. **Dense but legible.** 13 px body, 12 px helpers, 32 px control height, 8 px grid. Contrast 4.5:1, visible focus rings (2 px ring, offset 1), full keyboard use, `prefers-reduced-motion` respected, hover/press transitions 120-180 ms.
5. **Dark first, light supported.** Follows the OS, with a sun/moon toggle (remembered; storage access wrapped in try/catch).

## Tokens (shadcn "zinc" tokens as CSS variables, HSL; Tailwind v4 `@theme`)
Dark: background 240 6% 7%; card/panel 240 5% 10%; popover 240 5% 11%; muted 240 4% 16%; muted-foreground 240 5% 65%; border 240 4% 18%; input 240 4% 20%; foreground 0 0% 96%; primary (Showreel teal) 168 70% 52% with primary-foreground 240 6% 7%; ring = primary; destructive 0 72% 55%; timeline accent (selection) 217 91% 60%.
Light: background 0 0% 99%; panel 0 0% 100%; muted 240 5% 96%; muted-foreground 240 4% 40%; border 240 6% 90%; foreground 240 10% 8%; primary 170 78% 25% (on 0 0% 100%); ring primary.
Radius: 8 px panels, 6 px controls. Shadow only on popovers and dialogs. Font: Inter (the bundled Inter-Regular and Inter-SemiBold woff2 from /fonts; weights 400/600 only; `font-feature-settings: 'cv11', 'ss01'` optional; tabular numbers for time codes).

## Layout (CSS grid, no fixed pixel heights except bars)
```
+--------------------------------------------------------------------------------+
| Top bar 48px: logo - project name - save status | Undo Redo | theme | [Export]   |
+--------------------------------------------------+-----------------------------+
| Stage (1fr, min-height 0)                        | Settings panel 320px        |
|  Preview canvas centred, fits the free area      |  search                     |
|  (contain, ResizeObserver, no scrollbars)        |  tabs: Look Cursor Zoom     |
|  Transport bar 40px under the preview            |  Captions Intro/Outro Size  |
|                                                  |  scrolls inside             |
+--------------------------------------------------+-----------------------------+
| splitter (drag, 6px, double-click resets)                                      |
| Timeline (default 34% of height, min 190px, max 60%), scrolls inside           |
|  toolbar 40px | tracks area (scroll x and y) with sticky label column          |
+--------------------------------------------------------------------------------+
```
Below 1100 px width the settings panel becomes a 280 px column; below 900 px it collapses to a toggle button that opens it as a sheet.

## Components (shadcn conventions, Radix primitives through preact/compat, Tailwind classes, cva variants)
Button (default, secondary, outline, ghost, destructive; sizes sm 28, default 32, icon 32), Input, Label, Select (Trigger, Content, Item with check, scroll buttons), Checkbox, Switch, Slider (single thumb, with the numeric input beside it), Tabs, Dialog (export, shortcuts), Popover (speed, depth), Tooltip (all toolbar and icon buttons, with shortcut hints), Badge (e.g. "auto", "manual"), Separator, Toggle for Output/Source time. Icons: lucide-preact (SVG, 16 px, `aria-hidden` when next to a label, `aria-label` when icon only).
Settings control rules: toggles use Switch; 2-6 options use a segmented control (Tabs-like ToggleGroup) when short ("Band / Overlay"), otherwise Select; numbers use Slider + compact Input with unit suffix; colours use a swatch button opening a Popover with the native colour input and hex field; each row: label left, control right when it fits, else stacked; reset icon appears only when the value differs from default; sections are collapsible with "Advanced" collapsed.

## Timeline styling
Row height 28 px; label column 88 px sticky; ruler with major ticks every 1/2/5/10 s depending on zoom, tabular numbers; playhead 2 px primary line with a triangle handle; blocks: Video (muted card colour with step name), Speed (amber 30%), Zoom (blue 30%, depth badge), Captions (green 30%), Cursor (small primary diamonds); selected block gets a 2 px ring; trimmed ranges hatched; hover shows the resize handles; compact summary line ("Result 0:20 · removed 0:03 · 1 cut") above the tracks. Toolbar groups separated by Separators: [Split, Cut] [Speed] [Add zoom + depth, Auto zoom] [Add caption] [Restore] ... [Source/Output time, zoom -/+].
Toolbar names: Split, Cut, Speed, Add zoom, Auto zoom, Add caption, Restore. Tabs: Look, Cursor, Zoom, Captions, Intro & outro (was Cards), Size & quality (was Output).

## Empty/first-run and feedback
Hint card (dismissible, remembered): "Drag on the Video track to select a part. Press Delete to cut it, or choose Speed to fast-forward it." Toasts for undo/redo/save errors (small, bottom-centre). Disabled buttons have a tooltip that says why.

## Phase 6 additions: voice, music and preview audio
- **Tabs:** Look, Cursor, Zoom, Captions, Intro & outro, **Voice**, **Music**, Size & quality. Voice and Music are custom panels (`VoicePanel.jsx`, `MusicPanel.jsx`) that show every `audio.*` setting of the schema; Music ends with a "Mix and loudness" section (level the sound, target loudness, peak limit) and a "Last measured" line filled from the last export.
- **Voice panel:** engine card (not installed: plain-language explanation and a copyable `showreel voice install --yes`; the editor never installs anything), narrator (on/off, voice picker grouped by language with a sample button per voice, speed 0.7 to 1.3, volume), then the **Script**: one card per step with editable narration (280 characters, edits live in `composition.audio.narration.steps` so undo works), a status badge (Ready, Needs update, Not generated, Your recording, Imported file, Muted, No narration) and icon buttons for play, generate or update, record, import, mute and remove. Timing warnings appear on the card with one-click fixes: **Freeze last frame** (adds `edits.holds`, a frozen frame in the time map) and **Slow video to fit** (slows the end of the step, never below 0.5x).
- **Timeline:** two compact tracks below Cursor, Voice (a block per clip, first words as label, warning mark) and Music (one bar with fades). Both are read-only; selecting a block moves the playhead. The tracks area scrolls vertically; the toolbar and the ruler stay.
- **Preview audio:** the whole edited timeline is mixed once with the export's mixer (debounced 400 ms, "Preparing audio..."), played through one AudioContext, and the playhead follows the audio clock minus the device latency. At any speed other than 1x the preview is silent and says so. Mute and volume sit in the transport bar when the plan has audio.
