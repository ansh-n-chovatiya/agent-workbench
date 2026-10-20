# Showreel editor v2: the "simple editor" (owner feedback 2026-10-20)

Source: owner's screenshots and screen recording of Recordly's editor, plus the owner's feedback: "our dashboard looks too confusing, actions are too complicated; Recordly handles zoom much better, has a proper box showing which area will be zoomed, and a much simpler flow for fast-forwarding, clipping and removing media."
Licence note: Recordly is AGPL-3.0. We use it ONLY as a visual and workflow reference; no code or assets are copied (it started as a fork of OpenScreen, MIT, which we may borrow from). Everything is written from scratch.

## What makes it simple (observed)
1. **One contextual panel.** A narrow icon rail on the left chooses a topic (Zoom, Cursor, Appearance, Captions, Audio, Brand, Export). The panel next to it shows ONLY what is selected: select a zoom block and the panel is the Zoom panel; select a clip and it is the Clip panel; nothing selected shows the topic's general settings.
2. **Zoom is visual.** Selecting a zoom shows a box on the preview = exactly the area that will fill the frame. Manual: drag the box to move the focus, drag its corners to change depth; Auto: the box shows where the camera will go (read-only, dashed). Depth is six one-click chips (1.25x, 1.5x, 1.8x, 2.2x, 3.5x, 5x). Auto/Manual is a two-button switch. Delete Zoom is one button.
3. **Clips, not ranges.** The video is a blue Clip track. The scissors button splits at the playhead. Selecting a clip shows a Speed grid (0.25x to 30x chips) and a Mute toggle; Delete Clip removes it (ripple). Fast-forward = pick a clip, click 4x. Cut = split twice, delete the middle. No separate Speed or Cut tracks, no Depth steppers.
4. **A tiny toolbar:** Add Layer (menu: Zoom, Caption), Add zoom (magnifier), Auto zoom (wand), Split (scissors), play controls with time, volume. Undo/redo and Export on the top bar.
5. **Layers appear when used.** Zoom and Clip always show; Caption, Voice and Music rows appear when they have content or are added from Add Layer, so the timeline is short by default.

## Our data model (small additions, old files stay valid)
- `edits.splits: number[]` (source seconds, sorted, unique, spaced >= 0.1 s): clip boundaries. No effect on rendering by themselves. Clips = segments between 0, splits and duration.
- A clip's speed = the `edits.speeds` range covering exactly that clip (reuse setSpeed; merge/split ranges when splits change: splitting a sped-up clip keeps the same rate on both halves). A deleted clip = a `edits.trims` range (reuse cutRange; ripple is automatic through the time map). A clip's Mute = `audio.mutedRanges` is NOT needed now: Mute toggles narration/music for that range via `edits.mutes: [{start,end}]` (validated like trims, applied by the audio mix: the mix zeroes that output range; unit-tested).
- Zoom region keeps `source: 'auto'|'manual'`, `depth`, `keyframes[0]` = focus. Switching to Manual freezes the current focus; Auto recomputes from the target boxes (autoZoomRegenerate for that region only).
- Zoom box geometry (pure, shared): crop rect in source CSS px at depth d around focus (x,y), clamped inside the viewport: w = W/d, h = H/d. Dragging moves the focus; dragging a corner sets d = W / newWidth (clamped 1.05 to 5, snapped to a chip within 3%).

## Layout
```
+------------------------------------------------------------------------------+
| top bar: logo  name  saved   undo redo            Format    [Export]           |
+------+-----------------+-----------------------------------------------------+
| rail | contextual panel|  preview (+ zoom box) |
| icons| 300 px, scrolls |  transport under it: time, prev/play/next, volume     |
+------+-----------------+-----------------------------------------------------+
| toolbar: [Add Layer v] | zoom+ wand scissors |                                |
| ruler                                                                         |
| Clip track  ##### ##### ####                                                   |
| Zoom track     [1.5x]      [1.5x Auto]        [1.5x]                            |
| (other layers only when present)                                               |
+------------------------------------------------------------------------------+
```
Fits any window (existing shell rules), dark first, our design tokens and shadcn components stay.

## Tasks
- R1 timeline and clips (Codex): splits/clip ops, Clip track, Zoom track blocks with edge handles, scissors, magnifier, wand, Add Layer menu, layers-on-demand, clip panel data and ops, mutes, tests.
- R2 shell, panels and zoom box (Codex): left rail + contextual panels (Zoom, Clip, topic panels reusing Settings/Voice/Music/Brand panels), zoom box on the preview with drag/resize, Auto/Manual, depth chips, simplified top bar, tests.
- R3 (Claude): integrate, run in a real browser, side-by-side review against the Recordly screenshots, fix.

## Exit criteria
A first-time user can: split a clip, change a clip to 4x, delete a clip, add a zoom, see and move its box, switch it between Auto and Manual, change its depth with one click, and export, without opening any menu other than Add Layer. All existing editor capabilities remain reachable (through the rail topics). Real-browser tests pass at 1024x640, 1280x720, 1440x900.

---
# Panel polish pass (owner feedback 2026-10-20, with screenshots of every panel)
Problems seen: a help sentence under nearly every control makes panels very long; raw technical controls (Zoom triggers is a JSON list, Width and Height are sliders, background image is a bare path box, gradient angle appears twice, "Add colour stop" is a plain centred button); layout glitches (text scrolling under the sticky search box, a tooltip covering a row, the watermark switch overlapping its label); dead space at the bottom of panels; the Zoom rail icon looks like Search; everything is one flat list so nothing is easy to find. Goal: polished like Recordly, scannable, every state handled. (Overlays are removed from the product.)

## Rules (apply to every panel)
1. **Group into cards.** Each topic panel is a stack of rounded section cards (title in sentence case, 13 px semibold, a small icon, optional one-line description). No all-caps `▼ GENERAL` headings. Cards are collapsible only for 'Advanced' (collapsed by default, with a count badge like "Advanced · 4").
2. **No inline help sentences.** Help moves into a small (i) icon tooltip on the label (keyboard focusable, never covering the row it explains: placement top, collision-aware). Show at most ONE short line (<= 60 chars) under a card title when it adds meaning.
3. **Compact rows:** label left, control right on one line for switches, selects, segmented controls and number steppers; sliders are two-line (label + live value on one line, slider under it); 36 px row height, 12 px gap between rows, 16 px card padding, 12 px between cards. Value fields appear as small pills beside slider labels, not full-width boxes.
4. **Right control for the job:** colours = swatch buttons that open a popover (presets + hex); gradients = a row of visual gradient preset swatches + 'Custom' (two colour pickers + angle dial/slider, ONE angle control); images = a drop/choose button that uploads the file into the project and shows a thumbnail with Replace/Remove (never a path text box); lists/enums with 2 to 4 options = segmented control, 5+ = select; booleans = switch; durations/amounts = slider with unit; sizes = presets (Output size: 720p, 1080p, 1440p, 4K plus custom under Advanced) instead of Width/Height sliders; 'Zoom triggers' = two toggle chips 'Clicks' and 'Typing'.
5. **Curate:** each topic shows only the 5 to 7 settings people actually change (primary); everything else sits in 'Advanced'. Defaults and reset: a small reset icon appears on hover or focus only when the value differs from its default; a card-level 'Reset section' appears in the card menu.
6. **Search is global and helpful:** one search field in the panel header (Cmd/Ctrl+K focuses it from anywhere) searches ALL topics (labels, tooltips, keywords); results replace the panel body grouped by topic with the same row controls, each result with its topic badge and a 'Go to' action; matched text highlighted. Empty state: icon, "No settings match 'xyz'", a Clear search button, and 3 suggestion chips of popular settings. The search header is sticky, opaque, with a bottom hairline, and content must never show behind it (scroll area sits below it).
7. **Empty and edge states everywhere:** voice engine missing, no brand, no music, no captions, no zooms, no clips selected, loading and error states each get an illustrated-style empty state card (icon + title + one line + primary action), never raw empty space. Panels fill their height: when content is short the area below is a quiet footer hint, never a blank gap.
8. **Rail:** 56 px, icons with tooltips and a selected pill; Zoom uses the ZoomIn/Focus icon (not a magnifier-search); a thin divider before 'Export settings'; the rail never scrolls at 640 px height (use 44 px targets at 36 px icon).
9. **Panel header:** topic title (16 px semibold) + a one-line subtitle; actions (Reset section) in a kebab.
10. **Polish:** consistent 8 px spacing, 8 px radius cards, 1 px hairlines with `--line`, subtle surface elevation (card = panel +3% lightness), 150 ms transitions, focus-visible rings, reduced-motion respected, selected/hover states, no clipped text at 280 to 360 px widths, dark and light both reviewed.

## Narration pacing
Audio > Voice > Narrator includes **Trim waiting after narration**, enabled by default, and **Pause after each sentence** (0.4 s by default, adjustable from 0.1 to 2 s). Exports and the timeline's Result length shorten idle holds after narration while preserving actions, overlapping user edits, and the last step's final half-second. Recordings and saved edits stay unchanged; disable the switch to restore the original pacing.

Newly generated narration removes excess leading and trailing silence using 5 ms RMS windows at −50 dBFS, keeping up to 60 ms before speech and 180 ms after it, with short fades at cut points. Explicit pauses remain intact; your recordings and imported audio keep their original timing. Existing generated clips remain playable and show **Needs update** until regenerated with `voice generate`.
