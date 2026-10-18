// Every still the composer overlays, rendered as PNG by the skill's Chromium
// (ffmpeg here has no drawtext): caption pills, title and end cards, and the
// phone backdrop with its screen mask, and the cursor sprites and click ring
// drawn over clips that did not go through Recordly. One browser, one page, many shots.
import path from 'node:path';
import { chromium } from '@playwright/test';

export const W = 1920;
export const H = 1080;
// Captions keep 7% clear of the frame edge so a Recordly frame or zoom
// border never reaches them.
const EDGE = Math.round(H * 0.07);
// The region the caption-appearance check reads: in band mode the band
// itself, in overlay mode where the pills sit (bottom or top, centred; as
// wide as the narrower phone pill, two lines high), and null when nothing is
// burned. `layout` = {mode, band}; absent means overlay (runs made before bands).
export function captionBand(position, layout = OVERLAY) {
  if (layout.mode === 'off') return null;
  if (layout.mode === 'band') return { x: 0, y: H - layout.band, w: W, h: layout.band };
  return { x: (W - 1100) / 2, w: 1100, h: 100, y: position === 'top' ? EDGE : H - EDGE - 100 };
}
export const OVERLAY = Object.freeze({ mode: 'overlay', band: 0 });
// The band's colour: the dark end of the title card's gradient, so the band
// reads as part of the same design rather than a box laid over the video.
export const BAND_BG = '#0e131d';
// Transparent room around a pill for its shadow; the PNG includes it.
const PAD = 40;

// Phone screen placement inside the 1920x1080 phone segment.
const PHONE_H = 718;
const PHONE_TOP = 86;
const BEZEL = 14;
const SCREEN_RADIUS = 44;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// `centreIn` = the height from the top to centre the phone in: the area
// above the caption band, or the whole frame when nothing is burned. Without
// it the phone sits high, leaving room for the pills below it.
export function phoneScreen(phone, centreIn = null) {
  const h = PHONE_H;
  const w = Math.round((h * phone.width) / phone.height / 2) * 2;
  return { x: Math.round((W - w) / 4) * 2, y: centreIn ? Math.round((centreIn - h) / 4) * 2 : PHONE_TOP, w, h };
}

const base = (font) => `html,body{margin:0;width:${W}px;height:${H}px;background:transparent;overflow:hidden}
*{box-sizing:border-box}body{font-family:${font};-webkit-font-smoothing:antialiased}`;

const pillCss = (cap) => `
.wrap{position:absolute;left:50%;transform:translateX(-50%);padding:${PAD}px;${cap.position === 'top' ? `top:${EDGE - PAD}px` : `bottom:${EDGE - PAD}px`}}
.pill{display:flex;align-items:center;gap:.5em;background:${cap.background};color:${cap.color};
 font-weight:600;line-height:1.3;letter-spacing:-.005em;padding:.5em 1em;border-radius:.62em;
 box-shadow:0 10px 30px rgba(0,0,0,.28),0 1px 2px rgba(0,0,0,.2)}
.num{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:1.45em;height:1.45em;
 padding:0 .35em;border-radius:999px;background:rgba(255,255,255,.16);font-size:.7em;font-weight:700;font-variant-numeric:tabular-nums}
.txt{text-align:center;text-wrap:balance}`;

// Band captions: text only on a transparent strip the size of the band, laid
// over the solid band so each caption can fade on its own. Centred, at most
// two balanced lines, sized to fit.
const bandCss = (cap, band) => `
.band{position:absolute;left:0;top:0;width:${W}px;height:${band}px;display:flex;align-items:center;justify-content:center}
.txt{max-width:1560px;color:${cap.color};font-weight:550;line-height:1.28;letter-spacing:-.003em;text-align:center;text-wrap:balance}`;

const cardCss = `
.card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
 background:radial-gradient(120% 90% at 50% 38%,#253044 0%,#161d2b 55%,#0e131d 100%);color:#f8fafc;text-align:center;padding:0 200px}
.big{font-size:84px;font-weight:650;letter-spacing:-.02em;line-height:1.1;text-wrap:balance}
.rule{width:56px;height:3px;border-radius:2px;background:rgba(248,250,252,.28)}
.small{font-size:30px;font-weight:450;color:#aab4c4;letter-spacing:.01em}`;

// Cursor sprites as SVG in a 24-unit box; `hot` is the pointing spot.
const CURSOR_SCALE = 1.25;
const CURSOR_PAD = 6;
const SPRITES = {
  arrow: { hot: [1.5, 1.5], svg: '<path d="M1.5 1.5V22l5.1-4.8 3.2 7.6 3.2-1.4-3.1-7.4h6.9z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>' },
  pointer: { hot: [9, 1.5], svg: '<path d="M9 1.5c1.1 0 2 .9 2 2V12h.5v-1.5c0-1.1.9-2 2-2s2 .9 2 2V12h.5v-.5c0-1.1.9-2 2-2s2 .9 2 2V13c.2-1 1-1.6 1.9-1.6 1.1 0 2 .9 2 2V19c0 4.4-3.6 8-8 8h-1.5c-2.6 0-4.9-1.3-6.4-3.4L2.2 17.6c-.6-.9-.4-2.1.4-2.8.9-.7 2.1-.6 2.9.2L7 16.6V3.5c0-1.1.9-2 2-2z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/>' },
  text: { hot: [9, 12], svg: '<path d="M5 2.5h1.5c1.3 0 2.5.5 2.5 1.5 0-1 1.2-1.5 2.5-1.5H13M9 4v16M5 21.5h1.5c1.3 0 2.5-.5 2.5-1.5 0 1 1.2 1.5 2.5 1.5H13" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M5 2.5h1.5c1.3 0 2.5.5 2.5 1.5 0-1 1.2-1.5 2.5-1.5H13M9 4v16M5 21.5h1.5c1.3 0 2.5-.5 2.5-1.5 0 1 1.2 1.5 2.5 1.5H13" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round"/>' },
};
// Press ring: 15 frames (250 ms at 60 fps) growing from 9 to 28 px radius while fading out.
export const RING = { frames: 15, size: 72 };

async function renderCursors(page, dir) {
  const out = {};
  const box = 30;
  for (const [name, sp] of Object.entries(SPRITES)) {
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{position:absolute;left:${CURSOR_PAD}px;top:${CURSOR_PAD}px;
      overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))}</style>
      <svg width="${box * CURSOR_SCALE}" height="${box * CURSOR_SCALE}" viewBox="0 0 ${box} ${box}">${sp.svg}</svg>`);
    const file = path.join(dir, `cursor-${name}.png`);
    const side = Math.ceil(box * CURSOR_SCALE + 2 * CURSOR_PAD);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: side, height: side } });
    out[name] = { file, hx: Math.round(CURSOR_PAD + sp.hot[0] * CURSOR_SCALE), hy: Math.round(CURSOR_PAD + sp.hot[1] * CURSOR_SCALE) };
  }
  const c = RING.size / 2;
  for (let i = 0; i < RING.frames; i++) {
    const k = i / (RING.frames - 1);
    const e = 1 - (1 - k) ** 3;
    const r = 9 + 19 * e;
    const a = 0.55 * (1 - k);
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style>
      <svg width="${RING.size}" height="${RING.size}"><circle cx="${c}" cy="${c}" r="${r}" fill="rgba(255,255,255,${(a * 0.35).toFixed(3)})"
       stroke="rgba(17,24,39,${a.toFixed(3)})" stroke-width="3"/></svg>`);
    await page.screenshot({ path: path.join(dir, `ring-${String(i).padStart(2, '0')}.png`), omitBackground: true, clip: { x: 0, y: 0, width: RING.size, height: RING.size } });
  }
  out.ring = { pattern: path.join(dir, 'ring-%02d.png'), center: c };
  return out;
}

// Renders all PNGs into `dir`. Returns file paths and caption placements
// ({file, x, y} per caption, same order as the input).
// `layout` ({mode, band}, from the recording) picks the caption style: band
// text, overlay pills, or none for 'off'; absent means overlay.
export async function renderCards({ dir, config, laptopCaptions, phoneCaptions = null, phone = null, title, subtitle, endText, layout = OVERLAY }) {
  const cap = config.caption;
  const band = layout.mode === 'band' ? layout.band : 0;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const out = { laptopCaps: [], phoneCaps: [], layout: { mode: layout.mode, band }, captionPosition: cap.position };

    const pill = async (text, n, maxWidth, file) => {
      await page.setContent(`<style>${base(cap.font)}${pillCss(cap)}</style>
        <div class="wrap"><div class="pill" style="max-width:${maxWidth}px">${n ? `<span class="num">${n}</span>` : ''}<span class="txt">${esc(text)}</span></div></div>`);
      // Largest size (34 px down to 22 px) at which the text fits in two lines.
      const box = await page.evaluate(() => {
        const pillEl = document.querySelector('.pill');
        const txt = document.querySelector('.txt');
        for (let fs = 34; fs >= 22; fs -= 1) {
          pillEl.style.fontSize = `${fs}px`;
          if (txt.getBoundingClientRect().height <= fs * 1.3 * 2 + 1) break;
        }
        const r = document.querySelector('.wrap').getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
      });
      await page.screenshot({ path: file, omitBackground: true, clip: box });
      return { file, x: box.x, y: box.y };
    };

    const bandText = async (text, file) => {
      await page.setContent(`<style>${base(cap.font)}${bandCss(cap, band)}</style><div class="band"><div class="txt">${esc(text)}</div></div>`);
      // 36 px on one line; two lines step down to at most 32 px (and as far
      // as 22 px) so they keep air above and below inside the band.
      await page.evaluate(() => {
        const txt = document.querySelector('.txt');
        for (let fs = 36; fs >= 22; fs -= 1) {
          txt.style.fontSize = `${fs}px`;
          const lines = Math.round(txt.getBoundingClientRect().height / (fs * 1.28));
          if (lines <= 1 || (lines === 2 && fs <= 32)) break;
        }
      });
      await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: W, height: band } });
      return { file, x: 0, y: H - band };
    };
    const caption = (text, n, maxWidth, file) => (layout.mode === 'off' ? null
      : band ? bandText(text, file) : pill(text, n, maxWidth, file));

    for (const [i, c] of laptopCaptions.entries()) {
      out.laptopCaps.push(await caption(c.text, i + 1, 1400, path.join(dir, `cap-laptop-${i}.png`)));
    }

    const card = async (big, small, file) => {
      await page.setContent(`<style>${base(cap.font)}${cardCss}</style>
        <div class="card"><div class="big">${esc(big)}</div>${small ? `<div class="rule"></div><div class="small">${esc(small)}</div>` : ''}</div>`);
      await page.screenshot({ path: file });
      return file;
    };
    out.cursor = await renderCursors(page, dir);
    out.title = await card(title, subtitle, path.join(dir, 'title.png'));
    out.end = await card(endText, title, path.join(dir, 'end.png'));

    if (phone && phoneCaptions) {
      const n0 = laptopCaptions.length;
      for (const [i, c] of phoneCaptions.entries()) {
        out.phoneCaps.push(await caption(c.text, n0 + i + 1, 1100, path.join(dir, `cap-phone-${i}.png`)));
      }
      const s = phoneScreen(phone, band ? H - band : layout.mode === 'off' ? H : null);
      const r = SCREEN_RADIUS;
      await page.setContent(`<style>${base(cap.font)}
        body{background:linear-gradient(160deg,#eef1f5 0%,#d9dee6 55%,#c3cad5 100%)}
        .cband{position:absolute;left:0;right:0;bottom:0;height:${band}px;background:${BAND_BG};box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
        .body{position:absolute;left:${s.x - BEZEL}px;top:${s.y - BEZEL}px;width:${s.w + 2 * BEZEL}px;height:${s.h + 2 * BEZEL}px;
         border-radius:${r + BEZEL}px;background:#0b0f19;box-shadow:0 0 0 1px rgba(255,255,255,.10) inset,0 40px 90px rgba(15,23,42,.35),0 8px 24px rgba(15,23,42,.25)}</style>
        <div class="body"></div>${band ? '<div class="cband"></div>' : ''}`);
      await page.screenshot({ path: (out.phoneBg = path.join(dir, 'phone-bg.png')) });
      // White rounded screen on black, the size of the phone video: its
      // alpha mask, so the video gets the screen's rounded corners.
      await page.setContent(`<style>${base(cap.font)}body{background:#000}
        .screen{position:absolute;left:0;top:0;width:${s.w}px;height:${s.h}px;border-radius:${r}px;background:#fff}</style><div class="screen"></div>`);
      await page.screenshot({ path: (out.phoneMask = path.join(dir, 'phone-mask.png')), clip: { x: 0, y: 0, width: s.w, height: s.h } });
      out.phoneScreen = s;
    }
    return out;
  } finally {
    await browser.close();
  }
}
